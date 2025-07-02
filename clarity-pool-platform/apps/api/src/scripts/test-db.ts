import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');

  // Display connection info (masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`📌 DATABASE_URL: ${maskedUrl}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}\n`);

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔄 Attempting to connect to database...');

    // Test connection
    const startTime = Date.now();
    await prisma.$connect();
    const connectionTime = Date.now() - startTime;

    console.log(`✅ Connected successfully in ${connectionTime}ms\n`);

    // Test query
    console.log('🔄 Testing database query...');
    const queryStart = Date.now();
    const result =
      await prisma.$queryRaw`SELECT current_database(), version(), now()`;
    const queryTime = Date.now() - queryStart;

    console.log(`✅ Query executed successfully in ${queryTime}ms`);
    console.log('📊 Database info:', result);

    // Check tables
    console.log('\n🔄 Checking database tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`✅ Found ${(tables as any[]).length} tables:`);
    (tables as any[]).forEach((table) => {
      console.log(`   - ${table.table_name}`);
    });

    // Test Prisma models
    console.log('\n🔄 Testing Prisma models...');
    const customerCount = await prisma.customer.count();
    const technicianCount = await prisma.technician.count();
    const sessionCount = await prisma.onboardingSession.count();

    console.log('📊 Record counts:');
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Technicians: ${technicianCount}`);
    console.log(`   - Onboarding Sessions: ${sessionCount}`);

    console.log('\n✅ All database tests passed!');
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error details:', error);

    if (error instanceof Error) {
      console.error('\n🔍 Error analysis:');

      if (error.message.includes('P1001')) {
        console.error('   - Cannot reach database server');
        console.error('   - Check if DATABASE_URL is correct');
        console.error('   - Verify network connectivity');
      } else if (error.message.includes('P1002')) {
        console.error('   - Database server was reached but timed out');
        console.error('   - Check firewall settings');
      } else if (error.message.includes('P1003')) {
        console.error('   - Database does not exist');
        console.error('   - Create the database first');
      } else if (error.message.includes('P1008')) {
        console.error('   - Operations timed out');
        console.error('   - Check network latency');
      } else if (error.message.includes('P1009')) {
        console.error('   - Database already exists');
      } else if (error.message.includes('P1010')) {
        console.error('   - Access denied');
        console.error('   - Check username and password');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
