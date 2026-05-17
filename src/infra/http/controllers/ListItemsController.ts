// src/infra/http/controllers/ListItemsController.ts

import { FastifyRequest, FastifyReply } from 'fastify'
import { ListItemsUseCase } from '../../../application/use-cases/ListItemsUseCase'
import { SearchFilters } from '../../../domain/repositories/ItemsRepository'

interface ListItemsQuery {
  page?: string
  limit?: string
  type?: 'INSUMO' | 'COMPOSICAO'
  source?: 'SINAPI' | 'SEINFRA'
  tableType?: 'ONERADA' | 'DESONERADA'
  state?: string
  year?: string
  tableId?: string
}

export class ListItemsController {
  constructor(private readonly useCase: ListItemsUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as ListItemsQuery

    const page  = Math.max(1, parseInt(q.page ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '20', 10) || 20))

    const filters: SearchFilters = {
      ...(q.type     && { type: q.type }),
      ...(q.source   && { source: q.source }),
      ...(q.tableType && { tableType: q.tableType }),
      ...(q.state    && { state: q.state.toUpperCase() }),
      ...(q.year     && { year: parseInt(q.year, 10) }),
      ...(q.tableId  && { referenceTableId: q.tableId }),
    }

    const result = await this.useCase.execute(page, limit, filters)

    return reply.status(200).send(result)
  }
}