import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function updateUserRoles() {
  console.log('🔄 Updating user roles...\n');
  
  try {
    // Get admin emails from environment
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    
    // Update admin users
    for (const email of adminEmails) {
      const updated = await prisma.technician.updateMany({
        where: { email },
        data: { role: 'admin' }
      });
      
      if (updated.count > 0) {
        console.log(`✅ Updated ${email} to admin role`);
      }
    }
    
    // Ensure all others have technician role
    const technicianCount = await prisma.technician.updateMany({
      where: { 
        OR: [
          { role: { equals: 'technician' } },
          { role: { not: 'admin' } }
        ],
        email: { notIn: adminEmails }
      },
      data: { role: 'technician' }
    });
    
    console.log(`✅ Updated ${technicianCount.count} users to technician role`);
    
    // Show final state
    const users = await prisma.technician.findMany({
      select: { email: true, role: true }
    });
    
    console.log('\n📋 All Users:');
    users.forEach(user => {
      console.log(`   ${user.email} - ${user.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRoles();