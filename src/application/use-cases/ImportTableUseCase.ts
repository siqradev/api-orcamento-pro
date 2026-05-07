import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
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
    console.log('[IMPORT] Iniciando importação...')

    const referenceTable =
      await prisma.referenceTable.upsert({
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

    console.log(
      '[IMPORT] Reference table criada:',
      referenceTable.id
    )

    let filePath = data.filePath

    if (!filePath) {
      console.log(
        '[IMPORT] Baixando tabela SINAPI...'
      )

      filePath =
        await this.scraper.downloadTable(
          data.state,
          String(data.month).padStart(2, '0'),
          String(data.year)
        )
    }

    console.log(
      '[IMPORT] Arquivo recebido:',
      filePath
    )

    if (
      data.source === 'SINAPI' &&
      filePath.endsWith('.zip')
    ) {
      console.log('[ZIP] Abrindo ZIP...')

      const zip = new AdmZip(filePath)

      const extractPath = path.resolve(
        process.cwd(),
        'temp',
        'sinapi_extract'
      )

      zip.extractAllTo(
        extractPath,
        true
      )

      console.log(
        '[ZIP] Extração concluída.'
      )

      const files =
        fs.readdirSync(extractPath)

      console.log(
        '[ZIP] Arquivos encontrados:',
        files
      )

      const xlsxFile = files.find(
        (file) =>
          file.toLowerCase().includes('sinapi_refer') &&
          file.endsWith('.xlsx')
      )


      if (!xlsxFile) {
        throw new Error(
          'Arquivo SINAPI_Referencia não encontrado.'
        )
      }

      filePath = path.resolve(
        extractPath,
        xlsxFile
      )

      console.log(
        '[ZIP] Arquivo referência:',
        filePath
      )
    }

    let parsedData: CreateItemDTO[] = []

    if (data.source === 'SINAPI') {
      const sheets =
        data.type === 'DESONERADA'
          ? ['ISD', 'CSD']
          : ['ICD', 'CCD']

      for (const sheet of sheets) {
        console.log(
          `[PARSER] Processando aba: ${sheet}`
        )

        const partial =
          await this.runPythonParser(
            filePath,
            data.source,
            sheet,
            referenceTable.id
          )

        console.log(
          `[PARSER] ${sheet}: ${partial.length} registros`
        )

        parsedData.push(...partial)
      }
    } else {
      console.log(
        '[PARSER] Processando SEINFRA...'
      )

      parsedData =
        await this.runPythonParser(
          filePath,
          data.source,
          'INSUMOS',
          referenceTable.id
        )
    }

    console.log(
      `[DB] Inserindo ${parsedData.length} registros...`
    )

    await this.repository.bulkInsert(
      parsedData
    )

    console.log(
      '[DB] Inserção concluída.'
    )

    return {
      message:
        'Importação concluída com sucesso',
      tableId: referenceTable.id,
      count: parsedData.length
    }
  }

  private async runPythonParser(
    filePath: string,
    source: string,
    dataType: string,
    referenceTableId: string
  ): Promise<CreateItemDTO[]> {
    return new Promise((resolve, reject) => {
      console.log(
        '[PYTHON] Iniciando parser:',
        dataType
      )

      const pythonProcess = spawn(
        'python3',
        [
          path.resolve(
            process.cwd(),
            'UniversalParser.py'
          ),
          filePath,
          source,
          dataType,
          referenceTableId
        ]
      )

      let result = ''
      let error = ''

      pythonProcess.stdout.on(
        'data',
        (data) => {
          result += data.toString()
        }
      )

      pythonProcess.stderr.on(
        'data',
        (data) => {
          error += data.toString()
        }
      )

      pythonProcess.on(
        'close',
        (code) => {
          console.log(
            '[PYTHON] Finalizado:',
            dataType
          )

          console.log(
            '[PYTHON STDOUT]:',
            result
          )

          console.log(
            '[PYTHON STDERR]:',
            error
          )

          if (code !== 0) {
            return reject(
              new Error(
                `Python process failed: ${error}`
              )
            )
          }

          try {
            resolve(
              JSON.parse(result)
            )
          } catch {
            reject(
              new Error(
                'Falha ao interpretar JSON do parser'
              )
            )
          }
        }
      )
    })
  }
}