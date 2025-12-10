#!/bin/sh

# ==============================================
# PLUGSPACE.IO TITAN v1.4 - DOCKER HEALTH CHECK
# ==============================================

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Check API
API_STATUS=$(curl -sf http://api:4000/health > /dev/null 2>&1 && echo "OK" || echo "FAIL")

# Check MongoDB
MONGO_STATUS=$(curl -sf http://mongo-primary:27017 > /dev/null 2>&1 && echo "OK" || echo "FAIL")

# Check Redis
REDIS_STATUS=$(redis-cli -h redis-master ping > /dev/null 2>&1 && echo "OK" || echo "FAIL")

# Log results
echo "[$TIMESTAMP] Health Check Results:"
echo "  API: $API_STATUS"
echo "  MongoDB: $MONGO_STATUS"
echo "  Redis: $REDIS_STATUS"

# Exit with error if any service is down
if [ "$API_STATUS" = "FAIL" ] || [ "$MONGO_STATUS" = "FAIL" ] || [ "$REDIS_STATUS" = "FAIL" ]; then
    exit 1
fi

exit 0
