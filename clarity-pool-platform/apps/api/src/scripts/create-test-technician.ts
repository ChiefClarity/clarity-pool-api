import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function createTestTechnician() {
  console.log('🔄 Creating test technician...\n');

  try {
    // Check if test technician already exists
    const existingTech = await prisma.technician.findFirst({
      where: { email: 'test@claritypool.com' },
    });

    if (existingTech) {
      console.log('⚠️  Test technician already exists!');
      console.log('📧 Email: test@claritypool.com');
      console.log('🔑 Password: test123');
      console.log(`🆔 ID: ${existingTech.id}`);
      return;
    }

    // Create test technician
    const hashedPassword = await bcrypt.hash('test123', 10);

    const technician = await prisma.technician.upsert({
      where: { email: 'test@claritypool.com' },
      update: {
        firstName: 'Test',
        lastName: 'Technician',
        name: 'Test Technician',
        passwordHash: hashedPassword,
        active: true,
      },
      create: {
        email: 'test@claritypool.com',
        firstName: 'Test',
        lastName: 'Technician',
        name: 'Test Technician',
        passwordHash: hashedPassword,
        phone: '555-0123',
        active: true,
      },
    });

    console.log('✅ Test technician created successfully!');
    console.log('\n📋 Test Technician Details:');
    console.log('📧 Email: test@claritypool.com');
    console.log('🔑 Password: test123');
    console.log(`🆔 ID: ${technician.id}`);
    console.log('\n🚀 You can now login with these credentials!');
  } catch (error) {
    console.error('❌ Failed to create test technician:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestTechnician().catch(console.error);
