/*
  Seed Admin iniziale
  node scripts/seed_admin_user.js
*/

const { PrismaClient } = require('@prisma/client')
const { randomBytes, scryptSync } = require('crypto')

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

async function main() {
  const email = 'admin@villaparis.local'
  const password = 'Admin123!'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin già presente:', email)
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: 'ADMIN',
      isActive: true
    }
  })

  console.log('Admin seed completato:', email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
