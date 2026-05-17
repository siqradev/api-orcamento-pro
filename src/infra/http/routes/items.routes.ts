// src/infra/http/routes/items.routes.ts

import { FastifyInstance } from 'fastify'
import { prisma } from '../../database/prisma'
import { PrismaItemsRepository } from '../../database/PrismaItemsRepository'
import { GetItemUseCase }    from '../../../application/use-cases/GetItemUseCase'
import { ListItemsUseCase }  from '../../../application/use-cases/ListItemsUseCase'
import { SearchItemsUseCase } from '../../../application/use-cases/SearchItemsUseCase'
import { GetItemController }    from '../controllers/GetItemController'
import { ListItemsController }  from '../controllers/ListItemsController'
import { SearchItemsController } from '../controllers/SearchItemsController'

export async function itemsRoutes(app: FastifyInstance) {
  const repository = new PrismaItemsRepository(prisma)

  const getItemController = new GetItemController(
    new GetItemUseCase(repository)
  )
  const listItemsController = new ListItemsController(
    new ListItemsUseCase(repository)
  )
  const searchItemsController = new SearchItemsController(
    new SearchItemsUseCase(repository)
  )

  // GET /items?page=1&limit=20&type=INSUMO&source=SINAPI&state=CE&year=2026
  app.get('/items', (req, reply) =>
    listItemsController.handle(req, reply)
  )

  // GET /items/search?q=cimento&source=SINAPI
  app.get('/items/search', (req, reply) =>
    searchItemsController.handle(req, reply)
  )

  // GET /items/:code?tableId=<uuid>
  app.get('/items/:code', (req, reply) =>
    getItemController.handle(req, reply)
  )
}