const { Client } = require('pg');

console.log('Testing basic pg connection...');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

client.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    console.log('\nError details:');
    console.log('- Code:', err.code);
    console.log('- errno:', err.errno);
    console.log('- syscall:', err.syscall);
    console.log('- hostname:', err.hostname);
  } else {
    console.log('Connected successfully!');
    client.end();
  }
});