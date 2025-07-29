import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🔄 Creating admin user...\n');

  // Get password from environment or use default
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.technician.findFirst({
      where: { email: 'petecabrera@getclarity.services' },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email: petecabrera@getclarity.services');
      console.log('🔐 Updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.technician.update({
        where: { id: existingAdmin.id },
        data: { passwordHash: hashedPassword },
      });
      
      console.log('✅ Password updated!');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.technician.create({
      data: {
        email: 'petecabrera@getclarity.services',
        name: 'Pete Cabrera',
        firstName: 'Pete',
        lastName: 'Cabrera',
        passwordHash: hashedPassword,
        phone: '555-0000',
        active: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin User Details:');
    console.log('📧 Email: petecabrera@getclarity.services');
    console.log('🔑 Password:', adminPassword);
    console.log(`🆔 ID: ${admin.id}`);
    console.log('\n🚀 You can now login with these credentials!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser().catch(console.error);