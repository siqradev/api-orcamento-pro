// src/infra/http/controllers/GetItemController.ts
// Controller limpo: recebe requisição → delega ao UseCase → devolve resposta
// ZERO dependência de Prisma aqui

import { FastifyRequest, FastifyReply } from 'fastify'
import { GetItemUseCase } from '../../../application/use-cases/GetItemUseCase'

interface GetItemParams {
  code: string
}

interface GetItemQuery {
  tableId?: string
}

export class GetItemController {
  constructor(private readonly useCase: GetItemUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const { code } = request.params as GetItemParams
    const { tableId } = request.query as GetItemQuery

    if (!code || code.trim() === '') {
      return reply.status(400).send({ error: 'Código do item é obrigatório.' })
    }

    if (!tableId) {
      return reply.status(400).send({
        error: 'Parâmetro tableId é obrigatório. Ex: ?tableId=<uuid>',
      })
    }

    const item = await this.useCase.execute(code.trim(), tableId)

    if (!item) {
      return reply.status(404).send({
        error: `Item com código "${code}" não encontrado na tabela ${tableId}.`,
      })
    }

    return reply.status(200).send(item)
  }
}
