# 🚀 Plugspace.io Titan v1.4

**Enterprise-Grade Voice-First AI Website Builder Platform**

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/plugspace/titan)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/plugspace/titan/actions/workflows/ci.yml/badge.svg)](https://github.com/plugspace/titan/actions/workflows/ci.yml)

Plugspace Titan is a production-ready, enterprise-grade platform for building websites using voice commands and AI agents. Simply speak your ideas, and watch them come to life.

## ✨ Features

- **🎤 Voice-First Development** - Build websites by speaking naturally
  - **Gemini Live API** - Real-time bidirectional audio streaming
  - **Agent Zara** - AI voice assistant with personality and emotional intelligence
  - **20+ Languages** - Multi-language voice support
  - **Natural Commands** - "Create a restaurant website with a booking system"
- **🤖 Dual-LLM AI Agents** - Four specialized AI agents with advanced orchestration:
  - **Don** (Architect) - Claude Sonnet 4.5 powered architecture generation
  - **Jessica** (Designer) - Gemini 3.0 Pro visual intelligence for design systems
  - **Mark** (Engineer) - Claude Sonnet 4.5 production-ready code generation
  - **Sherlock** (Analyst) - Gemini 3.0 Pro website analysis and cloning
- **🧠 Intelligent NLP** - Advanced natural language processing:
  - **Intent Detection** - 99%+ accuracy intent classification
  - **Entity Extraction** - Automatic extraction of URLs, colors, sections
  - **Dialogue Management** - Multi-turn conversation with context
  - **Design Suggestions** - AI-powered improvement recommendations
- **📊 Queue Management** - Redis-based task orchestration with BullMQ
- **🎨 Beautiful Templates** - 100+ professionally designed templates
- **🚀 One-Click Publishing** - Deploy instantly with SSL and CDN
- **🔒 Enterprise Security** - SOC2 and GDPR compliant
- **👥 Multi-Tenant** - Complete organization isolation
- **📊 Real-Time Analytics** - Track performance and usage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────┬─────────────────┬──────────────────────────────┤
│  Landing    │  User Studio    │  Master Admin                │
│  Port 3000  │  Port 3001      │  Port 3002                   │
└─────────────┴─────────────────┴──────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NGINX REVERSE PROXY (443/80)                    │
│  SSL/TLS Termination │ Load Balancing │ Rate Limiting       │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌───────────────────┐         ┌────────────────────┐
│   API SERVER      │         │   VOICE SERVER     │
│   Port 4000       │         │   Port 4001        │
│   (tRPC)          │         │   (WebSocket)      │
└───────────────────┘         └────────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  MongoDB 7 Replica Set  │  Redis 7 Cluster                  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
plugspace-titan/
├── apps/
│   ├── api/              # tRPC Backend API (Port 4000)
│   │   └── src/
│   │       ├── agents/   # AI Agents (Don, Jessica, Mark, Sherlock)
│   │       ├── services/ # Core services (LLM, NLP, Voice, Suggestions)
│   │       ├── queue/    # BullMQ task queue management
│   │       └── routers/  # tRPC API routers
│   ├── server/           # Voice WebSocket Server (Port 4001)
│   │   └── src/          # Gemini Live API integration
│   ├── landing/          # Landing Page (Next.js, Port 3000)
│   ├── studio/           # User Studio (Next.js, Port 3001)
│   └── admin/            # Master Admin Dashboard (Next.js, Port 3002)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   ├── ui/               # Shared UI components
│   │   └── src/
│   │       ├── hooks/    # React hooks (useVoiceSocket)
│   │       └── components/voice/  # Voice UI components
│   └── database/         # Prisma schema & database utilities
├── infrastructure/
│   ├── docker/           # Docker Compose & Dockerfiles
│   ├── nginx/            # Nginx configuration
│   ├── monitoring/       # Prometheus, Grafana configs
│   ├── backup/           # Backup & restore scripts
│   └── alertmanager/     # Alert configuration
├── deploy/               # VPS deployment scripts
│   ├── vps-hardening.sh  # Server security hardening
│   ├── mongodb-setup.sh  # MongoDB installation
│   ├── redis-setup.sh    # Redis installation
│   ├── nginx-setup.sh    # Nginx configuration
│   ├── ssl-setup.sh      # SSL/TLS setup
│   └── pm2-setup.sh      # PM2 process manager
├── docs/                 # Technical documentation
├── .github/workflows/    # CI/CD pipelines
├── ecosystem.config.js   # PM2 configuration
├── Makefile              # Build automation
└── package.json          # Root workspace config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose (optional)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/plugspace/titan.git
cd titan

# Run setup (installs deps, generates Prisma client)
make setup

# Copy and configure environment
cp .env.example .env
vim .env

# Start development servers
make dev
```

### Using Docker

```bash
# Build and start all services
make docker

# View logs
make docker-logs

# Stop services
make docker-down
```

### Development URLs

| Service | URL |
|---------|-----|
| Landing Page | http://localhost:3000 |
| Studio | http://localhost:3001 |
| Admin Dashboard | http://localhost:3002 |
| API | http://localhost:4000 |
| Voice Server | http://localhost:4001 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3030 |

## 🛠️ Make Commands

```bash
# Development
make install          # Install dependencies
make dev              # Start all dev servers
make dev-api          # Start API server only
make dev-voice        # Start Voice server only
make dev-landing      # Start Landing page only
make dev-studio       # Start Studio only
make dev-admin        # Start Admin panel only

# Build
make build            # Build all packages
make build-prod       # Production build

# Testing
make test             # Run all tests
make test-coverage    # Run tests with coverage
make lint             # Run linter
make lint-fix         # Fix lint issues
make type-check       # Run TypeScript check

# Database
make db-generate      # Generate Prisma client
make db-push          # Push schema to database
make db-migrate       # Run migrations
make db-studio        # Open Prisma Studio
make db-seed          # Seed database

# Docker
make docker-build     # Build Docker images
make docker-up        # Start containers
make docker-down      # Stop containers
make docker-logs      # View logs

# Production
make start-prod       # Start with PM2
make reload           # Reload PM2 processes
make status           # View PM2 status
make logs             # View PM2 logs

# CI/CD
make ci               # Run CI checks (lint, type-check, test, build)
make pre-commit       # Pre-commit checks

# Cleanup
make clean            # Clean build artifacts
make clean-all        # Deep clean (incl. node_modules)

# Help
make help             # Show all available commands
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
```bash
# Database
DATABASE_URL=mongodb://localhost:27017/plugspace
REDIS_URL=redis://localhost:6379

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...        # Claude API key
GOOGLE_AI_API_KEY=AIza...           # Gemini API key

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe (optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🐳 Docker Deployment

```bash
# Development with monitoring
docker compose -f infrastructure/docker/docker-compose.yml \
  --profile monitoring up -d

# Production
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Scale services
docker compose -f infrastructure/docker/docker-compose.yml \
  up -d --scale api=3

# View logs
docker compose -f infrastructure/docker/docker-compose.yml logs -f
```

## 📦 Production Deployment

### VPS Deployment (Hostinger)

```bash
# 1. Run VPS hardening (on fresh Ubuntu 24.04)
sudo ./deploy/vps-hardening.sh

# 2. Setup databases
sudo ./deploy/mongodb-setup.sh
sudo ./deploy/redis-setup.sh

# 3. Setup Nginx & SSL
sudo ./deploy/nginx-setup.sh
sudo ./deploy/ssl-setup.sh --domain plugspace.io --email admin@plugspace.io

# 4. Setup PM2
./deploy/pm2-setup.sh

# Application will be managed via GitHub Actions CI/CD
```

### SSL Certificates

```bash
# Obtain certificates with Certbot
certbot --nginx \
  -d plugspace.io \
  -d www.plugspace.io \
  -d studio.plugspace.io \
  -d admin.plugspace.io \
  -d api.plugspace.io
```

## 🔐 Security

- **Authentication**: Firebase Admin SDK with JWT tokens
- **Authorization**: Role-based access control (USER, STUDIO_ADMIN, MASTER_ADMIN)
- **Multi-Tenant Isolation**: Complete data separation per organization
- **Rate Limiting**: Tiered rate limiting per subscription level
- **MFA**: TOTP, SMS, and Email verification
- **Encryption**: AES-256-GCM for sensitive data at rest
- **HTTPS**: TLS 1.3 with Let's Encrypt

## 📚 Documentation

| Category | Documents |
|----------|-----------|
| **Architecture** | [Architecture](docs/ARCHITECTURE.md), [API Reference](docs/API.md) |
| **AI & Voice** | [AI Agents](docs/AGENTS.md), [Prompts](docs/PROMPTS.md), [Queue System](docs/QUEUE.md), [Voice System](docs/VOICE_SYSTEM.md), [Audio Specs](docs/AUDIO_SPECS.md), [Zara Persona](docs/ZARA_PERSONA.md) |
| **Operations** | [Deployment](docs/DEPLOYMENT.md), [Monitoring](docs/MONITORING.md), [Backup](docs/BACKUP.md), [Runbook](docs/RUNBOOK.md) |
| **Security** | [Security](docs/SECURITY.md) |

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:ci

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📈 Performance

Designed for enterprise-scale:
- 10,000+ concurrent users
- Sub-100ms API response times
- 99.9% uptime SLA
- Multi-region deployment ready

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [tRPC](https://trpc.io/) - Type-safe APIs
- [Prisma](https://prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Anthropic Claude](https://anthropic.com/) - AI models
- [Google Gemini](https://ai.google.dev/) - Voice & Vision AI

---

**Made with ❤️ by Plugspace Team**
