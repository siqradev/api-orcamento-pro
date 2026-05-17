// src/application/use-cases/ImportTableUseCase.ts — Plano B
//
// Mudanças vs Fase 2:
//   - ImportRequest não tem mais campo "type" — o UseCase sempre cria
//     ONERADA e DESONERADA de uma vez (uma ReferenceTable cada)
//   - runParser recebe ref_onerada + ref_desonerada e retorna { onerada, desonerada }
//   - ImportResult retorna tableIds: { onerada, desonerada }

import { spawn }   from 'child_process'
import path        from 'path'
import fs          from 'fs'
import AdmZip      from 'adm-zip'

import { IItemsRepository }          from '../../domain/repositories/ItemsRepository'
import { ICompositionsRepository }   from '../../domain/repositories/CompositionsRepository'
import { PrismaImportJobRepository } from '../../infra/database/PrismaImportJobRepository'
import { prisma }                    from '../../infra/database/prisma'
import { CreateItemDTO }             from '../../domain/dtos/CreateItemDTO'
import {
  ParsedCompositionsPayload,
  isCompositionsPayload,
} from '../../domain/dtos/CompositionDTO'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ImportRequest {
  filePath?:     string         // se omitido, scraper faz o download
  seinfraFiles?: SeinfraFileSet // para SEINFRA manual (3 arquivos)
  source:        'SINAPI' | 'SEINFRA'
  state:         string
  month:         number
  year:          number
}

export interface SeinfraFileSet {
  insumos?:     string
  composicoes?: string
  planos?:      string
}

export interface ImportResult {
  jobId:             string
  tableIds:          { onerada: string; desonerada: string }
  itemsCount:        number
  compositionsCount: number
  message:           string
  logs:              ImportLogs
}

export interface ImportLogs {
  source:       string
  state:        string
  reference:    string
  itemsOnerada:        number
  itemsDesonerada:     number
  compositions:        number
  durationMs:          number
}

// ─── Payload dual retornado pelo UniversalParser (SINAPI) ─────────────────────

interface DualPayload {
  onerada:    CreateItemDTO[]
  desonerada: CreateItemDTO[]
}

function isDualPayload(data: unknown): data is DualPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'onerada'    in data &&
    'desonerada' in data &&
    Array.isArray((data as DualPayload).onerada) &&
    Array.isArray((data as DualPayload).desonerada)
  )
}

// ─── UseCase ──────────────────────────────────────────────────────────────────

export class ImportTableUseCase {
  constructor(
    private readonly itemsRepository:        IItemsRepository,
    private readonly compositionsRepository: ICompositionsRepository,
    private readonly jobRepository:          PrismaImportJobRepository
  ) {}

  async execute(data: ImportRequest): Promise<ImportResult> {
    const startedAt = Date.now()
    const reference = `${String(data.month).padStart(2, '0')}/${data.year}`

    // 1. Cria ImportJob → PENDING
    const job = await this.jobRepository.create({
      source: data.source,
      state:  data.state,
      month:  data.month,
      year:   data.year,
      type:   'ONERADA', // campo obrigatório no schema — valor simbólico para job dual
    })

    console.log(`[IMPORT] Job ${job.id} criado — PENDING`)

    try {
      await this.jobRepository.markAsRunning(job.id)

      // 2. Upsert das DUAS ReferenceTables de uma vez
      const [tableOnerada, tableDesonerada] = await Promise.all([
        prisma.referenceTable.upsert({
          where: {
            source_state_month_year_type: {
              source: data.source,
              state:  data.state,
              month:  data.month,
              year:   data.year,
              type:   'ONERADA',
            },
          },
          update: {
            reference,
            description: `Tabela ${data.source} ${reference} — ${data.state} (ONERADA)`,
          },
          create: {
            source:      data.source,
            state:       data.state,
            month:       data.month,
            year:        data.year,
            type:        'ONERADA',
            reference,
            description: `Tabela ${data.source} ${reference} — ${data.state} (ONERADA)`,
          },
        }),
        prisma.referenceTable.upsert({
          where: {
            source_state_month_year_type: {
              source: data.source,
              state:  data.state,
              month:  data.month,
              year:   data.year,
              type:   'DESONERADA',
            },
          },
          update: {
            reference,
            description: `Tabela ${data.source} ${reference} — ${data.state} (DESONERADA)`,
          },
          create: {
            source:      data.source,
            state:       data.state,
            month:       data.month,
            year:        data.year,
            type:        'DESONERADA',
            reference,
            description: `Tabela ${data.source} ${reference} — ${data.state} (DESONERADA)`,
          },
        }),
      ])

      console.log(`[IMPORT] ReferenceTable ONERADA:    ${tableOnerada.id}`)
      console.log(`[IMPORT] ReferenceTable DESONERADA: ${tableDesonerada.id}`)

      let itemsOnerada    = 0
      let itemsDesonerada = 0
      let totalCompositions = 0

      // ── SINAPI ──────────────────────────────────────────────────────────────
      if (data.source === 'SINAPI') {
        let filePath = data.filePath ?? ''

        if (!filePath) {
          filePath = await this.runScraper(data)
        }
        if (filePath.endsWith('.zip')) {
          filePath = await this.extractXlsxFromZip(filePath, data.month, data.year)
        }

        // Parser retorna { onerada: [...], desonerada: [...] }
        const parsed = await this.runParserDual(
          filePath,
          'SINAPI',
          'SINAPI',
          tableOnerada.id,
          tableDesonerada.id
        )

        if (!isDualPayload(parsed)) {
          throw new Error('Parser SINAPI não retornou payload dual { onerada, desonerada }.')
        }

        await Promise.all([
          this.itemsRepository.bulkInsert(parsed.onerada),
          this.itemsRepository.bulkInsert(parsed.desonerada),
        ])

        itemsOnerada    = parsed.onerada.length
        itemsDesonerada = parsed.desonerada.length
      }

      // ── SEINFRA ─────────────────────────────────────────────────────────────
      if (data.source === 'SEINFRA') {
        // SEINFRA: onerada e desonerada são arquivos separados — mantém dois
        // conjuntos de chamadas, cada um apontando para sua ReferenceTable
        const [filesOnerada, filesDesonerada] = await Promise.all([
          this.resolveSeinfraFiles(data, 'ONERADA'),
          this.resolveSeinfraFiles(data, 'DESONERADA'),
        ])

        // Onerada
        const resO = await this.importSeinfraFull(filesOnerada, tableOnerada.id)
        itemsOnerada      += resO.items
        totalCompositions += resO.compositions

        // Desonerada
        const resD = await this.importSeinfraFull(filesDesonerada, tableDesonerada.id)
        itemsDesonerada   += resD.items
        totalCompositions += resD.compositions
      }

      const durationMs = Date.now() - startedAt

      const logs: ImportLogs = {
        source:          data.source,
        state:           data.state,
        reference,
        itemsOnerada,
        itemsDesonerada,
        compositions:    totalCompositions,
        durationMs,
      }

      await this.jobRepository.markAsSuccess(
        job.id,
        itemsOnerada + itemsDesonerada,
        JSON.stringify(logs)
      )

      console.log(
        `[IMPORT] Job ${job.id} SUCCESS — ` +
        `onerada:${itemsOnerada} desonerada:${itemsDesonerada} ` +
        `composições:${totalCompositions} em ${durationMs}ms`
      )

      return {
        jobId:             job.id,
        tableIds:          { onerada: tableOnerada.id, desonerada: tableDesonerada.id },
        itemsCount:        itemsOnerada + itemsDesonerada,
        compositionsCount: totalCompositions,
        message:           'Importação concluída com sucesso',
        logs,
      }

    } catch (error: any) {
      await this.jobRepository.markAsFailed(job.id, error.message ?? String(error))
      console.error(`[IMPORT] Job ${job.id} FAILED:`, error.message)
      throw error
    }
  }

  // ─── SEINFRA: insumos + composições + planos para uma tabela ─────────────

  private async importSeinfraFull(
    files: SeinfraFileSet,
    refId: string
  ): Promise<{ items: number; compositions: number }> {
    let items        = 0
    let compositions = 0

    if (files.insumos) {
      const parsed = await this.runParserDual(files.insumos, 'SEINFRA', 'INSUMOS', refId)
      if (Array.isArray(parsed)) {
        await this.itemsRepository.bulkInsert(parsed as CreateItemDTO[])
        items += parsed.length
        console.log(`[IMPORT] SEINFRA insumos: ${parsed.length}`)
      }
    }

    if (files.composicoes) {
      const res = await this.importSeinfraCompositions(files.composicoes, 'COMPOSICOES', refId)
      items        += res.items
      compositions += res.compositions
    }

    if (files.planos) {
      const res = await this.importSeinfraCompositions(files.planos, 'PLANOS', refId)
      items        += res.items
      compositions += res.compositions
    }

    return { items, compositions }
  }

  private async importSeinfraCompositions(
    filePath: string,
    dataType: string,
    refId:    string
  ): Promise<{ items: number; compositions: number }> {
    const parsed = await this.runParserDual(filePath, 'SEINFRA', dataType, refId)

    if (!isCompositionsPayload(parsed)) {
      console.warn(`[IMPORT] Parser ${dataType} não retornou payload de composições`)
      return { items: 0, compositions: 0 }
    }

    const payload = parsed as ParsedCompositionsPayload

    if (payload.items.length > 0) {
      await this.itemsRepository.bulkInsert(payload.items)
    }
    if (payload.compositions.length > 0) {
      await this.compositionsRepository.bulkInsert(payload.compositions, refId)
    }

    console.log(`[IMPORT] ${dataType}: ${payload.items.length} itens, ${payload.compositions.length} relações`)
    return { items: payload.items.length, compositions: payload.compositions.length }
  }

  // ─── Resolve arquivos SEINFRA ─────────────────────────────────────────────

  private async resolveSeinfraFiles(
    data: ImportRequest,
    tipo: 'ONERADA' | 'DESONERADA'
  ): Promise<SeinfraFileSet> {
    if (data.seinfraFiles) return data.seinfraFiles

    const version = tipo === 'DESONERADA' ? '028.1' : '028'
    const root    = process.cwd()
    const python  = this.resolvePython(root)
    const script  = path.resolve(root, 'scraper_seinfra.py')

    const stdout = await this.spawnPython(python, [script, version])
    const result = JSON.parse(stdout)

    if (!result.success) throw new Error(`Scraper SEINFRA falhou: ${result.error}`)

    return {
      insumos:     result.file_insumos,
      composicoes: result.file_composicoes,
      planos:      result.file_planos,
    }
  }

  // ─── Scraper SINAPI ───────────────────────────────────────────────────────

  private async runScraper(data: ImportRequest): Promise<string> {
    const root   = process.cwd()
    const python = this.resolvePython(root)
    const script = path.resolve(root, 'scraper_sinapi.py')

    const stdout = await this.spawnPython(python, [
      script,
      data.state,
      String(data.month).padStart(2, '0'),
      String(data.year),
    ])

    const result = JSON.parse(stdout)
    if (!result.success) throw new Error(`Scraper SINAPI falhou: ${result.error}`)
    return result.excel_path
  }

  // ─── Extração de ZIP ──────────────────────────────────────────────────────

  private async extractXlsxFromZip(zipPath: string, month: number, year: number): Promise<string> {
    console.log('[ZIP] Extraindo...')
    const zip         = new AdmZip(zipPath)
    const extractPath = path.resolve(process.cwd(), 'temp', `sinapi_${year}_${month}`)

    zip.extractAllTo(extractPath, true)

    const files    = fs.readdirSync(extractPath)
    const xlsxFile = files.find(
      (f) =>
        f.toUpperCase().includes('REFERENCIA') &&
        f.toUpperCase().includes('SINAPI') &&
        f.endsWith('.xlsx') &&
        !f.startsWith('~$')
    )

    if (!xlsxFile) throw new Error('SINAPI_Referencia*.xlsx não encontrado no ZIP.')

    const fullPath = path.resolve(extractPath, xlsxFile)
    console.log(`[ZIP] Arquivo: ${xlsxFile}`)
    return fullPath
  }

  // ─── Parser Python — Plano B ──────────────────────────────────────────────

  private async runParserDual(
    filePath:       string,
    source:         string,
    dataType:       string,
    refOnerada:     string,
    refDesonerada?: string
  ): Promise<unknown> {
    const root   = process.cwd()
    const python = this.resolvePython(root)
    const script = path.resolve(root, 'UniversalParser.py')

    const args = [script, filePath, source, dataType, refOnerada]
    if (refDesonerada) args.push(refDesonerada)

    const stdout = await this.spawnPython(python, args)

    try {
      return JSON.parse(stdout)
    } catch {
      throw new Error(
        `Falha ao interpretar JSON do UniversalParser. Início: ${stdout.slice(0, 300)}`
      )
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resolvePython(root: string): string {
    const candidates = [
      path.join(root, '.venv', 'bin', 'python3'),
      path.join(root, '.venv', 'bin', 'python'),
      path.join(root, 'venv', 'bin', 'python3'),
      path.join(root, 'venv', 'bin', 'python'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    console.warn('[Python] .venv não encontrado — usando python3 global')
    return 'python3'
  }

  private spawnPython(pythonPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, args)
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (c) => { stdout += c.toString() })
      proc.stderr.on('data', (c) => {
        stderr += c.toString()
        process.stderr.write(c)
      })
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Python saiu com código ${code}. Stderr: ${stderr.slice(0, 500)}`)
          )
        }
        resolve(stdout.trim())
      })
      proc.on('error', (err) =>
        reject(new Error(`Falha ao iniciar Python: ${err.message}`))
      )
    })
  }
}
