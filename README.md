# 🚀 Plugspace.io Titan v1.4

**Enterprise-Grade Voice-First AI Coding Platform**

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/plugspace/titan)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)

Plugspace Titan is a production-ready, enterprise-grade platform for building websites using voice commands and AI agents. Simply speak your ideas, and watch them come to life.

## ✨ Features

- **🎤 Voice-First Development** - Build websites by speaking naturally
- **🤖 Dual-LLM AI Agents** - Four specialized AI agents with advanced orchestration:
  - **Don** (Architect) - Claude Sonnet 4.5 powered architecture generation
  - **Jessica** (Designer) - Gemini 3.0 Pro visual intelligence for design systems
  - **Mark** (Engineer) - Claude Sonnet 4.5 production-ready code generation
  - **Sherlock** (Analyst) - Gemini 3.0 Pro website analysis and cloning
- **🧠 Intelligent Suggestions** - AI-powered design improvement recommendations
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
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER (tRPC)                           │
│                   Port 4000                                  │
└─────────────────────────────────────────────────────────────┘
                        │
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
│   ├── api/              # tRPC Backend API
│   ├── landing/          # Landing Page (Next.js)
│   ├── studio/           # User Studio (Next.js)
│   └── admin/            # Master Admin Dashboard (Next.js)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── database/         # Prisma schema & database utilities
├── infrastructure/
│   ├── nginx/            # Nginx configuration
│   ├── pm2/              # PM2 ecosystem config
│   ├── docker/           # Docker configurations
│   └── monitoring/       # Prometheus & Grafana configs
├── scripts/
│   ├── deploy.sh         # Deployment script
│   └── setup.sh          # Server setup script
└── package.json          # Root workspace config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/plugspace/titan.git
cd titan

# Run first-time setup (installs deps, creates .env, sets up git hooks)
make setup

# Edit .env with your configuration
vim .env

# Start development environment
make dev
```

### Using Docker (Recommended)

```bash
# Start all services with Docker Compose
make dev-docker

# View logs
make logs

# Stop services
make stop
```

### Manual Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Build all packages
npm run build

# Start development servers
npm run dev
```

### Development URLs

- **Landing Page**: http://localhost:3000
- **Studio**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **API**: http://localhost:4000

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `ANTHROPIC_API_KEY` - Claude API key for AI agents
- `GOOGLE_AI_API_KEY` - Gemini API key for voice/vision
- `FIREBASE_*` - Firebase Admin SDK credentials
- `STRIPE_*` - Stripe payment integration

## 🛠️ Make Commands

All automation is handled through the Makefile:

```bash
# Setup & Installation
make setup            # Complete first-time setup
make install          # Install dependencies
make install-clean    # Clean install all dependencies

# Development
make dev              # Start development with hot-reload
make dev-docker       # Full Docker development environment
make dev-services     # Start only database services

# Building
make build            # Build all applications
make build-docker     # Build Docker images

# Testing
make test             # Run full test suite
make lint             # Run ESLint
make typecheck        # TypeScript type checking
make check            # Run all checks (lint, type, test)

# Database
make db-generate      # Generate Prisma client
make db-push          # Push schema changes
make db-migrate       # Run migrations
make db-seed          # Seed database
make db-studio        # Open Prisma Studio

# Production
make prod             # Production deployment
make deploy           # Full production deployment
make deploy-rolling   # Zero-downtime rolling deployment
make scale            # Horizontal scaling

# Monitoring
make logs             # View all service logs
make health           # Check service health
make monitor          # Open Grafana dashboard

# Security
make security-scan    # Run security vulnerability scan
make security-audit   # Full security audit

# Backup & Restore
make backup           # Create database backup
make restore          # Restore from backup

# Cleanup
make clean            # Clean build artifacts
make clean-docker     # Remove Docker containers
make prune            # Prune Docker system
```

## 🐳 Docker Deployment

```bash
# Development environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker compose up -d --scale api=3

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## 📦 Production Deployment

### Using PM2

```bash
# Run the setup script (on a fresh Ubuntu 24.04 server)
sudo ./scripts/setup.sh

# Clone the repository
git clone https://github.com/plugspace/titan.git /var/www/plugspace
cd /var/www/plugspace

# Configure environment
cp .env.example .env
vim .env

# Run deployment
sudo ./scripts/deploy.sh
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

## 🚨 Error Handling

Comprehensive error handling system with:

- **Error Categories**: Authentication, Authorization, Validation, Rate Limiting, Server, AI
- **Error Codes**: Standardized codes (e.g., `AUTH_001`, `VAL_001`)
- **Request Tracking**: Unique request IDs for debugging
- **Retry Logic**: Automatic retry for transient failures
- **User-Friendly Messages**: Clear suggestions for resolution

Example error response:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Authentication required",
    "requestId": "req_abc123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "suggestion": "Please log in to access this resource."
  }
}
```

## 📚 Documentation

Detailed documentation is available in the `/docs` directory:

- **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment guide
- **[Security](docs/SECURITY.md)** - Security practices and compliance
- **[AI Agents](docs/AGENTS.md)** - Dual-LLM agent architecture and usage
- **[Prompts](docs/PROMPTS.md)** - Prompt engineering guide
- **[Queue System](docs/QUEUE.md)** - Task queue documentation

## 📊 Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3030 (admin/admin)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

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
