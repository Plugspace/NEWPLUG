# Plugspace.io Titan v1.4

Enterprise-grade, production-ready voice-first AI coding platform.

## 🏗️ Architecture

### Monorepo Structure

```
plugspace-titan-v1.4/
├── apps/
│   ├── backend/          # tRPC API server (Port 3001)
│   ├── landing/          # Landing page (Port 3000)
│   ├── studio/           # User studio (Port 3001)
│   └── admin/            # Master admin dashboard (Port 3002)
├── packages/
│   ├── db/               # Prisma schema & client
│   └── shared/           # Shared types & utilities
└── infrastructure/       # Nginx, PM2, Docker configs
```

### Technology Stack

- **Backend**: Node.js 20, TypeScript 5.3+, tRPC 10+, Express
- **Database**: MongoDB 7 (replica set)
- **Cache/Queue**: Redis 7 (cluster mode)
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS 3.4+
- **AI Models**:
  - Logic: Claude Sonnet 4.5
  - Vision: Gemini 3.0 Pro
  - Voice: Gemini Live API
  - Image: Imagen 3 via Vertex AI
- **Infrastructure**: Hostinger VPS, Nginx, PM2, Let's Encrypt

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ LTS
- pnpm 8+
- MongoDB 7+
- Redis 7+
- Firebase Admin SDK credentials

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in all required environment variables
3. Set up Firebase Admin SDK credentials
4. Configure AI API keys (Anthropic, Google)

## 📦 Deployment

### Production Deployment

1. **Build all applications**:
   ```bash
   pnpm build
   ```

2. **Start with PM2**:
   ```bash
   pm2 start infrastructure/pm2.config.js
   ```

3. **Configure Nginx**:
   ```bash
   sudo cp infrastructure/nginx.conf /etc/nginx/sites-available/plugspace
   sudo ln -s /etc/nginx/sites-available/plugspace /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **SSL Certificate** (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d plugspace.io -d www.plugspace.io
   ```

## 🔐 Security

- Multi-tenant isolation at database and API levels
- Firebase authentication with JWT tokens
- Rate limiting (100 req/min per IP)
- CORS protection
- Security headers (HSTS, X-Frame-Options, etc.)
- Master admin restricted to `plugspaceapp@gmail.com`

## 📊 Features

### AI Agents

- **Don**: Architecture generation
- **Mark**: Code generation
- **Jessica**: Design system creation
- **Sherlock**: Website cloning
- **Zara**: Voice command processing

### User Features

- Voice-first interface
- Real-time template browsing
- Project studio with live preview
- Multi-device responsive preview
- Auto-save every 30 seconds
- Publish wizard with domain selection

### Admin Features

- Dashboard with analytics
- User management
- Theme Studio (4 generation methods)
- System configuration
- Kill switch

## 📝 License

Proprietary - Plugspace.io
