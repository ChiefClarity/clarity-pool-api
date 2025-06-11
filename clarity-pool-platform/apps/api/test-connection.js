const { Client } = require('pg');

// Try direct connection on port 5432
const connectionString = 'postgresql://postgres.bzfvgebbhadptkgczeyj:[myMcec-zokxig-0fypsy]@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Current time from database:', res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Full error:', err);
  }
}

testConnection();