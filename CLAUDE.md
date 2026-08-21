# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexte

SaaS multi-tenant de gestion agricole pour le Sénégal. Trois applications dans `apps/` :
`api` (NestJS 10 + Prisma 7), `web` (Next.js 14 App Router), `mobile` (Expo 54 + Expo Router).

Le code, les commentaires et les messages de commit sont en français — conserver cette langue.

## Commandes

Le dépôt est un monorepo **sans npm workspaces** : les scripts racine délèguent via `--prefix`, et
chaque application possède son propre `node_modules` et son propre lockfile. Après un clone, il faut
installer séparément dans `apps/api`, `apps/web` et `apps/mobile`.

```bash
npm run dev            # API + web en parallèle (concurrently)
npm run dev:api        # nest start --watch      → :3001, Swagger sur /api/docs
npm run dev:web        # next dev               → :3000
npm run dev:mobile     # expo start

npm run db:migrate     # prisma migrate dev
npm run db:seed        # ts-node prisma/seed.ts
npm run db:studio      # prisma studio
```

Depuis `apps/api`, après toute modification de `prisma/schema.prisma` : `npm run prisma:generate`.

Stack complète en conteneurs :

```bash
docker compose up -d --build
```

`entrypoint.sh` applique `prisma migrate deploy` au démarrage du conteneur api — les migrations ne
sont donc pas à lancer à la main en Docker.

### Tests et lint

**Il n'existe aucun test ni configuration de lint dans ce dépôt** : pas de jest, pas d'eslint, aucun
fichier `*.spec.ts`. `apps/api` n'a pas de script `test`, et le `next lint` de `apps/web` n'a pas de
configuration eslint associée. Ne pas prétendre lancer une suite de tests ; la vérification se fait
en exécutant l'application. Le seul outil de qualité câblé est `npm run format` (prettier) dans
`apps/api`.

## Architecture

### Isolation multi-tenant — l'invariant central

Toutes les données métier sont rattachées à un `Tenant` (coopérative). L'isolation est **appliquée
manuellement dans chaque service**, sans middleware Prisma ni RLS. Le schéma est constant :

1. `JwtStrategy.validate()` recharge l'utilisateur depuis la base et le retourne, si bien que
   `req.user` est l'enregistrement `User` complet, `tenantId` inclus.
2. Le contrôleur extrait `req.user.tenantId` et le passe **explicitement** au service.
3. Le service filtre systématiquement sur `where: { tenantId }`.
4. Avant tout `update`/`delete` par id seul, le service appelle d'abord son propre
   `findOne(id, tenantId)` — c'est ce contrôle qui empêche l'accès croisé entre tenants.

`stocks.service.ts` est la référence de ce pattern. Omettre l'étape 4 ouvre une faille d'isolation :
toute nouvelle ressource par tenant doit la reproduire.

`RolesGuard` + `@Roles(...)` se superposent à cela pour les routes d'administration (rôle
`SUPER_ADMIN`), et sont indépendants du filtrage par tenant.

### Contrôle du plan — `PlanGuard`, jamais en dur dans un service

Le verrouillage des fonctionnalités payantes passe **exclusivement** par
`@RequirePlan(Plan.PREMIUM)` / `@RequireFeature('exportCsv')` + `PlanGuard`, et les limites de
volume par `@RequireQuota('stocks')` + `QuotaGuard`, sur le contrôleur. Les guards lisent
`req.user.tenant.plan`, que `JwtStrategy` recharge à chaque requête : la valeur est toujours fraîche.
Ne pas réintroduire de test `tenant.plan !== 'PREMIUM'` dans un service.

Prix, quotas et features viennent de la table **`PlanConfig`**, lue par `PlanCatalogService` avec un
cache mémoire (TTL 60 s). `PlanConfig` **cohabite** avec l'enum `Plan` : celui-ci reste le
discriminant typé de `Tenant.plan` et `Subscription.plan`, `PlanConfig.code` est un `Plan @unique`
— une ligne par membre, garantie par le seed. Toute écriture sur `PlanConfig` doit appeler
`planCatalog.invalider()`, sinon l'ancien prix reste facturé jusqu'au TTL. `getPlan()` est
*fail-closed* : un plan absent lève plutôt que de laisser passer le guard.

Exception : le planificateur SMS s'exécute hors contexte HTTP, donc aucun guard ne s'y applique — le
filtre y est dans le `where` Prisma (`tenant: { plan: 'PREMIUM', status: 'ACTIVE' }`).

### Suspension et révocation — tout se joue dans `JwtStrategy.validate()`

`Tenant.status` et `User.status` (`ACTIVE` / `SUSPENDED` / `DELETED`) et `User.tokensRevokedAt` sont
contrôlés **uniquement** dans `jwt.strategy.ts`, seul point traversé par 100 % des requêtes
authentifiées. Une suspension ou un changement de rôle est donc effectif à la requête suivante, sans
attendre l'expiration du JWT (7 jours). `validate()` utilise un `select` explicite : ajouter un champ
consommé via `req.user` impose de l'ajouter à ce `select`, sinon il vaudra `undefined`.

### Journal d'audit — décorateur explicite, jamais automatique

`@Audit({ action, entity })` sur un handler d'`AdminController` déclenche `AuditInterceptor`.
**Sans ce décorateur, rien n'est journalisé** : c'est ainsi que les lectures sont exclues, sans test
sur le verbe HTTP. Les actions système (webhooks, tâches planifiées) appellent `AuditService.log()`
avec `actorRole: 'SYSTEM'`.

### Prix des paiements — résolu côté serveur

`InitiatePaymentDto` accepte `planCode`, jamais `amount` : le montant vient de `PlanCatalogService`.
Les webhooks sont signés (`WaveSignatureGuard` — HMAC sur le corps brut, d'où `rawBody: true` dans
`main.ts` ; `OrangeWebhookGuard` — secret dans l'URL + revérification auprès de l'API Orange), et
l'activation d'abonnement est idempotente via une revendication atomique du statut du paiement.

L'échéance d'un renouvellement **cumule** au temps restant (`departProlongation`) : repartir de
`now` ferait perdre les jours déjà payés. Chaque activation, expiration ou geste commercial écrit un
`SubscriptionEvent` — `Subscription` ne conserve que l'état courant, et sans cet historique le churn
et le taux de conversion sont incalculables.

`SubscriptionLifecycleService` porte le cron d'expiration (2 h, verrouillé comme toute tâche
planifiée) : sans lui, `SubscriptionStatus.EXPIRED` n'était jamais écrit et un tenant gardait
PREMIUM sans payer.

Les KPI de `KpiService` excluent le tenant technique `agrotech-system` : il est marqué PREMIUM par
le seed sans être un client, et fausserait conversion et répartition.

### Prisma 7 avec driver adapter

Le bloc `datasource` de `schema.prisma` **ne contient pas d'`url`** — c'est volontaire. L'URL arrive
par deux chemins distincts :

- **au runtime** : `PrismaService` instancie `new PrismaPg(process.env.DATABASE_URL)` et passe
  l'adapter au `PrismaClient` ;
- **pour la CLI Prisma** (migrate, studio, generate) : via `prisma.config.js` / `prisma.config.ts`,
  qui chargent `.env` eux-mêmes.

Modifier la façon dont l'URL est fournie impose donc de traiter les deux chemins.

### Authentification côté web — double stockage du token

Le token JWT est écrit **à la fois** en `localStorage` et en cookie, parce que deux consommateurs
distincts le lisent :

- l'intercepteur axios de `lib/api.ts` lit `localStorage` (`agrotech_token`) ;
- `middleware.ts` s'exécute en Edge Runtime, qui n'a pas accès à `localStorage`, et lit donc le
  cookie du même nom.

`AuthContext.saveSession()` écrit les deux, et `logout()` doit effacer les deux — tout comme
l'intercepteur de réponse de `lib/api.ts` sur 401 et sur les 403 de suspension. Toucher au stockage
de session sans maintenir cette symétrie désynchronise le middleware de l'état applicatif.

`middleware.ts` **vérifie la signature** du JWT avec `jose` et contrôle `role === 'SUPER_ADMIN'` sur
`/admin`. Cela impose `JWT_SECRET` côté web (variable serveur — **jamais** préfixée `NEXT_PUBLIC_`),
identique à celle de l'API. Sans elle, le middleware se replie sur un décodage non vérifié plutôt que
de bloquer `/admin` ; le `RolesGuard` de l'API reste de toute façon l'autorité.

Attention au `matcher` : le groupe de routes `(dashboard)` **n'apparaît pas dans les URL**. Les pages
sont servies sur `/stocks`, `/finance`, `/payments`… et non `/dashboard/stocks`. Chaque route
protégée doit donc être listée explicitement.

Le mobile n'a pas ce problème : il utilise `AsyncStorage` seul.

### Composants partagés côté web — `apps/web/src/components/`

Un seul jeu de composants sert l'application (ton `clair`) et la console d'administration (ton
`sombre`), via une prop `ton`. Ne pas réintroduire de variante locale à une page :

- `components/ui/` — `Bouton`, `Champ`, `Selecteur`, `Carte`, `Badge`, `Spinner`, `EtatVide`,
  `Modal`, `ConfirmDialog`, `DataTable`, `Pagination`, `StatCard` ;
- `components/admin/` — badges métier (`PlanBadge`, `RoleBadge`, `StatutCompteBadge`…),
  `AdminPageHeader`, `CelluleIdentite` ;
- `lib/badges.ts` (tables de styles) et `lib/format.ts` (`formatXof`, `formatDate`, `formatRelatif`).

`ConfirmDialog` + `useToast()` remplacent `window.confirm()` et `alert()` — il ne doit plus en rester.

`usePaginatedResource(charger, { limit })` encapsule le contrat `{ data, total, page, limit }` de
toutes les listes admin. **Le `charger` passé doit être mémoïsé par `useCallback` en y déclarant les
filtres dont il dépend** : c'est le changement d'identité de cette fonction qui déclenche le
rechargement. Une lambda recréée à chaque rendu provoquerait une boucle de requêtes.

### Clients API centralisés

`apps/web/src/lib/api.ts` et `apps/mobile/lib/api.ts` déclarent chacun l'intégralité des endpoints
sous forme d'objets par domaine (`stocksApi`, `financeApi`, `adminApi`…). Les composants n'appellent
jamais axios directement. Un nouvel endpoint backend s'ajoute d'abord ici.

Le client mobile résout son URL de base selon la plateforme (`10.0.2.2` sur émulateur Android),
surchargeable par `EXPO_PUBLIC_API_URL`.

### Modes dégradés des services externes

Trois intégrations fonctionnent sans credentials, ce qui permet de développer hors ligne. Préserver
ce comportement en les modifiant :

| Service | Sans clé |
|---|---|
| SMS (AfricasTalking) | SMS journalisés en base avec `status: SIMULATED`, aucun envoi réel |
| Paiements (Wave / Orange Money) | `PAYMENT_SIMULATION_MODE=true` expose une URL de confirmation locale |
| IA (`/ai/recommendations`) | moteur heuristique seul ; `OPENAI_API_KEY` n'ajoute qu'un conseil génératif par-dessus |

### Tâches planifiées — `@Cron` + verrou PostgreSQL, jamais de `setInterval`

`SmsSchedulerService` utilise `@Cron` (`@nestjs/schedule`, `timeZone: 'Africa/Dakar'`) et enveloppe
**systématiquement** son travail dans `TaskLockService.runExclusive(nomTache, cleOccurrence, fn)`.

`runExclusive` combine deux garanties dans une transaction **courte** :

- `pg_try_advisory_xact_lock` sérialise les instances concurrentes. La variante `xact` est libérée à
  la fin de la transaction — ne pas la remplacer par `pg_advisory_lock` en session, qui fuirait sur
  une connexion rendue au pool ;
- la contrainte `@@unique([taskName, runKey])` de `TaskRun` assure une déduplication **persistante**,
  qui survit au redémarrage.

Le travail long s'exécute **hors** transaction, après la revendication. Toute nouvelle tâche
planifiée doit reprendre ce schéma, sinon plusieurs instances de l'API enverront des doublons.
`GET /admin/tasks` expose l'historique des exécutions.

## Pièges connus

- **Sortie de build en `dist/src/`.** `prisma.config.ts` se trouve à la racine de `apps/api`, hors de
  `src/`, ce qui déplace le `rootDir` de TypeScript et produit `dist/src/main.js`. `entrypoint.sh` et
  le script `start:prod` pointent tous deux sur `node dist/src/main` — ne pas « corriger » l'un des
  deux vers `dist/main`.
- **`prisma migrate dev` échoue en environnement non interactif.** Passer par
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o
  prisma/migrations/<horodatage>_<nom>/migration.sql` puis `prisma migrate deploy`.
- **`apps/mobile` est listé dans `.gitignore`.** Les 40 fichiers déjà suivis le restent, mais tout
  **nouveau** fichier mobile est ignoré silencieusement par `git add`. Utiliser `git add -f`, ou
  corriger le `.gitignore`.
- **`.env.example` contient des identifiants réels versionnés** (clé AfricasTalking, secret JWT, clé
  OpenWeatherMap) — ce n'est pas un gabarit de valeurs factices.
- Le `.dockerignore` de chaque app est indispensable : sans lui, `COPY . .` écrase les `node_modules`
  du conteneur par ceux de l'hôte (moteurs Prisma compilés pour la mauvaise plateforme).
