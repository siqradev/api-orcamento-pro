// src/infra/http/routes/compositions.routes.ts

import { FastifyInstance }                from 'fastify'
import { prisma }                         from '../../database/prisma'
import { PrismaItemsRepository }          from '../../database/PrismaItemsRepository'
import { PrismaCompositionsRepository }   from '../../database/PrismaCompositionsRepository'
import { ResolveCompositionUseCase }      from '../../../application/use-cases/ResolveCompositionUseCase'
import { CompositionsController }         from '../controllers/CompositionsController'

export async function compositionsRoutes(app: FastifyInstance) {
  const itemsRepo        = new PrismaItemsRepository(prisma)
  const compositionsRepo = new PrismaCompositionsRepository(prisma)

  const resolveUseCase = new ResolveCompositionUseCase(itemsRepo, compositionsRepo)
  const controller     = new CompositionsController(resolveUseCase, compositionsRepo)

  /**
   * GET /compositions/:code/resolve?tableId=<uuid>&qty=1
   *
   * Retorna a árvore completa da composição com custo calculado.
   * Exemplo: GET /compositions/C1629/resolve?tableId=<uuid>&qty=50
   *
   * Response:
   * {
   *   code: "C1629",
   *   description: "LIMPEZA DE MOSAICO VIDROSO",
   *   unit: "M2",
   *   totalCost: 621.50,
   *   breakdown: { material: 114.80, maoDeObra: 506.50, equipamento: 0, outros: 0.20 },
   *   tree: { ...nó raiz com filhos recursivos }
   * }
   */
  app.get('/compositions/:code/resolve', (req, reply) =>
    controller.resolve(req, reply)
  )

  /**
   * GET /compositions/:code/children?tableId=<uuid>
   * Retorna filhos diretos (não recursivo) de uma composição.
   */
  app.get('/compositions/:code/children', (req, reply) =>
    controller.children(req, reply)
  )

  /**
   * GET /compositions/:code/parents?tableId=<uuid>
   * Retorna todas as composições que usam este item.
   */
  app.get('/compositions/:code/parents', (req, reply) =>
    controller.parents(req, reply)
  )
}
