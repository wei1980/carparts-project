/**
 * Performance Test Script - Minimal
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  console.log('Testing basic query...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('PASS: Basic query works');
  } catch (err) {
    console.error('FAIL:', err.message);
  }
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});