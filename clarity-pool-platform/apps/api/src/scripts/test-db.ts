import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  try {
    console.log('Testing database connection...');
    
    // Try to count records
    const technicianCount = await prisma.technician.count();
    console.log('✓ Technicians in database:', technicianCount);
    
    const customerCount = await prisma.customer.count();
    console.log('✓ Customers in database:', customerCount);
    
    console.log('\nConnection successful! Now creating test data...');
    
    // Create a simple technician without upsert
    const technician = await prisma.technician.create({
      data: {
        email: `tech-${Date.now()}@claritypool.com`,
        name: 'John Technician',
        phone: '555-0123',
        active: true,
      },
    });
    console.log('✓ Created technician:', technician);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });