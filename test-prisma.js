const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clienti = await prisma.cliente.findMany();
  console.log(clienti);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
