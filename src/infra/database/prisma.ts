// src/infra/database/prisma.ts
// Instância SINGLETON do Prisma com Driver Adapter nativo do PostgreSQL
// Padrão Singleton: apenas uma conexão é criada em todo o ciclo de vida da app

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL não definida no .env')
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Configurações de pool recomendadas para produção
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
})

// Graceful shutdown: fecha a conexão ao encerrar o processo
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
