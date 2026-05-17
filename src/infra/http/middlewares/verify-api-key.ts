// src/infra/http/middlewares/verify-api-key.ts
// Hook Fastify: valida o header x-api-key antes de qualquer rota protegida

import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../../database/prisma'
import bcrypt from 'bcryptjs'

export async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers[
    'x-api-key'
  ] as string | undefined

  // ───────────────────────────────────────────
  // Header obrigatório
  // ───────────────────────────────────────────

  if (!apiKey) {
    return reply
      .status(401)
      .send({
        error:
          'API Key ausente. Forneça o header x-api-key.',
      })
  }

  // ───────────────────────────────────────────
  // MASTER API KEY (.env)
  // ───────────────────────────────────────────

  if (
    apiKey ===
    process.env.MASTER_API_KEY
  ) {
    console.log(
      '[AUTH] MASTER API KEY AUTORIZADA'
    )

    return
  }

  try {
    // ─────────────────────────────────────────
    // Busca todas as API Keys ativas
    // ─────────────────────────────────────────

    const keys =
      await prisma.apiKey.findMany({
        where: {
          active: true,
        },

        select: {
          hash: true,
        },
      })

    // ─────────────────────────────────────────
    // Compara HASH
    // ─────────────────────────────────────────

    for (const key of keys) {
      const valid =
        await bcrypt.compare(
          apiKey,
          key.hash
        )

      if (valid) {
        console.log(
          '[AUTH] API KEY AUTORIZADA'
        )

        return
      }
    }

    // ─────────────────────────────────────────
    // Nenhuma chave válida
    // ─────────────────────────────────────────

    return reply
      .status(403)
      .send({
        error:
          'API Key inválida ou inativa.',
      })
  } catch (error: any) {
    console.error(
      '[verifyApiKey] Erro ao verificar chave:',
      error
    )

    return reply
      .status(500)
      .send({
        error:
          'Erro interno ao verificar autenticação.',
      })
  }
}