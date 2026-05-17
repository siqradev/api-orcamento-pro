// src/infra/http/controllers/ImportController.ts — Plano B
//
// Mudança: body não tem mais campo "type" — o UseCase cria ONERADA e
// DESONERADA simultaneamente. A resposta retorna tableIds: { onerada, desonerada }.

import { FastifyRequest, FastifyReply } from 'fastify'
import { ImportTableUseCase, ImportRequest } from '../../../application/use-cases/ImportTableUseCase'

interface ImportBody {
  source:     'SINAPI' | 'SEINFRA'
  state?:     string
  month:      number
  year:       number
  filePath?:  string
  seinfraFiles?: {
    insumos?:     string
    composicoes?: string
    planos?:      string
  }
}

export class ImportController {
  constructor(private readonly useCase: ImportTableUseCase) {}

  async handle(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as ImportBody

    // Validações básicas
    if (!body.source || !['SINAPI', 'SEINFRA'].includes(body.source)) {
      return reply.status(400).send({
        error: 'Campo "source" é obrigatório e deve ser "SINAPI" ou "SEINFRA".',
      })
    }

    if (!body.month || body.month < 1 || body.month > 12) {
      return reply.status(400).send({
        error: 'Campo "month" é obrigatório (1–12).',
      })
    }

    if (!body.year || body.year < 2020) {
      return reply.status(400).send({
        error: 'Campo "year" é obrigatório (>= 2020).',
      })
    }

    const importRequest: ImportRequest = {
      source:       body.source,
      state:        body.state ?? 'CE',
      month:        body.month,
      year:         body.year,
      filePath:     body.filePath,
      seinfraFiles: body.seinfraFiles,
    }

    try {
      const result = await this.useCase.execute(importRequest)
      return reply.status(201).send(result)
    } catch (error: any) {
      return reply.status(500).send({
        error:   'Falha na importação.',
        details: error.message,
      })
    }
  }
}
