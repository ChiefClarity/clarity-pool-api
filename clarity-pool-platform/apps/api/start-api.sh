#!/bin/bash
# Workaround for Replit Secret bug - uses Session Pooler

echo "🚀 Starting API with Session Pooler..."

# Set the Session Pooler URL (user needs to add their password)
export DATABASE_URL="postgresql://postgres.bzfvgebbhadptkgczeyj:puqduv-koFtyq-8rumro@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Start the API
npm run start:dev