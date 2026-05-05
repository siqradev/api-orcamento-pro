import {
  PrismaClient,
  Source,
  TableType
} from '@prisma/client'

import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter
})


async function main() {
  console.log('🚀 Iniciando seed...')

  const apiKey = await prisma.apiKey.upsert({
    where: {
      key: 'chave-mestra-123'
    },
    update: {},
    create: {
      key: 'chave-mestra-123',
      owner: 'Leandro Siqueira',
      active: true
    }
  })

  const referenceTable =
    await prisma.referenceTable.upsert({
      where: {
        source_state_month_year_type: {
          source: Source.SINAPI,
          state: 'CE',
          month: 3,
          year: 2024,
          type: TableType.DESONERADA
        }
      },
      update: {},
      create: {
        source: Source.SINAPI,
        state: 'CE',
        month: 3,
        year: 2024,
        reference: '03/2024',
        type: TableType.DESONERADA,
        description:
          'Tabela SINAPI Março 2024 - Ceará'
      }
    })

  console.log('✅ API Key criada')
  console.log(apiKey.key)

  console.log('✅ ReferenceTable criada')
  console.log(referenceTable.id)

  console.log(
    'Header: x-api-key = chave-mestra-123'
  )
}

main()
  .catch((error) => {
    console.error('Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })