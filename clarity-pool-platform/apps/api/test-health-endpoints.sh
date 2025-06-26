#!/bin/bash

echo "🏥 Testing Health Check Endpoints"
echo "=================================="

BASE_URL="http://localhost:3000"

# Basic health check
echo -e "\n1. Basic health check (/health):"
curl -s "$BASE_URL/health" | jq '.'

# Detailed health with all checks
echo -e "\n2. Detailed health status (/health/detailed):"
curl -s "$BASE_URL/health/detailed" | jq '.'

# Kubernetes liveness probe
echo -e "\n3. Kubernetes liveness probe (/health/live):"
curl -s "$BASE_URL/health/live" | jq '.'

# Kubernetes readiness probe
echo -e "\n4. Kubernetes readiness probe (/health/ready):"
curl -s "$BASE_URL/health/ready" | jq '.'

# Kubernetes startup probe
echo -e "\n5. Kubernetes startup probe (/health/startup):"
curl -s "$BASE_URL/health/startup" | jq '.'

# Monitoring dashboard (requires auth in production)
echo -e "\n6. Monitoring dashboard (/api/monitoring/dashboard):"
curl -s "$BASE_URL/api/monitoring/dashboard" | jq '.'

echo -e "\n✅ Health endpoint test complete!"