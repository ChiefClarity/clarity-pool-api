import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.technician.findUnique({
    where: { email: 'petecabrera@getclarity.services' }
  });
  
  console.log('Admin user exists:', !!admin);
  if (admin) {
    console.log('Admin details:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      hasPassword: !!admin.passwordHash
    });
  }
  
  // Check ADMIN_EMAILS env var
  console.log('\nADMIN_EMAILS:', process.env.ADMIN_EMAILS);
}

checkAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());