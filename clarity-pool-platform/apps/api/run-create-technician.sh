#!/bin/bash
# Temporary script to create technician securely

# Set the DATABASE_URL (user needs to add their password)
export DATABASE_URL="postgresql://postgres.bzfvgebbhadptkgczeyj:YOUR_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Create the technician
npx ts-node src/scripts/create-real-technician.ts