import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function updateTechnicianNames() {
  console.log('🔄 Updating technician with firstName and lastName...\n');

  try {
    // Update existing technician
    const updated = await prisma.technician.update({
      where: { email: 'test@claritypool.com' },
      data: {
        firstName: 'Test',
        lastName: 'Technician',
      },
    });

    console.log('✅ Technician updated successfully!');
    console.log('Updated technician:', {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      name: updated.name,
    });
  } catch (error) {
    console.error('❌ Failed to update technician:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateTechnicianNames().catch(console.error);
