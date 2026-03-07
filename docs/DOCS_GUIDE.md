# 📚 Documentation Guide

Complete guide to all documentation files in this project.

**📁 All docs are organized in the `docs/` folder**

---

## 🎯 Quick Navigation

### Getting Started
1. **[../README.md](../README.md)** - Project overview, quick start, features
2. **[setup/POSTGRESQL_SETUP.md](setup/POSTGRESQL_SETUP.md)** - Database setup instructions

### Core Development
3. **[api/RUNBOOK.md](api/RUNBOOK.md)** - API endpoints, feature walkthroughs, examples
4. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing strategies and guides
5. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns

---

## 📖 Documentation by Purpose

### Setup & Installation
| Document | Purpose |
|----------|---------|
| [../README.md](../README.md) | Quick start, prerequisites, all portals setup |
| [setup/POSTGRESQL_SETUP.md](setup/POSTGRESQL_SETUP.md) | PostgreSQL installation & configuration |
| [setup/COMPANY_AUTH_SETUP.md](setup/COMPANY_AUTH_SETUP.md) | Company authentication setup |

### Core Features
| Document | Purpose |
|----------|---------|
| [api/RUNBOOK.md](api/RUNBOOK.md) | Complete API reference with examples |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and architecture |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Testing strategies for features |

### Portal Documentation
| Document | Purpose |
|----------|---------|
| [../company-portal/README.md](../company-portal/README.md) | Company portal quick start |
| [features/COMPANY_PORTAL_GUIDE.md](features/COMPANY_PORTAL_GUIDE.md) | Detailed company portal guide |
| [../auto-portal/README.md](../auto-portal/README.md) | Auto portal quick start |

### Feature Implementation
| Document | Purpose |
|----------|---------|
| [features/AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md](features/AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md) | Audit trail system |
| [features/PAYMENT_FEATURE_IMPLEMENTATION.md](features/PAYMENT_FEATURE_IMPLEMENTATION.md) | Payment system |
| [features/ADVANCE_PAYMENT_IMPLEMENTATION.md](features/ADVANCE_PAYMENT_IMPLEMENTATION.md) | Advance payment feature |
| [features/ADVERTISEMENT_IMAGE_FEATURE.md](features/ADVERTISEMENT_IMAGE_FEATURE.md) | Advertisement images |
| [features/EMAIL_SETUP_GUIDE.md](features/EMAIL_SETUP_GUIDE.md) | Email system configuration |
| [features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md](features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md) | Google OAuth integration |

---

## 🗺️ Reading by Role

### 👨‍💼 Project Manager / Non-Technical
1. [../README.md](../README.md) - Project overview
2. [api/RUNBOOK.md](api/RUNBOOK.md) - Feature list and examples

### 🚀 New Developer
1. [../README.md](../README.md) - Start here
2. [setup/POSTGRESQL_SETUP.md](setup/POSTGRESQL_SETUP.md) - Database setup
3. [ARCHITECTURE.md](ARCHITECTURE.md) - Understand the structure
4. [api/RUNBOOK.md](api/RUNBOOK.md) - API reference
5. [../company-portal/README.md](../company-portal/README.md) - Company portal details

### 🔧 Backend Developer
1. [setup/POSTGRESQL_SETUP.md](setup/POSTGRESQL_SETUP.md)
2. [ARCHITECTURE.md](ARCHITECTURE.md)
3. [api/RUNBOOK.md](api/RUNBOOK.md)
4. Feature guides as needed (see features/ folder)

### ⚛️ Frontend Developer
1. [../README.md](../README.md)
2. [features/COMPANY_PORTAL_GUIDE.md](features/COMPANY_PORTAL_GUIDE.md)
3. [../company-portal/README.md](../company-portal/README.md)
4. [../auto-portal/README.md](../auto-portal/README.md)
5. [features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md](features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md)

### 📧 Email/Auth Setup
1. [features/EMAIL_SETUP_GUIDE.md](features/EMAIL_SETUP_GUIDE.md)
2. [features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md](features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md)
3. [setup/COMPANY_AUTH_SETUP.md](setup/COMPANY_AUTH_SETUP.md)

---

## 📋 Project Structure

```
Gyani_Auto_Database/
├── README.md                          # 👈 Start here
├── package.json
├── .gitignore
│
├── 📁 docs/                           # ALL DOCUMENTATION
│   ├── DOCS_GUIDE.md                 # This file - Navigation guide
│   ├── ARCHITECTURE.md               # System architecture
│   ├── TESTING_GUIDE.md              # Testing guide
│   │
│   ├── setup/
│   │   ├── POSTGRESQL_SETUP.md       # Database setup
│   │   └── COMPANY_AUTH_SETUP.md     # Company authentication
│   │
│   ├── api/
│   │   ├── RUNBOOK.md                # API reference
│   │   ├── AdminPanel.postman_collection.json
│   │   └── openapi.json
│   │
│   └── features/
│       ├── COMPANY_PORTAL_GUIDE.md
│       ├── GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md
│       ├── AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md
│       ├── PAYMENT_FEATURE_IMPLEMENTATION.md
│       ├── ADVANCE_PAYMENT_IMPLEMENTATION.md
│       ├── ADVERTISEMENT_IMAGE_FEATURE.md
│       └── EMAIL_SETUP_GUIDE.md
│
├── 📁 scripts/                       # ALL SCRIPTS
│   ├── setup.sh / setup.bat          # Environment setup
│   ├── start-all.sh / start-all.bat  # Start all services
│   ├── start-all.ps1
│   ├── check-login.sh / check-login.ps1
│   └── deploy.sh
│
├── 📁 backend/                       # Express + PostgreSQL
│   ├── src/
│   │   ├── models/                  # Database models
│   │   ├── controllers/             # Route handlers
│   │   ├── routes/                  # API routes
│   │   ├── migrations/              # DB migrations
│   │   ├── seeds/                   # Seed data
│   │   └── utils/
│   ├── knexfile.js                  # Database config
│   └── package.json
│
├── 📁 frontend/                      # Admin Panel (React)
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/                # API client
│   │   └── App.jsx
│   └── package.json
│
├── 📁 company-portal/               # Company Portal (React)
│   ├── README.md
│   ├── src/
│   └── package.json
│
└── 📁 auto-portal/                  # Auto Portal (React)
    ├── README.md
    ├── src/
    └── package.json
```

---

## 🔍 Finding Documentation

**Need to know how to...**

- **Set up the project?** → [../README.md](../README.md) + [setup/POSTGRESQL_SETUP.md](setup/POSTGRESQL_SETUP.md)
- **Call an API endpoint?** → [api/RUNBOOK.md](api/RUNBOOK.md)
- **Understand system design?** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Test features?** → [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Set up company portal?** → [features/COMPANY_PORTAL_GUIDE.md](features/COMPANY_PORTAL_GUIDE.md)
- **Configure authentication?** → [setup/COMPANY_AUTH_SETUP.md](setup/COMPANY_AUTH_SETUP.md) or [features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md](features/GOOGLE_OAUTH_IMPLEMENTATION_GUIDE.md)
- **Setup email?** → [features/EMAIL_SETUP_GUIDE.md](features/EMAIL_SETUP_GUIDE.md)
- **Implement audit system?** → [features/AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md](features/AUDIT_SYSTEM_IMPLEMENTATION_GUIDE.md)
- **Setup payments?** → [features/PAYMENT_FEATURE_IMPLEMENTATION.md](features/PAYMENT_FEATURE_IMPLEMENTATION.md) or [features/ADVANCE_PAYMENT_IMPLEMENTATION.md](features/ADVANCE_PAYMENT_IMPLEMENTATION.md)
- **Manage advertisement images?** → [features/ADVERTISEMENT_IMAGE_FEATURE.md](features/ADVERTISEMENT_IMAGE_FEATURE.md)

---

## 💡 Quick Links

### Scripts & Tools
- **Start all services**: `./scripts/start-all.sh` (Linux/Mac) or `scripts/start-all.bat` (Windows)
- **Setup environment**: `./scripts/setup.sh` or `scripts/setup.bat`
- **Check login credentials**: `./scripts/check-login.sh` or `scripts/check-login.ps1`
- **Deploy**: `./scripts/deploy.sh`

### Test Credentials
- **Admin**: `pragna@company.com` / `Test1234`
- **Default Database**: PostgreSQL on `localhost:5432`

### Ports
- Admin Panel: `http://localhost:3000`
- Backend API: `http://localhost:5001`
- Company Portal: `http://localhost:3001`
- Auto Portal: `http://localhost:3002`

---

## 📝 Contributing Documentation

When adding new features:
1. Update [api/RUNBOOK.md](api/RUNBOOK.md) with API endpoints
2. Add feature doc to [features/](features/) folder
3. Update [ARCHITECTURE.md](ARCHITECTURE.md) if design changes
4. Update [TESTING_GUIDE.md](TESTING_GUIDE.md) with test cases
5. Update this guide with new doc references

---

**Last Updated**: March 7, 2026
