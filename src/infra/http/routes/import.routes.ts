// src/infra/http/routes/import.routes.ts — Plano B
//
// Mudança: body não expõe mais "type" — o useCase sempre importa os dois tipos.

import { FastifyInstance }           from 'fastify'
import { prisma }                    from '../../database/prisma'
import { PrismaItemsRepository }     from '../../database/PrismaItemsRepository'
import { PrismaCompositionsRepository } from '../../database/PrismaCompositionsRepository'
import { PrismaImportJobRepository } from '../../database/PrismaImportJobRepository'
import { ImportTableUseCase }        from '../../../application/use-cases/ImportTableUseCase'
import { ImportController }          from '../controllers/ImportController'

export async function importRoutes(app: FastifyInstance) {
  const itemsRepo        = new PrismaItemsRepository(prisma)
  const compositionsRepo = new PrismaCompositionsRepository(prisma)
  const jobRepo          = new PrismaImportJobRepository(prisma)

  const useCase    = new ImportTableUseCase(itemsRepo, compositionsRepo, jobRepo)
  const controller = new ImportController(useCase)

  /**
   * POST /import
   * Body: { source, state?, month, year, filePath?, seinfraFiles? }
   * Cria ONERADA e DESONERADA simultaneamente.
   */
  app.post('/import', async (request, reply) => {
    return controller.handle(request, reply)
  })

  /**
   * GET /import/jobs
   * Lista todos os jobs de importação (mais recentes primeiro).
   */
  app.get('/import/jobs', async (_request, reply) => {
    const jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.status(200).send(jobs)
  })

  /**
   * GET /import/jobs/:id
   * Detalhe de um job específico.
   */
  app.get('/import/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const job = await prisma.importJob.findUnique({ where: { id } })

    if (!job) {
      return reply.status(404).send({ error: `Job ${id} não encontrado.` })
    }

    return reply.status(200).send(job)
  })
}
