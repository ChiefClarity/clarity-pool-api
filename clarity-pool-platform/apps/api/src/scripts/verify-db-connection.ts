import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function verifyDatabaseConnection() {
  console.log('🔍 Comprehensive Database Connection Verification\n');
  console.log('='.repeat(60));

  const dbUrl = process.env.DATABASE_URL || '';

  // Parse connection string
  let connectionDetails: any = {};
  try {
    const url = new URL(dbUrl);
    connectionDetails = {
      protocol: url.protocol,
      username: url.username,
      password: '****',
      hostname: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      params: Object.fromEntries(url.searchParams),
    };
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format');
    console.error(
      'Expected format: postgresql://username:password@host:port/database?params',
    );
    return;
  }

  console.log('📌 Connection Details:');
  console.log(JSON.stringify(connectionDetails, null, 2));
  console.log('\n' + '='.repeat(60));

  // Test 1: Raw PostgreSQL connection
  console.log('\n📝 Test 1: Raw PostgreSQL Connection');
  console.log('-'.repeat(40));

  const pgClient = new Client({
    connectionString: dbUrl,
  });

  try {
    console.log('🔄 Attempting raw connection...');
    await pgClient.connect();
    console.log('✅ Raw connection successful!');

    const result = await pgClient.query(
      'SELECT version(), current_database(), now()',
    );
    console.log('📊 Server info:', result.rows[0]);

    await pgClient.end();
  } catch (error) {
    console.error('❌ Raw connection failed:', error);
  }

  // Test 2: Raw connection with SSL
  console.log('\n📝 Test 2: Raw PostgreSQL Connection with SSL');
  console.log('-'.repeat(40));

  const pgClientSSL = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔄 Attempting connection with SSL...');
    await pgClientSSL.connect();
    console.log('✅ SSL connection successful!');
    await pgClientSSL.end();
  } catch (error) {
    console.error('❌ SSL connection failed:', error);
  }

  // Test 3: Prisma connection
  console.log('\n📝 Test 3: Prisma Connection');
  console.log('-'.repeat(40));

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    console.log('🔄 Attempting Prisma connection...');
    await prisma.$connect();
    console.log('✅ Prisma connection successful!');

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 Tables in database:', tables);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Prisma connection failed:', error);

    // Try with different connection string formats
    console.log('\n🔄 Trying alternative connection formats...');

    // Format 1: With ?pgbouncer=true
    const urlWithPgBouncer = dbUrl.includes('?')
      ? `${dbUrl}&pgbouncer=true`
      : `${dbUrl}?pgbouncer=true`;

    const prisma2 = new PrismaClient({
      datasources: {
        db: {
          url: urlWithPgBouncer,
        },
      },
    });

    try {
      await prisma2.$connect();
      console.log('✅ Connection with pgbouncer=true successful!');
      await prisma2.$disconnect();
    } catch (error2) {
      console.error('❌ pgbouncer connection failed');
    }
  }

  // Test 4: Connection recommendations
  console.log('\n📝 Recommendations');
  console.log('-'.repeat(40));

  if (dbUrl.includes('localhost') || dbUrl.includes('mock')) {
    console.log('⚠️  You are using a local/mock database URL');
    console.log('📌 For Supabase, your DATABASE_URL should look like:');
    console.log(
      '   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres',
    );
    console.log('\n📌 You can find this in:');
    console.log('   1. Supabase Dashboard > Settings > Database');
    console.log(
      '   2. Look for "Connection string" under "Connection Pooling"',
    );
    console.log('   3. Use the "Transaction" mode connection string');
  }

  console.log('\n✅ Verification complete!');
}

// Run verification
verifyDatabaseConnection().catch(console.error);
