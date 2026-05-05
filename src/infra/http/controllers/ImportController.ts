import fs from 'fs'
import path from 'path'
import { FastifyReply, FastifyRequest } from 'fastify'
import { pipeline } from 'stream/promises'
import { ImportTableUseCase } from '../../../application/use-cases/ImportTableUseCase'

export class ImportController {
  constructor(
    private importTableUseCase: ImportTableUseCase
  ) {}

  async handle(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const parts = request.parts()

      let filePath = ''
      const fields: Record<string, any> = {}

      for await (const part of parts) {
        if (part.type === 'file') {
          const savePath = path.resolve(
            process.cwd(),
            'temp',
            part.filename
          )

          await pipeline(
            part.file,
            fs.createWriteStream(savePath)
          )

          filePath = savePath
        } else {
          fields[part.fieldname] = part.value
        }
      }

      if (!filePath) {
        return reply.status(400).send({
          error: 'Nenhum arquivo enviado.'
        })
      }

      const result =
        await this.importTableUseCase.execute({
          filePath,
          source: fields.source,
          state: fields.state,
          month: Number(fields.month),
          year: Number(fields.year),
          type: fields.type
        })

      return reply.status(201).send(result)
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Falha na importação',
        details: error.message
      })
    }
  }
}