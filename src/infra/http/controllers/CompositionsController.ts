// src/infra/http/controllers/CompositionsController.ts

import { FastifyRequest, FastifyReply } from 'fastify'
import { ResolveCompositionUseCase } from '../../../application/use-cases/ResolveCompositionUseCase'
import { ICompositionsRepository }   from '../../../domain/repositories/CompositionsRepository'

interface ResolveParams  { code: string }
interface ResolveQuery   { tableId?: string; qty?: string }
interface ChildrenParams { code: string }
interface ChildrenQuery  { tableId?: string }

export class CompositionsController {
  constructor(
    private readonly resolveUseCase:   ResolveCompositionUseCase,
    private readonly compositionsRepo: ICompositionsRepository
  ) {}

  // GET /compositions/:code/resolve?tableId=<uuid>&qty=1
  async resolve(request: FastifyRequest, reply: FastifyReply) {
    const { code }         = request.params as ResolveParams
    const { tableId, qty } = request.query  as ResolveQuery

    if (!tableId) {
      return reply.status(400).send({ error: 'Parâmetro ?tableId= é obrigatório.' })
    }

    const quantity = qty ? parseFloat(qty) : 1
    if (isNaN(quantity) || quantity <= 0) {
      return reply.status(400).send({ error: 'Parâmetro ?qty= deve ser um número positivo.' })
    }

    try {
      const result = await this.resolveUseCase.execute(code, tableId, quantity)
      return reply.status(200).send(result)
    } catch (error: any) {
      if (error.message?.includes('não encontrada')) {
        return reply.status(404).send({ error: error.message })
      }
      throw error
    }
  }

  // GET /compositions/:code/children?tableId=<uuid>
  async children(request: FastifyRequest, reply: FastifyReply) {
    const { code }    = request.params as ChildrenParams
    const { tableId } = request.query  as ChildrenQuery

    if (!tableId) {
      return reply.status(400).send({ error: 'Parâmetro ?tableId= é obrigatório.' })
    }

    const rows = await this.compositionsRepo.findChildren(code, tableId)
    return reply.status(200).send({ code, children: rows, count: rows.length })
  }

  // GET /compositions/:code/parents?tableId=<uuid>
  async parents(request: FastifyRequest, reply: FastifyReply) {
    const { code }    = request.params as ChildrenParams
    const { tableId } = request.query  as ChildrenQuery

    if (!tableId) {
      return reply.status(400).send({ error: 'Parâmetro ?tableId= é obrigatório.' })
    }

    const rows = await this.compositionsRepo.findParents(code, tableId)
    return reply.status(200).send({ code, parents: rows, count: rows.length })
  }
}