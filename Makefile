# ==============================================
# PLUGSPACE.IO TITAN v1.4 - ENTERPRISE MAKEFILE
# ==============================================
# Comprehensive automation for development,
# deployment, testing, and maintenance
# ==============================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ============================================
# VARIABLES
# ============================================

PROJECT_NAME := plugspace-titan
VERSION := 1.4.0
NODE_ENV ?= development
DOCKER_COMPOSE := docker compose
DC_DEV := $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
DC_PROD := $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml
NPM := npm
TURBO := npx turbo

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
MAGENTA := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

# ============================================
# HELP
# ============================================

.PHONY: help
help: ## Display this help message
	@echo ""
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║     PLUGSPACE.IO TITAN v1.4 - Enterprise Automation          ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Usage:$(NC) make $(GREEN)<target>$(NC)"
	@echo ""
	@echo "$(MAGENTA)Setup & Installation:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(setup|install|init)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Development:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(dev|start|stop|restart|watch)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Building:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(build|compile)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Testing:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(test|lint|check|coverage)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Database:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(db-|migrate|seed|backup|restore)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Production:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(prod|deploy|scale|ssl)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Monitoring & Logs:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(logs|monitor|health|metrics)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Security:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(security|scan|audit)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(MAGENTA)Cleanup:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(clean|prune|reset)' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================
# SETUP & INSTALLATION
# ============================================

.PHONY: setup
setup: check-requirements install setup-env setup-git-hooks setup-db ## Complete first-time setup with dependency checks
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Edit .env file with your configuration"
	@echo "  2. Run 'make dev' to start development environment"

.PHONY: check-requirements
check-requirements: ## Check if all required tools are installed
	@echo "$(CYAN)Checking system requirements...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)✗ Node.js is required but not installed.$(NC)"; exit 1; }
	@node -v | grep -q "v2[0-9]" || { echo "$(YELLOW)⚠ Node.js 20+ recommended, current: $$(node -v)$(NC)"; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)✗ npm is required but not installed.$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)✗ Docker is required but not installed.$(NC)"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "$(RED)✗ Docker Compose is required but not installed.$(NC)"; exit 1; }
	@command -v git >/dev/null 2>&1 || { echo "$(RED)✗ Git is required but not installed.$(NC)"; exit 1; }
	@echo "$(GREEN)✓ All requirements met$(NC)"

.PHONY: install
install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	$(NPM) install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.PHONY: install-clean
install-clean: ## Clean install all dependencies
	@echo "$(CYAN)Clean installing dependencies...$(NC)"
	rm -rf node_modules packages/*/node_modules apps/*/node_modules
	$(NPM) ci
	@echo "$(GREEN)✓ Dependencies clean installed$(NC)"

.PHONY: setup-env
setup-env: ## Setup environment files
	@echo "$(CYAN)Setting up environment files...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(NC)"; \
		echo "$(YELLOW)⚠ Please edit .env with your configuration$(NC)"; \
	else \
		echo "$(YELLOW)⚠ .env already exists, skipping$(NC)"; \
	fi

.PHONY: setup-git-hooks
setup-git-hooks: ## Setup git hooks with Husky
	@echo "$(CYAN)Setting up git hooks...$(NC)"
	@npx husky install 2>/dev/null || true
	@echo "$(GREEN)✓ Git hooks configured$(NC)"

.PHONY: setup-db
setup-db: ## Setup database infrastructure
	@echo "$(CYAN)Setting up database infrastructure...$(NC)"
	@mkdir -p infrastructure/mongodb/keyfile
	@if [ ! -f infrastructure/mongodb/keyfile/mongodb-keyfile ]; then \
		openssl rand -base64 756 > infrastructure/mongodb/keyfile/mongodb-keyfile; \
		chmod 400 infrastructure/mongodb/keyfile/mongodb-keyfile; \
		echo "$(GREEN)✓ MongoDB keyfile created$(NC)"; \
	fi
	@echo "$(GREEN)✓ Database infrastructure ready$(NC)"

# ============================================
# DEVELOPMENT
# ============================================

.PHONY: dev
dev: ## Start development environment with hot-reload
	@echo "$(CYAN)Starting development environment...$(NC)"
	$(DC_DEV) up -d mongo-primary redis-master
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	@sleep 5
	$(TURBO) run dev

.PHONY: dev-docker
dev-docker: ## Start full development environment in Docker
	@echo "$(CYAN)Starting full Docker development environment...$(NC)"
	$(DC_DEV) up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"
	@echo "$(CYAN)Services:$(NC)"
	@echo "  Landing:  http://localhost:3000"
	@echo "  Studio:   http://localhost:3001"
	@echo "  Admin:    http://localhost:3002"
	@echo "  API:      http://localhost:4000"
	@echo "  Grafana:  http://localhost:3003"

.PHONY: dev-services
dev-services: ## Start only database services for local development
	@echo "$(CYAN)Starting database services...$(NC)"
	$(DC_DEV) up -d mongo-primary redis-master
	@echo "$(GREEN)✓ Database services started$(NC)"

.PHONY: start
start: ## Start all services
	@echo "$(CYAN)Starting all services...$(NC)"
	$(DC_DEV) up -d
	@echo "$(GREEN)✓ All services started$(NC)"

.PHONY: stop
stop: ## Stop all services
	@echo "$(CYAN)Stopping all services...$(NC)"
	$(DC_DEV) down
	@echo "$(GREEN)✓ All services stopped$(NC)"

.PHONY: restart
restart: stop start ## Restart all services
	@echo "$(GREEN)✓ All services restarted$(NC)"

.PHONY: restart-api
restart-api: ## Restart API service only
	@echo "$(CYAN)Restarting API service...$(NC)"
	$(DC_DEV) restart api
	@echo "$(GREEN)✓ API service restarted$(NC)"

.PHONY: watch
watch: ## Watch mode for development
	$(TURBO) run dev --parallel

# ============================================
# BUILDING
# ============================================

.PHONY: build
build: ## Build all applications
	@echo "$(CYAN)Building all applications...$(NC)"
	$(TURBO) run build
	@echo "$(GREEN)✓ Build complete$(NC)"

.PHONY: build-api
build-api: ## Build API application only
	@echo "$(CYAN)Building API...$(NC)"
	cd apps/api && $(NPM) run build
	@echo "$(GREEN)✓ API build complete$(NC)"

.PHONY: build-landing
build-landing: ## Build Landing application only
	@echo "$(CYAN)Building Landing...$(NC)"
	cd apps/landing && $(NPM) run build
	@echo "$(GREEN)✓ Landing build complete$(NC)"

.PHONY: build-studio
build-studio: ## Build Studio application only
	@echo "$(CYAN)Building Studio...$(NC)"
	cd apps/studio && $(NPM) run build
	@echo "$(GREEN)✓ Studio build complete$(NC)"

.PHONY: build-admin
build-admin: ## Build Admin application only
	@echo "$(CYAN)Building Admin...$(NC)"
	cd apps/admin && $(NPM) run build
	@echo "$(GREEN)✓ Admin build complete$(NC)"

.PHONY: build-packages
build-packages: ## Build all shared packages
	@echo "$(CYAN)Building shared packages...$(NC)"
	$(TURBO) run build --filter='./packages/*'
	@echo "$(GREEN)✓ Packages build complete$(NC)"

.PHONY: build-docker
build-docker: ## Build all Docker images
	@echo "$(CYAN)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --parallel
	@echo "$(GREEN)✓ Docker images built$(NC)"

.PHONY: build-docker-nocache
build-docker-nocache: ## Build Docker images without cache
	@echo "$(CYAN)Building Docker images (no cache)...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache --parallel
	@echo "$(GREEN)✓ Docker images built$(NC)"

# ============================================
# TESTING
# ============================================

.PHONY: test
test: ## Run full test suite with coverage
	@echo "$(CYAN)Running full test suite...$(NC)"
	$(TURBO) run test
	@echo "$(GREEN)✓ Tests complete$(NC)"

.PHONY: test-unit
test-unit: ## Run unit tests only
	@echo "$(CYAN)Running unit tests...$(NC)"
	$(TURBO) run test:unit
	@echo "$(GREEN)✓ Unit tests complete$(NC)"

.PHONY: test-integration
test-integration: ## Run integration tests only
	@echo "$(CYAN)Running integration tests...$(NC)"
	$(TURBO) run test:integration
	@echo "$(GREEN)✓ Integration tests complete$(NC)"

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(CYAN)Running e2e tests...$(NC)"
	$(TURBO) run test:e2e
	@echo "$(GREEN)✓ E2E tests complete$(NC)"

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	$(TURBO) run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	@echo "$(CYAN)Running tests with coverage...$(NC)"
	$(TURBO) run test:coverage
	@echo "$(GREEN)✓ Coverage report generated$(NC)"

.PHONY: lint
lint: ## Run ESLint on all packages
	@echo "$(CYAN)Running ESLint...$(NC)"
	$(TURBO) run lint
	@echo "$(GREEN)✓ Linting complete$(NC)"

.PHONY: lint-fix
lint-fix: ## Run ESLint and fix issues
	@echo "$(CYAN)Running ESLint with auto-fix...$(NC)"
	$(TURBO) run lint:fix
	@echo "$(GREEN)✓ Lint fixes applied$(NC)"

.PHONY: format
format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code...$(NC)"
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,css,scss}"
	@echo "$(GREEN)✓ Code formatted$(NC)"

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(CYAN)Checking code format...$(NC)"
	npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,css,scss}"
	@echo "$(GREEN)✓ Format check complete$(NC)"

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	@echo "$(CYAN)Running TypeScript type check...$(NC)"
	$(TURBO) run typecheck
	@echo "$(GREEN)✓ Type check complete$(NC)"

.PHONY: check
check: lint typecheck test ## Run all checks (lint, typecheck, test)
	@echo "$(GREEN)✓ All checks passed$(NC)"

# ============================================
# DATABASE
# ============================================

.PHONY: db-generate
db-generate: ## Generate Prisma client
	@echo "$(CYAN)Generating Prisma client...$(NC)"
	cd packages/database && npx prisma generate
	@echo "$(GREEN)✓ Prisma client generated$(NC)"

.PHONY: db-push
db-push: ## Push schema changes to database
	@echo "$(CYAN)Pushing schema to database...$(NC)"
	cd packages/database && npx prisma db push
	@echo "$(GREEN)✓ Schema pushed$(NC)"

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(NC)"
	cd packages/database && npx prisma migrate deploy
	@echo "$(GREEN)✓ Migrations complete$(NC)"

.PHONY: db-migrate-dev
db-migrate-dev: ## Create a new migration
	@echo "$(CYAN)Creating new migration...$(NC)"
	cd packages/database && npx prisma migrate dev
	@echo "$(GREEN)✓ Migration created$(NC)"

.PHONY: db-migrate-reset
db-migrate-reset: ## Reset database and run all migrations
	@echo "$(RED)⚠ This will reset all data. Are you sure? [y/N]$(NC)"
	@read -r confirm && [ "$$confirm" = "y" ] || exit 1
	cd packages/database && npx prisma migrate reset --force
	@echo "$(GREEN)✓ Database reset complete$(NC)"

.PHONY: db-seed
db-seed: ## Seed the database
	@echo "$(CYAN)Seeding database...$(NC)"
	cd packages/database && npx prisma db seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

.PHONY: db-studio
db-studio: ## Open Prisma Studio
	@echo "$(CYAN)Opening Prisma Studio...$(NC)"
	cd packages/database && npx prisma studio

.PHONY: db-status
db-status: ## Check database connection status
	@echo "$(CYAN)Checking database status...$(NC)"
	$(DOCKER_COMPOSE) exec mongo-primary mongosh --eval "rs.status()"
	@echo "$(GREEN)✓ Database is healthy$(NC)"

.PHONY: backup
backup: ## Create database backup
	@echo "$(CYAN)Creating database backup...$(NC)"
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	$(DOCKER_COMPOSE) exec -T mongo-primary mongodump \
		--archive=/tmp/backup_$$TIMESTAMP.gz \
		--gzip \
		--db=plugspace && \
	$(DOCKER_COMPOSE) cp mongo-primary:/tmp/backup_$$TIMESTAMP.gz ./backups/ && \
	echo "$(GREEN)✓ Backup created: backups/backup_$$TIMESTAMP.gz$(NC)"

.PHONY: backup-s3
backup-s3: backup ## Create backup and upload to S3
	@echo "$(CYAN)Uploading backup to S3...$(NC)"
	@LATEST=$$(ls -t backups/*.gz | head -1); \
	aws s3 cp $$LATEST s3://$(S3_BACKUP_BUCKET)/mongodb/ && \
	echo "$(GREEN)✓ Backup uploaded to S3$(NC)"

.PHONY: restore
restore: ## Restore database from backup
	@echo "$(YELLOW)Available backups:$(NC)"
	@ls -la backups/*.gz 2>/dev/null || echo "No backups found"
	@read -p "Enter backup filename: " BACKUP; \
	$(DOCKER_COMPOSE) cp ./backups/$$BACKUP mongo-primary:/tmp/ && \
	$(DOCKER_COMPOSE) exec mongo-primary mongorestore \
		--archive=/tmp/$$BACKUP \
		--gzip \
		--drop && \
	echo "$(GREEN)✓ Database restored$(NC)"

# ============================================
# PRODUCTION
# ============================================

.PHONY: prod
prod: build ## Production deployment with optimizations
	@echo "$(CYAN)Starting production deployment...$(NC)"
	$(DC_PROD) up -d
	@echo "$(GREEN)✓ Production deployment complete$(NC)"

.PHONY: prod-build
prod-build: ## Build production Docker images
	@echo "$(CYAN)Building production images...$(NC)"
	NODE_ENV=production $(DC_PROD) build --parallel
	@echo "$(GREEN)✓ Production images built$(NC)"

.PHONY: prod-start
prod-start: ## Start production environment
	@echo "$(CYAN)Starting production environment...$(NC)"
	$(DC_PROD) up -d
	@echo "$(GREEN)✓ Production environment started$(NC)"

.PHONY: prod-stop
prod-stop: ## Stop production environment
	@echo "$(CYAN)Stopping production environment...$(NC)"
	$(DC_PROD) down
	@echo "$(GREEN)✓ Production environment stopped$(NC)"

.PHONY: prod-restart
prod-restart: ## Restart production environment
	@echo "$(CYAN)Restarting production environment...$(NC)"
	$(DC_PROD) down && $(DC_PROD) up -d
	@echo "$(GREEN)✓ Production environment restarted$(NC)"

.PHONY: deploy
deploy: prod-build prod-start ## Full production deployment
	@echo "$(GREEN)✓ Deployment complete$(NC)"

.PHONY: deploy-rolling
deploy-rolling: ## Rolling deployment with zero downtime
	@echo "$(CYAN)Starting rolling deployment...$(NC)"
	@for service in api landing studio admin; do \
		echo "$(YELLOW)Deploying $$service...$(NC)"; \
		$(DC_PROD) up -d --no-deps --build $$service; \
		sleep 30; \
		$(DC_PROD) exec -T $$service wget -q --spider http://localhost:$$(echo $$service | sed 's/api/4000/;s/landing/3000/;s/studio/3001/;s/admin/3002/')/health || exit 1; \
	done
	@echo "$(GREEN)✓ Rolling deployment complete$(NC)"

.PHONY: scale
scale: ## Horizontal scaling (usage: make scale SERVICE=api COUNT=3)
	@echo "$(CYAN)Scaling $(SERVICE) to $(COUNT) instances...$(NC)"
	$(DC_PROD) up -d --scale $(SERVICE)=$(COUNT)
	@echo "$(GREEN)✓ Scaled $(SERVICE) to $(COUNT) instances$(NC)"

.PHONY: scale-down
scale-down: ## Scale down all services to 1 instance
	@echo "$(CYAN)Scaling down all services...$(NC)"
	$(DC_PROD) up -d --scale api=1 --scale landing=1 --scale studio=1 --scale admin=1
	@echo "$(GREEN)✓ Services scaled down$(NC)"

# ============================================
# SSL CERTIFICATES
# ============================================

.PHONY: ssl-init
ssl-init: ## Initialize SSL certificates with Let's Encrypt
	@echo "$(CYAN)Initializing SSL certificates...$(NC)"
	./infrastructure/scripts/ssl-init.sh
	@echo "$(GREEN)✓ SSL certificates initialized$(NC)"

.PHONY: ssl-renew
ssl-renew: ## Renew SSL certificates
	@echo "$(CYAN)Renewing SSL certificates...$(NC)"
	$(DOCKER_COMPOSE) exec certbot certbot renew
	$(DOCKER_COMPOSE) exec nginx nginx -s reload
	@echo "$(GREEN)✓ SSL certificates renewed$(NC)"

.PHONY: ssl-status
ssl-status: ## Check SSL certificate status
	@echo "$(CYAN)Checking SSL certificate status...$(NC)"
	$(DOCKER_COMPOSE) exec certbot certbot certificates

# ============================================
# MONITORING & LOGS
# ============================================

.PHONY: logs
logs: ## View all service logs
	$(DC_DEV) logs -f

.PHONY: logs-api
logs-api: ## View API logs
	$(DC_DEV) logs -f api

.PHONY: logs-error
logs-error: ## View error logs only
	$(DC_DEV) logs -f 2>&1 | grep -i error

.PHONY: logs-tail
logs-tail: ## Tail last 100 lines of all logs
	$(DC_DEV) logs --tail=100 -f

.PHONY: monitor
monitor: ## Open Grafana monitoring dashboard
	@echo "$(CYAN)Opening Grafana...$(NC)"
	@xdg-open http://localhost:3003 2>/dev/null || open http://localhost:3003 2>/dev/null || echo "Open http://localhost:3003 in browser"

.PHONY: metrics
metrics: ## Show Prometheus metrics
	@echo "$(CYAN)Opening Prometheus...$(NC)"
	@xdg-open http://localhost:9090 2>/dev/null || open http://localhost:9090 2>/dev/null || echo "Open http://localhost:9090 in browser"

.PHONY: health
health: ## Check health of all services
	@echo "$(CYAN)Checking service health...$(NC)"
	@echo ""
	@echo "$(YELLOW)API:$(NC)"
	@curl -sf http://localhost:4000/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Landing:$(NC)"
	@curl -sf http://localhost:3000/api/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Studio:$(NC)"
	@curl -sf http://localhost:3001/api/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Admin:$(NC)"
	@curl -sf http://localhost:3002/api/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)MongoDB:$(NC)"
	@$(DOCKER_COMPOSE) exec -T mongo-primary mongosh --quiet --eval "db.adminCommand('ping')" && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Redis:$(NC)"
	@$(DOCKER_COMPOSE) exec -T redis-master redis-cli ping 2>/dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"

.PHONY: health-deep
health-deep: ## Deep health check with detailed status
	@echo "$(CYAN)Running deep health check...$(NC)"
	./infrastructure/scripts/health-check.sh

.PHONY: status
status: ## Show status of all containers
	@echo "$(CYAN)Container Status:$(NC)"
	@$(DOCKER_COMPOSE) ps

# ============================================
# SECURITY
# ============================================

.PHONY: security-scan
security-scan: ## Security vulnerability scanning
	@echo "$(CYAN)Running security scan...$(NC)"
	@echo ""
	@echo "$(YELLOW)Checking npm dependencies...$(NC)"
	npm audit
	@echo ""
	@echo "$(YELLOW)Scanning Docker images...$(NC)"
	@command -v trivy >/dev/null 2>&1 && { \
		trivy image plugspace-api:latest; \
		trivy image plugspace-landing:latest; \
		trivy image plugspace-studio:latest; \
		trivy image plugspace-admin:latest; \
	} || echo "$(YELLOW)⚠ Install Trivy for Docker image scanning$(NC)"
	@echo "$(GREEN)✓ Security scan complete$(NC)"

.PHONY: security-audit
security-audit: ## Run full security audit
	@echo "$(CYAN)Running full security audit...$(NC)"
	@echo ""
	@echo "$(YELLOW)NPM Audit:$(NC)"
	npm audit --audit-level=moderate
	@echo ""
	@echo "$(YELLOW)License Check:$(NC)"
	npx license-checker --summary || true
	@echo ""
	@echo "$(YELLOW)Outdated Packages:$(NC)"
	npm outdated || true
	@echo "$(GREEN)✓ Security audit complete$(NC)"

.PHONY: security-fix
security-fix: ## Attempt to fix security vulnerabilities
	@echo "$(CYAN)Attempting to fix vulnerabilities...$(NC)"
	npm audit fix
	@echo "$(GREEN)✓ Security fixes applied$(NC)"

.PHONY: audit-deps
audit-deps: ## Audit npm dependencies
	@echo "$(CYAN)Auditing dependencies...$(NC)"
	npm audit --json > audit-report.json || true
	@echo "$(GREEN)✓ Audit report generated: audit-report.json$(NC)"

# ============================================
# PERFORMANCE
# ============================================

.PHONY: performance-test
performance-test: ## Run load testing
	@echo "$(CYAN)Running performance tests...$(NC)"
	@command -v k6 >/dev/null 2>&1 && { \
		k6 run infrastructure/k6/load-test.js; \
	} || { \
		echo "$(YELLOW)⚠ Install k6 for load testing: https://k6.io/docs/getting-started/installation/$(NC)"; \
	}

.PHONY: benchmark
benchmark: ## Run API benchmarks
	@echo "$(CYAN)Running benchmarks...$(NC)"
	@command -v wrk >/dev/null 2>&1 && { \
		wrk -t12 -c400 -d30s http://localhost:4000/health; \
	} || { \
		echo "$(YELLOW)⚠ Install wrk for benchmarking$(NC)"; \
	}

# ============================================
# CLEANUP
# ============================================

.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(NC)"
	rm -rf dist .next .turbo coverage
	find . -name "*.log" -type f -delete
	find . -name ".DS_Store" -type f -delete
	@echo "$(GREEN)✓ Build artifacts cleaned$(NC)"

.PHONY: clean-deps
clean-deps: ## Remove all node_modules
	@echo "$(CYAN)Removing node_modules...$(NC)"
	rm -rf node_modules packages/*/node_modules apps/*/node_modules
	@echo "$(GREEN)✓ Dependencies removed$(NC)"

.PHONY: clean-docker
clean-docker: ## Remove Docker containers and images
	@echo "$(CYAN)Removing Docker containers and images...$(NC)"
	$(DOCKER_COMPOSE) down -v --rmi local
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"

.PHONY: clean-all
clean-all: clean clean-deps clean-docker ## Deep clean everything
	@echo "$(GREEN)✓ Full cleanup complete$(NC)"

.PHONY: prune
prune: ## Prune Docker system
	@echo "$(CYAN)Pruning Docker system...$(NC)"
	docker system prune -af --volumes
	@echo "$(GREEN)✓ Docker system pruned$(NC)"

.PHONY: reset
reset: clean-all setup ## Full reset and fresh setup
	@echo "$(GREEN)✓ Reset complete$(NC)"

# ============================================
# DOCKER UTILITIES
# ============================================

.PHONY: shell-api
shell-api: ## Open shell in API container
	$(DOCKER_COMPOSE) exec api sh

.PHONY: shell-mongo
shell-mongo: ## Open MongoDB shell
	$(DOCKER_COMPOSE) exec mongo-primary mongosh

.PHONY: shell-redis
shell-redis: ## Open Redis CLI
	$(DOCKER_COMPOSE) exec redis-master redis-cli

.PHONY: ps
ps: ## List running containers
	$(DOCKER_COMPOSE) ps

.PHONY: images
images: ## List Docker images
	docker images | grep plugspace

.PHONY: volumes
volumes: ## List Docker volumes
	docker volume ls | grep plugspace

# ============================================
# VERSION & INFO
# ============================================

.PHONY: version
version: ## Show version information
	@echo "$(CYAN)Plugspace.io Titan$(NC)"
	@echo "Version: $(VERSION)"
	@echo "Node.js: $$(node -v)"
	@echo "npm: $$(npm -v)"
	@echo "Docker: $$(docker -v)"
	@echo "Docker Compose: $$(docker compose version)"

.PHONY: info
info: ## Show project information
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║              PLUGSPACE.IO TITAN v$(VERSION)                      ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Project:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Version:$(NC) $(VERSION)"
	@echo "$(YELLOW)Environment:$(NC) $(NODE_ENV)"
	@echo ""
	@echo "$(MAGENTA)Services:$(NC)"
	@echo "  • Landing Page:  http://localhost:3000"
	@echo "  • User Studio:   http://localhost:3001"
	@echo "  • Admin Panel:   http://localhost:3002"
	@echo "  • API Server:    http://localhost:4000"
	@echo "  • Grafana:       http://localhost:3003"
	@echo "  • Prometheus:    http://localhost:9090"
	@echo ""
	@echo "$(MAGENTA)Documentation:$(NC)"
	@echo "  • API Docs:      http://localhost:4000/docs"
	@echo "  • Prisma Studio: make db-studio"
	@echo ""
