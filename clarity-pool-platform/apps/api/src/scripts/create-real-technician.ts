import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating REAL test technician in database...');
  
  const hashedPassword = await bcrypt.hash('test123', 10);
  
  try {
    const technician = await prisma.technician.upsert({
      where: { email: 'test@claritypool.com' },
      update: {
        name: 'Test Technician',
        passwordHash: hashedPassword,
        active: true,
      },
      create: {
        email: 'test@claritypool.com',
        name: 'Test Technician',
        passwordHash: hashedPassword,
        phone: '555-0123',
        active: true,
      },
    });
    
    console.log('✅ Real technician created in database:', {
      id: technician.id,
      email: technician.email,
      name: technician.name
    });
    
    // Verify it saved
    const count = await prisma.technician.count();
    console.log(`Total technicians in database: ${count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());