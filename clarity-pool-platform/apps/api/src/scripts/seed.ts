import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  try {
    // Create a test technician with ID 1
    const technician = await prisma.technician.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        email: 'tech@claritypool.com',
        name: 'John Technician',
        phone: '555-0123',
        active: true,
      },
    });
    console.log('Created technician:', technician);
    
    // Create a test customer
    const customer = await prisma.customer.create({
      data: {
        poolbrainId: Math.floor(Math.random() * 10000),
        email: 'customer@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        bookingDate: new Date(),
      },
    });
    console.log('Created customer:', customer);
    
    // Create an onboarding session
    const session = await prisma.onboardingSession.create({
      data: {
        customerId: customer.id,
        technicianId: technician.id,
        scheduledFor: new Date(),
        status: 'SCHEDULED',
      },
    });
    console.log('Created session:', session);
    
    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });