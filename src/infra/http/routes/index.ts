// src/infra/http/routes/index.ts  — Fase 2
// Adiciona compositionsRoutes ao registro

import { FastifyInstance }      from 'fastify'
import { healthRoutes }         from './health.routes'
import { itemsRoutes }          from './items.routes'
import { importRoutes }         from './import.routes'
import { compositionsRoutes }   from './compositions.routes'

export async function routes(app: FastifyInstance) {
  await app.register(healthRoutes)        // GET /health        (sem auth)
  await app.register(itemsRoutes)         // GET /items/*       (auth)
  await app.register(importRoutes)        // POST /import       (auth)
  await app.register(compositionsRoutes)  // GET /compositions/* (auth)
}
