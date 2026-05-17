// src/infra/http/controllers/SearchItemsController.ts

import { FastifyRequest, FastifyReply } from 'fastify'
import { SearchItemsUseCase } from '../../../application/use-cases/SearchItemsUseCase'
import { SearchFilters } from '../../../domain/repositories/ItemsRepository'

interface SearchQuery {
  q?: string
  type?: 'INSUMO' | 'COMPOSICAO'
  source?: 'SINAPI' | 'SEINFRA'
  tableType?: 'ONERADA' | 'DESONERADA'
  state?: string
  year?: string
  tableId?: string
}

export class SearchItemsController {
  constructor(private readonly useCase: SearchItemsUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as SearchQuery

    if (!q.q || q.q.trim().length < 2) {
      return reply.status(400).send({
        error: 'Parâmetro ?q= é obrigatório e precisa ter ao menos 2 caracteres.',
      })
    }

    const filters: SearchFilters = {
      ...(q.type      && { type: q.type }),
      ...(q.source    && { source: q.source }),
      ...(q.tableType && { tableType: q.tableType }),
      ...(q.state     && { state: q.state.toUpperCase() }),
      ...(q.year      && { year: parseInt(q.year, 10) }),
      ...(q.tableId   && { referenceTableId: q.tableId }),
    }

    const items = await this.useCase.execute(q.q.trim(), filters)

    return reply.status(200).send({ results: items, count: items.length })
  }
}