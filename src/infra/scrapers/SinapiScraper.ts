import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export class SinapiScraper {
  async downloadTable(
    state: string,
    month: string,
    year: string
  ): Promise<string> {
    const root = process.cwd()

    const possiblePythonPaths = [
      path.join(root, '.venv', 'bin', 'python3'),
      path.join(root, '.venv', 'bin', 'python'),
      path.join(root, 'venv', 'bin', 'python3'),
      path.join(root, 'venv', 'bin', 'python')
    ]

    let pythonPath = ''

    for (const p of possiblePythonPaths) {
      if (fs.existsSync(p)) {
        pythonPath = p
        break
      }
    }

    if (!pythonPath) {
      console.warn(
        '[Scraper] .venv não encontrada, usando python3 global...'
      )

      pythonPath = 'python3'
    }

    const scriptPath = path.join(
      root,
      'scraper_sinapi.py'
    )

    console.log(
      `[Executando]: "${pythonPath}" "${scriptPath}" ${state} ${month} ${year}`
    )

    return new Promise((resolve, reject) => {
      const processPython = spawn(
        pythonPath,
        [
          scriptPath,
          state,
          month,
          year
        ]
      )

      let stdout = ''
      let stderr = ''

      processPython.stdout.on(
        'data',
        (data) => {
          stdout += data.toString()

          console.log(
            `[PYTHON]: ${data.toString()}`
          )
        }
      )

      processPython.stderr.on(
        'data',
        (data) => {
          stderr += data.toString()

          console.error(
            `[PYTHON ERROR]: ${data.toString()}`
          )
        }
      )

      processPython.on(
        'close',
        (code) => {
          if (code !== 0) {
            return reject(
              new Error(
                stderr || stdout
              )
            )
          }

          try {
            const result =
              JSON.parse(stdout)

            if (!result.success) {
              return reject(
                new Error(
                  result.error ||
                    'Falha no scraper Python'
                )
              )
            }

            console.log(
              '[IMPORT] Excel localizado:',
              result.excel_path
            )

            resolve(
              result.excel_path
            )
          } catch (error) {
            reject(
              new Error(
                `Erro ao interpretar JSON do Python: ${stdout}`
              )
            )
          }
        }
      )
    })
  }
}