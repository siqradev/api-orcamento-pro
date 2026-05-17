// scripts/create-api-key.ts

import 'dotenv/config'

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

import { prisma } from '../src/infra/database/prisma'

async function main() {
  // ─────────────────────────────────────
  // Gera API KEY REAL
  // ─────────────────────────────────────

  const apiKey =
    crypto.randomBytes(32).toString('hex')

  // ─────────────────────────────────────
  // Gera HASH
  // ─────────────────────────────────────

  const hash =
    await bcrypt.hash(apiKey, 10)

  // ─────────────────────────────────────
  // Salva no banco
  // ─────────────────────────────────────

  await prisma.apiKey.create({
    data: {
      hash,
      owner: 'Administrador',
      active: true,
    },
  })

  // ─────────────────────────────────────
  // Exibe chave gerada
  // ─────────────────────────────────────

  console.log('\n🔐 API KEY GERADA:\n')
  console.log(apiKey)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })