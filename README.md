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

## 📈 Roadmap

- [x] Phase 1 : MVP — Météo, Stocks, Finance, Marketplace
- [ ] Phase 2 : Intégration paiements Wave / Orange Money
- [ ] Phase 3 : Application mobile (React Native)
- [ ] Phase 4 : IA — Recommandations agricoles
- [ ] Phase 5 : API SMS pour alertes (sans internet)

## 💰 Modèle Économique

- **Freemium** — Accès gratuit aux fonctionnalités de base
- **Premium** 2 000 – 5 000 FCFA/mois — Marketplace, finance avancée, multi-utilisateurs
- **Partenariats** — Coopératives, ONG, Ministère de l'Agriculture
