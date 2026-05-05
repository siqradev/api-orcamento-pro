import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../database/prisma'

export class GetItemController {
  async handle(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const { code } = request.params as {
      code: string
    }

    const item = await prisma.item.findFirst({
      where: {
        code
      },
      include: {
        referenceTable: true
      }
    })

    if (!item) {
      return reply.status(404).send({
        error: 'Item não encontrado'
      })
    }

    return reply.send(item)
  }
}