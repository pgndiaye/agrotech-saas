# 🌱 AgroTech SN — SaaS de Gestion Agricole au Sénégal

Plateforme SaaS multi-tenant pour la gestion agricole adaptée au contexte sénégalais.

## 🚀 Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | NestJS 10 + Prisma ORM |
| Base de données | PostgreSQL 16 |
| Auth | JWT (tokens Bearer) |
| Charts | Recharts |
| Météo | OpenWeatherMap API |
| Déploiement | Docker + Docker Compose |

## 📦 Fonctionnalités MVP

- **Auth** — Inscription / connexion avec espace multi-tenant (coopérative)
- **Dashboard** — Météo en temps réel + alertes agronomiques + KPIs financiers
- **Stocks** — Gestion semences, engrais, récoltes avec mouvements entrée/sortie
- **Finance** — Suivi revenus/dépenses avec graphiques mensuels
- **Marketplace** — Annonces de vente inter-coopératives

## 🗂️ Structure du projet

```
agrotech-saas/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/           # Module authentification JWT
│   │   │   ├── users/          # Module utilisateurs
│   │   │   ├── tenants/        # Module coopératives (multi-tenant)
│   │   │   ├── stocks/         # Module stocks + mouvements
│   │   │   ├── weather/        # Module météo (OpenWeatherMap)
│   │   │   ├── finance/        # Module finance (revenus/dépenses)
│   │   │   └── marketplace/    # Module marketplace
│   │   └── prisma/
│   │       ├── schema.prisma   # Schéma de la BDD
│   │       └── seed.ts         # Données de démo
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # Pages login/register
│           │   └── (dashboard)/ # Pages protégées
│           ├── context/        # Contexte auth React
│           └── lib/            # Client API axios
├── docker-compose.yml
└── .env.example
```

## ⚡ Démarrage Développement

### Prérequis
- Node.js 22+
- Docker Desktop (pour PostgreSQL)
- Clé API OpenWeatherMap (optionnel)

### 1. Base de données (Docker)
```bash
docker run -d \
  --name agrotech_db \
  -e POSTGRES_USER=agrotech \
  -e POSTGRES_PASSWORD=agrotech_pass \
  -e POSTGRES_DB=agrotech_db \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend API
```bash
cd apps/api

# Migrations BDD
npx prisma migrate dev --name init

# Données de démo
npx ts-node prisma/seed.ts

# Démarrer en dev
npm run dev
# → http://localhost:3001
# → http://localhost:3001/api/docs (Swagger)
```

### 3. Frontend
```bash
cd apps/web
npm run dev
# → http://localhost:3000
```

### Compte de démo
- **Email** : `admin@demo-coop.sn`
- **Mot de passe** : `Admin1234!`

## 🐳 Déploiement Docker Compose

```bash
# Copier et configurer les variables
cp .env.example .env

# Lancer tous les services
docker-compose up -d --build

# Appliquer les migrations
docker-compose exec api npx prisma migrate deploy

# Seed de données (optionnel)
docker-compose exec api node dist/main.js
```

## 🌐 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Secret JWT (changer en prod !) |
| `OPENWEATHERMAP_API_KEY` | Clé API météo |
| `NEXT_PUBLIC_API_URL` | URL de l'API backend |
| `AT_API_KEY` | Clé API AfricasTalking (SMS) — optionnel, simulation si absent |
| `AT_USERNAME` | Nom d'utilisateur AfricasTalking (défaut: `sandbox`) |

## 📈 Roadmap

- [x] Phase 1 : MVP — Météo, Stocks, Finance, Marketplace
- [x] Phase 2 : Intégration paiements Wave / Orange Money
- [x] Phase 3 : Application mobile (React Native / Expo)
- [x] Phase 4 : IA — Recommandations agricoles
- [x] Phase 5 : API SMS pour alertes (sans internet) — AfricasTalking
## 📱 Alertes SMS (Phase 5)

### Fonctionnement
Les alertes SMS permettent aux coopératives Premium d'être notifiées sur leur téléphone même sans connexion internet (réseau GSM uniquement).

| Déclencheur | Condition | Message |
|-------------|-----------|---------|
| Stock critique | Quantité ≤ 50 % du minimum | 🚨 Alerte immédiate |
| Stock bas | Quantité ≤ minimum | ⚠️ Alerte de précaution |
| Météo | Humidité < 35 % ou Température ≥ 38 °C | 🌵 / 🌡️ Alerte climatique |
| Finance | Solde total négatif | 💰 Alerte financière |
| Digest hebdo | Chaque lundi à 7h | 📊 Résumé de la semaine |

### Configuration
1. Souscrire au plan **Premium**
2. Ouvrir **Alertes SMS** (web ou mobile)
3. Renseigner le numéro au format international (`+221…`)
4. Choisir la ville pour la météo agricole
5. Activer les types d'alertes souhaités

### Fournisseur SMS : AfricasTalking
```env
AT_API_KEY=your_africastalking_api_key
AT_USERNAME=your_username   # "sandbox" pour les tests
```
> Sans clé API, le mode **simulation** est automatiquement activé — les SMS sont journalisés sans être envoyés réellement.

### Endpoints API
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/v1/sms/config` | Lire la configuration |
| PUT | `/api/v1/sms/config` | Enregistrer la configuration |
| POST | `/api/v1/sms/test` | Envoyer un SMS de test |
| POST | `/api/v1/sms/trigger` | Déclencher les alertes manuellement |
| GET | `/api/v1/sms/logs` | Journal des 50 derniers SMS |

---
## � Application Mobile (Phase 3)

### Stack
| Couche | Technologie |
|--------|-------------|
| Framework | Expo ~54 (Managed Workflow) |
| Navigation | Expo Router ~3.5 (file-based) |
| Style | NativeWind v4 + Tailwind CSS |
| Client API | Axios (même endpoints que le web) |
| Persistance | AsyncStorage (remplace localStorage) |
| Graphiques | react-native-chart-kit |

### Écrans
- **Auth** — Connexion / Inscription
- **Dashboard** — Météo + KPIs (solde, stocks)
- **Stocks** — Liste, détail, création, mouvements IN/OUT
- **Finance** — Résumé, graphique mensuel, transactions
- **Marketplace** — Annonces (toutes / mes annonces), création
- **Abonnement** — Plan Free/Premium, paiement Wave/Orange Money

### Démarrage
```bash
cd apps/mobile

# Copier les variables d'environnement
cp .env.example .env
# Éditer EXPO_PUBLIC_API_URL selon votre environnement :
# - Simulateur iOS  : http://localhost:3001/api/v1
# - Émulateur Android : http://10.0.2.2:3001/api/v1
# - Device physique : http://<IP_LOCALE>:3001/api/v1

# Installer les dépendances
npm install

# Lancer Expo
npm start
# Scan QR code avec Expo Go (iOS/Android)
# ou npm run ios / npm run android pour simulateur
```

### Depuis la racine du monorepo
```bash
npm run dev:mobile      # Lance expo start
npm run mobile:ios      # Lance sur simulateur iOS
npm run mobile:android  # Lance sur émulateur Android
```
## 🤖 IA — Recommandations Agricoles (Phase 4)

Le moteur d'analyse IA génère des recommandations personnalisées en temps réel en croisant :

| Source | Recommandations générées |
|--------|--------------------------|
| **Stocks** | Alertes de rupture critique, réapprovisionnement semences/engrais |
| **Finance** | Solde négatif, marge faible, postes de dépenses dominants |
| **Météo** | Sécheresse/irrigation urgente, canicule, vents forts |
| **Calendrier cultural** | Conseils saisonniers (Hivernage, Contra-saison, Saison sèche) |
| **OpenAI (optionnel)** | Conseil IA génératif si `OPENAI_API_KEY` est définie |

### Endpoint
```
GET /api/v1/ai/recommendations?city=Dakar
```
Retourne un objet `{ recommendations, summary, generatedAt }` avec chaque recommandation ayant :
- `type` : STOCK | FINANCE | WEATHER | PLANTING | GENERAL
- `priority` : HIGH | MEDIUM | LOW
- `title`, `description`, `actions[]`

### Activation OpenAI (optionnel)
Ajouter dans le `.env` de l'API :
```env
OPENAI_API_KEY=sk-...
```
Sans clé, le moteur heuristique seul est utilisé (aucune dépendance externe requise).
## �💰 Modèle Économique

- **Freemium** — Accès gratuit aux fonctionnalités de base
- **Premium** 2 000 – 5 000 FCFA/mois — Marketplace, finance avancée, multi-utilisateurs
- **Partenariats** — Coopératives, ONG, Ministère de l'Agriculture
