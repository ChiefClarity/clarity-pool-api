#!/bin/bash
echo "🔄 Forcing environment reload..."

# Kill all node processes
pkill -f node 2>/dev/null || true

# Clear npm cache
npm cache clean --force 2>/dev/null || true

# Source the Replit environment
source ~/.bashrc 2>/dev/null || true

# Show current DATABASE_URL (masked)
echo "Current DATABASE_URL:"
node -e "const url = process.env.DATABASE_URL; console.log(url ? url.replace(/:[^@]+@/, ':****@') : 'NOT SET');"

# Test connection
echo -e "\n🧪 Testing connection..."
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => { console.log('✅ Connected!'); client.end(); })
  .catch(err => { console.log('❌ Failed:', err.message); });
"