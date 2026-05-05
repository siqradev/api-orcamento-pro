import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { parse } from 'csv-parse/sync'
import { CreateItemDTO } from '../../domain/dtos/CreateItemDTO'

export class CsvParser {
  /**
   * Extrai CSV do ZIP do SINAPI
   * e converte para DTO
   */
  async parseSinapi(
    zipPath: string,
    referenceTableId: string
  ): Promise<CreateItemDTO[]> {
    console.log(
      `[Parser] Iniciando extração: ${path.basename(zipPath)}`
    )

    if (!fs.existsSync(zipPath)) {
      throw new Error(
        `Arquivo ZIP não encontrado: ${zipPath}`
      )
    }

    const zip = new AdmZip(zipPath)
    const zipEntries = zip.getEntries()

    const csvEntry = zipEntries.find(
      (entry) =>
        entry.entryName.toUpperCase().includes('INSUMOS') &&
        entry.entryName.toLowerCase().endsWith('.csv')
    )

    if (!csvEntry) {
      throw new Error(
        'CSV de insumos não encontrado dentro do ZIP.'
      )
    }

    const csvContent = csvEntry
      .getData()
      .toString('latin1')

    const records = parse(csvContent, {
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
      from_line: 7
    })

    console.log(
      `[Parser] Processando ${records.length} linhas...`
    )

    return records
      .filter((row: any) => {
        const code = parseInt(row[0])
        return !isNaN(code)
      })
      .map((row: any): CreateItemDTO => ({
        code: String(row[0]).trim(),
        description: String(row[1]).trim(),
        unit: String(row[2]).trim(),
        type: 'INSUMO',
        basePrice: this.parsePrice(row[3]),
        referenceTableId
      }))
  }

  private parsePrice(value: string): number {
    if (!value) return 0

    const cleanValue = value
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()

    const parsed = parseFloat(cleanValue)

    return isNaN(parsed) ? 0 : parsed
  }
}