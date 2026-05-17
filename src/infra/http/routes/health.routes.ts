// src/infra/http/routes/health.routes.ts

import { FastifyInstance } from 'fastify'
import { prisma } from '../../database/prisma'

export async function healthRoutes(app: FastifyInstance) {
  // Rota pública — não passa pelo verifyApiKey
  app.get(
    '/health',
    { config: { skipAuth: true } },
    async (_request, reply) => {
      // Verifica conectividade real com o banco
      try {
        await prisma.$queryRaw`SELECT 1`

        return reply.status(200).send({
          status: 'ok',
          service: 'api_orcamento_pro',
          database: 'connected',
          timestamp: new Date().toISOString(),
        })
      } catch {
        return reply.status(503).send({
          status: 'degraded',
          service: 'api_orcamento_pro',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
