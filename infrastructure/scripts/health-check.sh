#!/bin/bash

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - HEALTH CHECK SCRIPT
# ==============================================

set -e

# ============ COLORS ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============ CONFIGURATION ============
API_URL="${API_URL:-http://localhost:4000}"
LANDING_URL="${LANDING_URL:-http://localhost:3000}"
STUDIO_URL="${STUDIO_URL:-http://localhost:3001}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3002}"

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

TIMEOUT=5
VERBOSE=false
JSON_OUTPUT=false

# ============ HEALTH STATUS ============
declare -A HEALTH_STATUS
OVERALL_STATUS="healthy"

# ============ FUNCTIONS ============
check_http() {
    local name=$1
    local url=$2
    local endpoint="${3:-/health}"
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url$endpoint" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response" = "200" ]; then
        HEALTH_STATUS["$name"]="healthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GREEN}✓${NC} $name: healthy (${duration}ms)"
        fi
    else
        HEALTH_STATUS["$name"]="unhealthy"
        OVERALL_STATUS="unhealthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${RED}✗${NC} $name: unhealthy (HTTP $response)"
        fi
    fi
}

check_tcp() {
    local name=$1
    local host=$2
    local port=$3
    
    if timeout $TIMEOUT bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
        HEALTH_STATUS["$name"]="healthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GREEN}✓${NC} $name: healthy"
        fi
    else
        HEALTH_STATUS["$name"]="unhealthy"
        OVERALL_STATUS="unhealthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${RED}✗${NC} $name: unhealthy"
        fi
    fi
}

check_docker() {
    local name=$1
    local container=$2
    
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^${container}$"; then
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
        
        if [ "$status" = "healthy" ] || [ "$status" = "unknown" ]; then
            HEALTH_STATUS["$name"]="healthy"
            if [ "$VERBOSE" = true ]; then
                echo -e "${GREEN}✓${NC} $name: $status"
            fi
        else
            HEALTH_STATUS["$name"]="unhealthy"
            OVERALL_STATUS="unhealthy"
            if [ "$VERBOSE" = true ]; then
                echo -e "${RED}✗${NC} $name: $status"
            fi
        fi
    else
        HEALTH_STATUS["$name"]="not_running"
        OVERALL_STATUS="degraded"
        if [ "$VERBOSE" = true ]; then
            echo -e "${YELLOW}⚠${NC} $name: not running"
        fi
    fi
}

check_disk() {
    local threshold=${1:-90}
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        HEALTH_STATUS["disk"]="healthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GREEN}✓${NC} Disk: ${usage}% used"
        fi
    else
        HEALTH_STATUS["disk"]="critical"
        OVERALL_STATUS="unhealthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${RED}✗${NC} Disk: ${usage}% used (critical)"
        fi
    fi
}

check_memory() {
    local threshold=${1:-90}
    local usage=$(free | awk '/Mem:/ {printf("%.0f", $3/$2*100)}')
    
    if [ "$usage" -lt "$threshold" ]; then
        HEALTH_STATUS["memory"]="healthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GREEN}✓${NC} Memory: ${usage}% used"
        fi
    else
        HEALTH_STATUS["memory"]="warning"
        if [ "$OVERALL_STATUS" = "healthy" ]; then
            OVERALL_STATUS="degraded"
        fi
        if [ "$VERBOSE" = true ]; then
            echo -e "${YELLOW}⚠${NC} Memory: ${usage}% used"
        fi
    fi
}

check_cpu() {
    local threshold=${1:-80}
    local usage=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2 + $4)}')
    
    if [ "$usage" -lt "$threshold" ]; then
        HEALTH_STATUS["cpu"]="healthy"
        if [ "$VERBOSE" = true ]; then
            echo -e "${GREEN}✓${NC} CPU: ${usage}% used"
        fi
    else
        HEALTH_STATUS["cpu"]="warning"
        if [ "$OVERALL_STATUS" = "healthy" ]; then
            OVERALL_STATUS="degraded"
        fi
        if [ "$VERBOSE" = true ]; then
            echo -e "${YELLOW}⚠${NC} CPU: ${usage}% used"
        fi
    fi
}

check_ssl() {
    local domain=$1
    local days_threshold=${2:-30}
    
    if [ -z "$domain" ]; then
        return
    fi
    
    local expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)
    
    if [ -n "$expiry" ]; then
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
        local now_epoch=$(date +%s)
        local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        
        if [ "$days_left" -gt "$days_threshold" ]; then
            HEALTH_STATUS["ssl"]="healthy"
            if [ "$VERBOSE" = true ]; then
                echo -e "${GREEN}✓${NC} SSL: $days_left days remaining"
            fi
        else
            HEALTH_STATUS["ssl"]="warning"
            if [ "$OVERALL_STATUS" = "healthy" ]; then
                OVERALL_STATUS="degraded"
            fi
            if [ "$VERBOSE" = true ]; then
                echo -e "${YELLOW}⚠${NC} SSL: $days_left days remaining"
            fi
        fi
    fi
}

output_json() {
    local services=""
    for key in "${!HEALTH_STATUS[@]}"; do
        services="${services}\"${key}\":\"${HEALTH_STATUS[$key]}\","
    done
    services="${services%,}"
    
    echo "{\"status\":\"$OVERALL_STATUS\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"services\":{$services}}"
}

output_text() {
    echo ""
    echo "=============================================="
    echo "PLUGSPACE.IO HEALTH CHECK"
    echo "=============================================="
    echo ""
    echo "Timestamp: $(date)"
    echo ""
    
    echo "Services:"
    for key in "${!HEALTH_STATUS[@]}"; do
        local status="${HEALTH_STATUS[$key]}"
        local color=$GREEN
        local icon="✓"
        
        case $status in
            unhealthy|critical)
                color=$RED
                icon="✗"
                ;;
            warning|degraded|not_running)
                color=$YELLOW
                icon="⚠"
                ;;
        esac
        
        printf "  %-15s %b%s%b %s\n" "$key:" "$color" "$icon" "$NC" "$status"
    done
    
    echo ""
    echo "Overall Status: $OVERALL_STATUS"
    echo ""
}

# ============ USAGE ============
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --verbose       Verbose output"
    echo "  -j, --json          JSON output"
    echo "  -q, --quiet         Quiet mode (exit code only)"
    echo "  --services          Check application services only"
    echo "  --infrastructure    Check infrastructure only"
    echo "  --full              Full health check"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Exit codes:"
    echo "  0 - All healthy"
    echo "  1 - Degraded (some services unhealthy)"
    echo "  2 - Critical (major services down)"
}

# ============ MAIN ============
main() {
    local check_services=true
    local check_infra=true
    local quiet=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            --services)
                check_infra=false
                shift
                ;;
            --infrastructure)
                check_services=false
                shift
                ;;
            --full)
                check_services=true
                check_infra=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    if [ "$VERBOSE" = true ]; then
        echo ""
        echo "Running health checks..."
        echo ""
    fi
    
    # Application services
    if [ "$check_services" = true ]; then
        if [ "$VERBOSE" = true ]; then
            echo "Application Services:"
        fi
        check_http "api" "$API_URL" "/health"
        check_http "landing" "$LANDING_URL" "/api/health"
        check_http "studio" "$STUDIO_URL" "/api/health"
        check_http "admin" "$ADMIN_URL" "/api/health"
        
        if [ "$VERBOSE" = true ]; then
            echo ""
        fi
    fi
    
    # Infrastructure
    if [ "$check_infra" = true ]; then
        if [ "$VERBOSE" = true ]; then
            echo "Infrastructure:"
        fi
        
        # Database services
        check_tcp "mongodb" "$MONGO_HOST" "$MONGO_PORT"
        check_tcp "redis" "$REDIS_HOST" "$REDIS_PORT"
        
        # Docker containers
        if command -v docker &> /dev/null; then
            check_docker "mongo-container" "plugspace-mongo-primary"
            check_docker "redis-container" "plugspace-redis-master"
            check_docker "nginx-container" "plugspace-nginx"
        fi
        
        # System resources
        if [ "$VERBOSE" = true ]; then
            echo ""
            echo "System Resources:"
        fi
        check_disk 90
        check_memory 90
        check_cpu 80
        
        # SSL certificate
        if [ -n "$DOMAIN" ]; then
            if [ "$VERBOSE" = true ]; then
                echo ""
                echo "Security:"
            fi
            check_ssl "$DOMAIN" 30
        fi
    fi
    
    # Output results
    if [ "$quiet" = true ]; then
        # Quiet mode - just exit code
        :
    elif [ "$JSON_OUTPUT" = true ]; then
        output_json
    else
        output_text
    fi
    
    # Exit code
    case $OVERALL_STATUS in
        healthy)
            exit 0
            ;;
        degraded)
            exit 1
            ;;
        unhealthy|critical)
            exit 2
            ;;
    esac
}

# Run main function
main "$@"
