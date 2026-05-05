import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export class SinapiScraper {
  async downloadTable(state: string, month: string, year: string): Promise<string> {
    const root = process.cwd();

    // Como confirmaste que o resultado é .venv, vamos priorizar este caminho
    const possiblePythonPaths = [
      path.join(root, '.venv', 'bin', 'python3'),
      path.join(root, '.venv', 'bin', 'python'),
      path.join(root, 'venv', 'bin', 'python3'),
      path.join(root, 'venv', 'bin', 'python')
    ];

    let pythonPath = '';
    for (const p of possiblePythonPaths) {
      if (fs.existsSync(p)) {
        pythonPath = p;
        break;
      }
    }

    // Se por algum motivo não encontrar na pasta, tenta o global
    if (!pythonPath) {
      console.warn("[Scraper] Pasta .venv não encontrada fisicamente, tentando python3 global...");
      pythonPath = 'python3';
    }

    const scriptPath = path.join(root, 'scraper_sinapi.py');
    
    // Montagem do comando com aspas duplas para suportar os espaços em "arquivos de programação"
    const command = `"${pythonPath}" "${scriptPath}" ${state} ${month} ${year}`;
    
    console.log(`[Executando]: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stdout) {
        console.error(`[Python Stderr]: ${stderr}`);
      }

      // Procura a mensagem que o teu scraper_sinapi.py imprime
      const match = stdout.match(/Download concluído: (.+)/) || stdout.match(/Sucesso: (.+)/);
      
      if (!match) {
        throw new Error(`Caminho não encontrado no log do Python. Log: ${stdout}`);
      }

      return match[1].trim();
    } catch (error: any) {
      console.error("❌ Erro fatal no Scraper Ubuntu:");
      console.error(`Comando falhou: ${error.cmd}`);
      throw error;
    }
  }
}