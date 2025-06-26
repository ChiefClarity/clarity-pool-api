#!/bin/bash

echo "🔍 Testing Database Monitoring Endpoints"
echo "========================================"

BASE_URL="http://localhost:3000/api/monitoring/database"

# 1. Get database stats
echo -e "\n1. Getting database statistics..."
curl -s "$BASE_URL/stats" | jq '.'

# 2. Get slow queries
echo -e "\n2. Checking for slow queries..."
curl -s "$BASE_URL/slow-queries?limit=10" | jq '.'

# 3. Get connection pool stats
echo -e "\n3. Getting connection pool statistics..."
curl -s "$BASE_URL/connection-pool" | jq '.'

# 4. Test performance (requires auth)
echo -e "\n4. Running performance test (requires authentication)..."
echo "   Skipping - requires JWT token"

echo -e "\n✅ Database monitoring test complete!"