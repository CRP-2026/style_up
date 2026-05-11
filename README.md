# Style_Up — Native E-Commerce Platform

A modern, full-stack e-commerce application built with **React Native (Expo)** + **FastAPI + PostgreSQL**.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Python 3.10+

### 1-Minute Setup

```bash
# Start backend (in native-e-commerce-be/)
docker-compose up -d

# Start frontend (in native-e-commerce/)
npm install
npm start
```

Then:

- Press `w` for web, `a` for Android, `i` for iOS

**Demo login:**

- Email: `demo.jewelry@gmail.com`
- Password: `demo123456`

---

## 🐛 "Unable to Reach API Server" Error

**Quick fix:**

# Style_Up

Style_Up is a full-stack e-commerce project with an Expo React Native frontend, a FastAPI backend, and PostgreSQL data scripts.

## Structure

- `native-e-commerce/`: Expo app, screens, reusable components, feature logic
- `native-e-commerce-be/`: FastAPI API, Docker Compose, backend docs
- `database/`: SQL init scripts, seed data, and migrations
- `scripts/`: environment and smoke-test helpers

## Config

Frontend `.env` in `native-e-commerce/`:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_STORE_ID=1
```

Backend `.env` in `native-e-commerce-be/` should include Postgres settings, `DATABASE_URL`, and auth secrets. See `native-e-commerce-be/README.md` for the full list.

## Run

```bash
cd native-e-commerce-be
docker compose up -d --build

cd ../native-e-commerce
npm install
npm start
```

- Web: `w`
- Android: `a`
- iOS: `i`

## Tech

- Expo SDK 54, Expo Router, TypeScript, NativeWind, Zustand
- FastAPI, SQLAlchemy, PostgreSQL 15
- Docker and Docker Compose

````

## Tech Stack

- Expo SDK 54
- Expo Router v6
- React Native 0.81 and React 19
- TypeScript
- NativeWind
- Zustand
- FastAPI
- SQLAlchemy
- PostgreSQL 15
- Docker and Docker Compose

## Project Structure

```text
Style_Up/
├── README.md
├── database/
│   ├── init_database.sql
│   ├── seed_dev.sql
│   └── migrations/
├── native-e-commerce/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── scripts/
│   ├── app.json
│   └── package.json
├── native-e-commerce-be/
│   ├── app/
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── README.md
└── scripts/
   └── check_dev_env.py
````

## Configuration

### Frontend

Create `native-e-commerce/.env` with at least:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
EXPO_PUBLIC_STORE_ID=1
```

Optional dev-only value:

```env
EXPO_PUBLIC_DEV_API_PORT=8000
```

Notes:

- Android emulator usually uses `http://10.0.2.2:8000/api/v1`
- iOS simulator on macOS usually uses `http://localhost:8000/api/v1`
- Physical devices need your machine's LAN IP

### Backend

Create `native-e-commerce-be/.env` with the values required by the backend. At minimum, keep these aligned with your local environment:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ecommerce
DATABASE_URL=postgresql://postgres:postgres@db:5432/ecommerce
SECRET_KEY=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

If you use payment or other optional integrations, review `native-e-commerce-be/README.md` and `scripts/check_dev_env.py` for the full list of expected variables.

## Run the Project

### 1. Start the backend

From the backend folder:

```bash
cd native-e-commerce-be
docker compose up -d --build
```

If you prefer to run from the repository root, use:

```bash
docker compose -f native-e-commerce-be/docker-compose.yml up -d --build
```

This starts:

- API at `http://localhost:8000`
- PostgreSQL at `localhost:5432`

### 2. Start the frontend

```bash
cd native-e-commerce
npm install
npm start
```

Then press:

- `w` for web
- `a` for Android
- `i` for iOS

## Test and Validation

### Environment checks

```bash
python scripts/check_dev_env.py
```

### Frontend checks

```bash
cd native-e-commerce
npm run lint
npm run format
npm run smoke:api
```

### Backend checks

```bash
curl http://localhost:8000/api/v1/health
```

You can also open the backend docs at `http://localhost:8000/docs` after the API is running.

## Main Features

- Product catalog and product detail pages
- Authentication with token storage
- Address management
- Cart and checkout flow
- Order history and order detail
- Admin and account screens

---

## 📋 Tech Stack

### Frontend

- **Expo SDK 54** — Cross-platform mobile framework
- **Expo Router** — File-based routing
- **React Native** — Native mobile UI
- **NativeWind** — Tailwind CSS for React Native
- **Zustand** — State management (in progress)
- **TypeScript** — Type safety

### Backend

- **FastAPI** — Modern Python web framework
- **PostgreSQL 15** — Database
- **SQLAlchemy** — ORM
- **Pydantic** — Data validation
- **JWT** — Token authentication
- **Docker** — Containerization

### Database connection error

1. Check PostgreSQL is running: `docker-compose ps`
2. Reset: `docker-compose down -v && docker-compose up -d`

--
