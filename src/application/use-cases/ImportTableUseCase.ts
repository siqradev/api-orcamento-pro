import { spawn } from 'child_process'
import path from 'path'
import { prisma } from '../../infra/database/prisma'

import { SinapiScraper } from '../../infra/scrapers/SinapiScraper'
import { PrismaItemsRepository } from '../../infra/database/PrismaItemsRepository'
import { CreateItemDTO } from '../../domain/dtos/CreateItemDTO'

interface ImportRequest {
  filePath: string
  source: 'SINAPI' | 'SEINFRA'
  state: string
  month: number
  year: number
  type: 'DESONERADA' | 'ONERADA'
}

export class ImportTableUseCase {
  constructor(
    private scraper: SinapiScraper,
    private repository: PrismaItemsRepository
  ) {}

  async execute(data: ImportRequest) {
    const referenceTable = await prisma.referenceTable.upsert({
      where: {
        source_state_month_year_type: {
          source: data.source,
          state: data.state,
          month: data.month,
          year: data.year,
          type: data.type
        }
      },
      update: {},
      create: {
        source: data.source,
        state: data.state,
        month: data.month,
        year: data.year,
        type: data.type
      }
    })

    const parsedData = await this.runPythonParser(
      data.filePath,
      data.source,
      referenceTable.id
    )

    console.log(
      `[Import] Inserindo ${parsedData.length} registros...`
    )

    await this.repository.bulkInsert(parsedData)

    return {
      message: 'Importação concluída com sucesso',
      tableId: referenceTable.id,
      count: parsedData.length
    }
  }

  private async runPythonParser(
    filePath: string,
    source: string,
    referenceTableId: string
  ): Promise<CreateItemDTO[]> {
    return new Promise((resolve, reject) => {
      const dataType =
        source === 'SEINFRA'
          ? 'INSUMOS'
          : 'ANALITICO'

      const pythonProcess = spawn('python3', [
        path.resolve(
          process.cwd(),
          'UniversalParser.py'
        ),
        filePath,
        source,
        dataType,
        referenceTableId
      ])

      let result = ''
      let error = ''

      pythonProcess.stdout.on(
        'data',
        (data) => (result += data.toString())
      )

      pythonProcess.stderr.on(
        'data',
        (data) => (error += data.toString())
      )

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(
              `Python process failed: ${error}`
            )
          )
        }

        try {
          resolve(JSON.parse(result))
        } catch {
          reject(
            new Error(
              'Falha ao interpretar JSON do parser'
            )
          )
        }
      })
    })
  }
}
