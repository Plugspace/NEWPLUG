# ==============================================
# PLUGSPACE.IO TITAN v1.4 - MAKEFILE
# ==============================================
# Enterprise Voice-First AI Website Builder
# ==============================================

.PHONY: all install dev build test lint clean docker help

# Default target
all: install build

# ===========================================
# DEVELOPMENT
# ===========================================

## Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm ci
	@echo "✅ Dependencies installed"

## Install dependencies (fresh)
install-fresh:
	@echo "🗑️  Cleaning node_modules..."
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

## Start development servers
dev:
	@echo "🚀 Starting development servers..."
	npm run dev

## Start specific apps
dev-api:
	@echo "🚀 Starting API server..."
	npm run dev:api

dev-voice:
	@echo "🚀 Starting Voice server..."
	npm run dev:voice

dev-landing:
	@echo "🚀 Starting Landing page..."
	npm run dev:landing

dev-studio:
	@echo "🚀 Starting Studio..."
	npm run dev:studio

dev-admin:
	@echo "🚀 Starting Admin panel..."
	npm run dev:admin

# ===========================================
# BUILD
# ===========================================

## Build all packages and apps
build:
	@echo "🔨 Building all packages..."
	npm run build
	@echo "✅ Build complete"

## Build for production
build-prod: clean install
	@echo "🔨 Building for production..."
	NODE_ENV=production npm run build
	@echo "✅ Production build complete"

# ===========================================
# TESTING
# ===========================================

## Run all tests
test:
	@echo "🧪 Running tests..."
	npm run test

## Run tests with coverage
test-coverage:
	@echo "🧪 Running tests with coverage..."
	npm run test:ci

## Run tests in watch mode
test-watch:
	@echo "🧪 Running tests in watch mode..."
	npm run test:watch

# ===========================================
# LINTING & FORMATTING
# ===========================================

## Run linter
lint:
	@echo "🔍 Running linter..."
	npm run lint

## Fix lint issues
lint-fix:
	@echo "🔧 Fixing lint issues..."
	npm run lint:fix

## Run type check
type-check:
	@echo "📝 Running type check..."
	npm run type-check

## Format code
format:
	@echo "✨ Formatting code..."
	npm run format

## Check formatting
format-check:
	@echo "🔍 Checking formatting..."
	npm run format:check

# ===========================================
# DATABASE
# ===========================================

## Generate Prisma client
db-generate:
	@echo "📦 Generating Prisma client..."
	npm run db:generate

## Push database schema
db-push:
	@echo "📤 Pushing database schema..."
	npm run db:push

## Run database migrations
db-migrate:
	@echo "🔄 Running database migrations..."
	npm run db:migrate

## Open Prisma Studio
db-studio:
	@echo "🖥️  Opening Prisma Studio..."
	npm run db:studio

## Seed database
db-seed:
	@echo "🌱 Seeding database..."
	npm run db:seed

# ===========================================
# DOCKER
# ===========================================

## Build Docker images
docker-build:
	@echo "🐳 Building Docker images..."
	npm run docker:build

## Start Docker containers
docker-up:
	@echo "🐳 Starting Docker containers..."
	npm run docker:up

## Stop Docker containers
docker-down:
	@echo "🐳 Stopping Docker containers..."
	npm run docker:down

## View Docker logs
docker-logs:
	@echo "📋 Viewing Docker logs..."
	npm run docker:logs

## Full Docker build and start
docker: docker-build docker-up

# ===========================================
# PRODUCTION
# ===========================================

## Start production servers with PM2
start-prod:
	@echo "🚀 Starting production servers..."
	npm run start:prod

## Reload PM2 processes
reload:
	@echo "🔄 Reloading PM2 processes..."
	pm2 reload ecosystem.config.js

## View PM2 status
status:
	@echo "📊 PM2 Status:"
	pm2 status

## View PM2 logs
logs:
	@echo "📋 PM2 Logs:"
	pm2 logs

# ===========================================
# CLEANUP
# ===========================================

## Clean build artifacts
clean:
	@echo "🗑️  Cleaning build artifacts..."
	npm run clean
	@echo "✅ Clean complete"

## Deep clean (including node_modules)
clean-all: clean
	@echo "🗑️  Removing node_modules..."
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf .turbo apps/*/.turbo packages/*/.turbo
	@echo "✅ Deep clean complete"

# ===========================================
# CI/CD
# ===========================================

## Run CI checks (lint, type-check, test, build)
ci: lint type-check test build
	@echo "✅ CI checks passed"

## Pre-commit check
pre-commit: lint-fix format type-check
	@echo "✅ Pre-commit checks passed"

# ===========================================
# SETUP
# ===========================================

## Initial project setup
setup: install db-generate
	@echo "✅ Project setup complete"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make db-push' to create database"
	@echo "  3. Run 'make dev' to start development"

# ===========================================
# HELP
# ===========================================

## Show this help message
help:
	@echo ""
	@echo "╔══════════════════════════════════════════════╗"
	@echo "║  PLUGSPACE.IO TITAN v1.4 - Build Commands    ║"
	@echo "╚══════════════════════════════════════════════╝"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  install        Install dependencies"
	@echo "  dev            Start all dev servers"
	@echo "  dev-api        Start API server only"
	@echo "  dev-voice      Start Voice server only"
	@echo "  dev-landing    Start Landing page only"
	@echo "  dev-studio     Start Studio only"
	@echo "  dev-admin      Start Admin panel only"
	@echo ""
	@echo "Build:"
	@echo "  build          Build all packages"
	@echo "  build-prod     Production build"
	@echo ""
	@echo "Testing:"
	@echo "  test           Run all tests"
	@echo "  test-coverage  Run tests with coverage"
	@echo "  test-watch     Run tests in watch mode"
	@echo ""
	@echo "Linting:"
	@echo "  lint           Run linter"
	@echo "  lint-fix       Fix lint issues"
	@echo "  type-check     Run TypeScript check"
	@echo "  format         Format code"
	@echo ""
	@echo "Database:"
	@echo "  db-generate    Generate Prisma client"
	@echo "  db-push        Push schema to database"
	@echo "  db-migrate     Run migrations"
	@echo "  db-studio      Open Prisma Studio"
	@echo "  db-seed        Seed database"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build   Build Docker images"
	@echo "  docker-up      Start containers"
	@echo "  docker-down    Stop containers"
	@echo "  docker-logs    View logs"
	@echo ""
	@echo "Production:"
	@echo "  start-prod     Start with PM2"
	@echo "  reload         Reload PM2 processes"
	@echo "  status         View PM2 status"
	@echo "  logs           View PM2 logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean          Clean build artifacts"
	@echo "  clean-all      Deep clean (incl. node_modules)"
	@echo ""
	@echo "CI/CD:"
	@echo "  ci             Run CI checks"
	@echo "  pre-commit     Pre-commit checks"
	@echo ""
	@echo "Setup:"
	@echo "  setup          Initial project setup"
	@echo ""
