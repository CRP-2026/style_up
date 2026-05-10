# Style_Up — Native E-Commerce Platform

A modern, full-stack e-commerce application built with **React Native (Expo)** + **FastAPI + PostgreSQL**.

---

## 🚀 Quick Start

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

## 📚 Documentation

### Setup & Configuration

- **[SETUP.md](./SETUP.md)** — Complete setup guide for all environments
- **[ENV.MD](./native-e-commerce/ENV.MD)** — Environment variables reference
- **[API_TROUBLESHOOTING.md](./API_TROUBLESHOOTING.md)** — Diagnose API issues

### Backend

- **[native-e-commerce-be/README.md](./native-e-commerce-be/README.md)** — API documentation
- **[native-e-commerce/BE-INSTRUCTION.MD](./native-e-commerce/BE-INSTRUCTION.MD)** — API contract

### Frontend

- **[native-e-commerce/README.md](./native-e-commerce/README.md)** — App structure & development

---

## 🐛 "Unable to Reach API Server" Error?

**Quick fix:**

1. **Backend running?**

   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Correct frontend URL?**

   ```bash
   grep EXPO_PUBLIC_API_URL native-e-commerce/.env
   # Should show: http://localhost:8000/api/v1
   ```

3. **Need help?** → See [API_TROUBLESHOOTING.md](./API_TROUBLESHOOTING.md)

---

## 🏗️ Project Structure

```
style_up/
├── native-e-commerce/          # React Native Expo app
│   ├── .env                     # Frontend config (required)
│   ├── app/                     # Expo Router screens
│   ├── components/              # Reusable UI components
│   ├── features/                # Feature modules
│   └── lib/                     # API client, utils, types
│
├── native-e-commerce-be/        # FastAPI backend
│   ├── .env                     # Backend config (required)
│   ├── docker-compose.yml       # DB + API services
│   └── app/                     # FastAPI app & models
│
├── database/                    # PostgreSQL schemas & migrations
│   ├── init_database.sql
│   ├── seed_dev.sql
│   └── migrations/
│
└── scripts/                     # Utility scripts
    ├── check_dev_env.py         # Validate environment
    ├── setup_check.py           # Setup verification
    └── smoke-api-check.mjs      # API smoke test
```

---

## 🔧 Development Workflow

### Backend Development

```bash
cd native-e-commerce-be

# Start with Docker
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down

# Reset database
docker-compose down -v && docker-compose up -d
```

### Frontend Development

```bash
cd native-e-commerce

# Start dev server
npm start

# Run linter
npm run lint

# Format code
npm run format

# Test API (no app)
npm run smoke:api

# Build for production
eas build --platform android
eas build --platform ios
```

---

## 📱 Device-Specific Setup

| Device               | API URL                          | Notes                       |
| -------------------- | -------------------------------- | --------------------------- |
| **Web**              | `http://localhost:8000/api/v1`   | Same machine                |
| **iOS Simulator**    | `http://localhost:8000/api/v1`   | Same network                |
| **Android Emulator** | `http://localhost:8000/api/v1`   | Auto-converts to `10.0.2.2` |
| **Physical Device**  | `http://192.168.x.x:8000/api/v1` | Use your PC's local IP      |

See [SETUP.md](./SETUP.md) for detailed instructions per device.

---

## 🧪 Testing

### Validate Setup

```bash
# Check environment configuration
python scripts/check_dev_env.py

# Verify setup (interactive)
python scripts/setup_check.py
```

### Test API (No App Required)

```bash
cd native-e-commerce
npm run smoke:api
```

Expected output:

```
✓ API endpoint is accessible
✓ Login successful
✓ GET /users/me successful
✓ GET /addresses successful
✓ Logout successful
```

### Full App Smoke Test (Manual)

1. **Login** → demo.jewelry@gmail.com / demo123456
2. **Browse** → View products & categories
3. **Cart** → Add items, adjust quantities
4. **Checkout** → Select address, choose payment
5. **Order** → View order history
6. **Account** → Edit profile, view addresses
7. **Logout** → Verify token revocation

---

## 🌍 API Endpoints

### Base URL

```
/api/v1
```

### Main Routes

**Catalog**

- `GET /categories`
- `GET /products?category_id=&search=&limit=10&offset=0`
- `GET /products/{product_id}`

**Auth**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout` (Bearer)

**Users** (Bearer required)

- `GET /users/me`
- `PATCH /users/me`

**Addresses** (Bearer required)

- `GET /addresses/`
- `POST /addresses/`
- `PUT /addresses/{id}`
- `DELETE /addresses/{id}`

**Orders** (Bearer required)

- `GET /orders/`
- `POST /orders/`

See [BE-INSTRUCTION.MD](./native-e-commerce/BE-INSTRUCTION.MD) for full API contract.

---

## 🔐 Authentication

- **Header:** `Authorization: Bearer <token>`
- **Store ID:** `X-Store-Id: 1` (required for all requests)
- **Token Storage:** AsyncStorage (persisted on device)
- **Token Revocation:** On logout, token added to revoked list

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

### DevOps

- **Docker** — Containerization
- **Docker Compose** — Multi-service orchestration

---

## 🚨 Common Issues

### "Unable to reach API server"

→ See [API_TROUBLESHOOTING.md](./API_TROUBLESHOOTING.md)

### Database connection error

1. Check PostgreSQL is running: `docker-compose ps`
2. Reset: `docker-compose down -v && docker-compose up -d`

### Port 8000 already in use

```bash
# Find process using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# Kill process or use different port
```

### Module not found errors

```bash
cd native-e-commerce
npm install
npm run lint
```

---

## 📖 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Native Documentation](https://reactnative.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

## 👥 Team

- **Frontend:** React Native + Expo
- **Backend:** FastAPI + PostgreSQL
- **DevOps:** Docker Compose

---

## 📝 License

TBD

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/xyz`
2. Follow code style: `npm run lint && npm run format`
3. Test changes: Run smoke tests
4. Create PR with description

---

## ❓ Need Help?

1. **Setup issues?** → [SETUP.md](./SETUP.md)
2. **API connectivity?** → [API_TROUBLESHOOTING.md](./API_TROUBLESHOOTING.md)
3. **Environment config?** → [ENV.MD](./native-e-commerce/ENV.MD)
4. **API contract?** → [BE-INSTRUCTION.MD](./native-e-commerce/BE-INSTRUCTION.MD)
