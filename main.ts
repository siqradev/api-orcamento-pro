// main.ts
// Ponto de entrada da aplicação — APENAS configuração do Fastify
// Toda lógica de negócio e injeção de dependências ficam nas rotas

import 'dotenv/config'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

import { verifyApiKey } from './src/infra/http/middlewares/verify-api-key'
import { routes } from './src/infra/http/routes'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
  // 5 minutos para imports grandes (SINAPI tem 6000+ itens)
  connectionTimeout: 300_000,
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

app.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
    files: 1,
  },
})

// ─── Autenticação global ──────────────────────────────────────────────────────
// Todas as rotas exigem x-api-key, exceto /health (skipAuth: true)

app.addHook('preHandler', async (request, reply) => {
  // Pula auth para rotas marcadas com skipAuth
  if ((request.routeOptions?.config as any)?.skipAuth) return
  return verifyApiKey(request, reply)
})

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.register(routes)

// ─── Handler de erros não tratados ───────────────────────────────────────────

app.setErrorHandler((error:any, _request, reply) => {
  app.log.error(error)
  reply.status(error.statusCode ?? 500).send({
    error: error.message ?? 'Erro interno no servidor.',
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3000)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 API OrcaBuild Pro rodando em http://localhost:${port}`)
  } catch (err:any) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
