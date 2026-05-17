"""
scraper_seinfra.py — Fase 2
Baixa os 3 arquivos de cada versão da SEINFRA-CE:
  - Tabela-de-Insumos
  - Composicoes
  - Planos-de-Servicos

Retorna JSON para o Node.js via stdout com os caminhos dos 3 arquivos.
Logs vão para stderr (Node.js não os lê).

Uso:
  python3 scraper_seinfra.py 028        # onerada
  python3 scraper_seinfra.py 028.1      # desonerada
"""

import sys
import json
import time
import requests
from pathlib import Path
from urllib.parse import quote

class SeinfraScraper:
    BASE_URL   = "https://sin.seinfra.ce.gov.br/site-seinfra/siproce"

    # Percentuais de encargos sociais por versão
    ENC_MAP = {
        "028":   "114,15",   # onerada
        "028.1": "84,44",    # desonerada
    }

    # Tipos de arquivo e seus prefixos de nome
    FILE_TYPES = [
        ("insumos",     "Tabela-de-Insumos"),
        ("composicoes", "Composicoes"),
        ("planos",      "Planos-de-Servicos"),
    ]

    def __init__(self):
        self.base_path = Path(__file__).resolve().parent
        self.temp_dir  = self.base_path / "temp"
        self.temp_dir.mkdir(exist_ok=True)

    def log(self, msg):
        print(f"[SEINFRA] {msg}", file=sys.stderr)

    def get_tipo_url(self, version):
        """Determina se é onerada ou desonerada pela versão."""
        return "desonerada" if "." in version else "onerada"

    def build_url(self, version, file_prefix):
        """
        Monta a URL do arquivo no padrão SEINFRA-CE.
        Ex: .../desonerada/Tabela-de-Insumos-028.1---ENC.-SOCIAIS-84,44.xls
        """
        tipo     = self.get_tipo_url(version)
        encargos = self.ENC_MAP.get(version, "84,44")
        filename = f"{file_prefix}-{version}---ENC.-SOCIAIS-{encargos}.xls"

        # A vírgula no nome do arquivo precisa ser codificada para a URL
        encoded_filename = filename.replace(",", "%2C")

        return f"{self.BASE_URL}/{tipo}/{encoded_filename}"

    def download_file(self, url, save_path, retries=3):
        """Faz o download com retry automático (servidores do governo são instáveis)."""
        for attempt in range(1, retries + 1):
            try:
                self.log(f"Download tentativa {attempt}: {url}")
                response = requests.get(url, timeout=120, verify=True)

                if response.status_code == 200:
                    with open(save_path, "wb") as f:
                        f.write(response.content)
                    self.log(f"Salvo: {save_path}")
                    return True

                self.log(f"Status {response.status_code} — aguardando {attempt * 5}s")
                time.sleep(attempt * 5)

            except requests.exceptions.Timeout:
                self.log(f"Timeout na tentativa {attempt}")
                if attempt < retries:
                    time.sleep(attempt * 10)

            except Exception as e:
                self.log(f"Erro na tentativa {attempt}: {str(e)}")
                if attempt < retries:
                    time.sleep(5)

        return False

    def download_all(self, version):
        """Baixa os 3 arquivos da versão informada."""
        enc      = self.ENC_MAP.get(version, "?")
        tipo     = self.get_tipo_url(version)
        self.log(f"Versão: {version} | Tipo: {tipo} | Encargos: {enc}%")

        result = {
            "success":         False,
            "version":         version,
            "tipo":            tipo,
            "file_insumos":    None,
            "file_composicoes": None,
            "file_planos":     None,
        }

        all_ok = True

        for key, prefix in self.FILE_TYPES:
            url       = self.build_url(version, prefix)
            safe_ver  = version.replace(".", "_")
            filename  = f"SEINFRA_{safe_ver}_{key}.xls"
            save_path = str(self.temp_dir / filename)

            ok = self.download_file(url, save_path)

            if ok:
                result[f"file_{key}"] = save_path
            else:
                self.log(f"FALHA ao baixar {key}: {url}")
                all_ok = False

        result["success"] = all_ok

        if not all_ok:
            # Retorna sucesso parcial com os arquivos que conseguiu baixar
            result["warning"] = "Alguns arquivos não foram baixados. Verifique os logs."
            result["success"] = any([
                result["file_insumos"],
                result["file_composicoes"],
                result["file_planos"],
            ])

        return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error":   "Versão não informada. Uso: python3 scraper_seinfra.py 028 ou 028.1"
        }))
        sys.exit(1)

    version = sys.argv[1]

    if version not in ("028", "028.1"):
        print(json.dumps({
            "success": False,
            "error":   f"Versão inválida: {version}. Use 028 (onerada) ou 028.1 (desonerada)."
        }))
        sys.exit(1)

    scraper = SeinfraScraper()
    result  = scraper.download_all(version)

    # Apenas JSON no stdout — Node.js depende disso
    print(json.dumps(result, ensure_ascii=False))
