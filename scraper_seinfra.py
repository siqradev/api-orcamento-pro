import sys
import requests
from pathlib import Path


class SeinfraScraper:
    BASE_URL = "https://sin.seinfra.ce.gov.br/site-seinfra/siproce"

    def __init__(self):
        self.base_path = Path(__file__).resolve().parent
        self.temp_dir = self.base_path / "temp"
        self.temp_dir.mkdir(exist_ok=True)

    def log(self, message):
        print(f"[SEINFRA SCRAPER] {message}")

    def get_download_url(self, version="028.1"):
        return (
            f"{self.BASE_URL}/desonerada/"
            f"Tabela-de-Insumos-{version}---ENC.-SOCIAIS-84,44.xls"
        )

    def download_table(self, version="028.1"):
        url = self.get_download_url(version)

        self.log(f"Baixando tabela versão {version}")

        response = requests.get(url, timeout=120)

        if response.status_code != 200:
            raise Exception(
                f"Falha no download. Status: {response.status_code}"
            )

        save_path = (
            self.temp_dir /
            f"SEINFRA_{version}.xls"
        )

        with open(save_path, "wb") as f:
            f.write(response.content)

        self.log(f"Download concluído: {save_path}")

        print(f"SUCESSO: {save_path}")

        return str(save_path)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise Exception(
            "Uso: python3 scraper_seinfra.py 028.1"
        )

    version = sys.argv[1]

    scraper = SeinfraScraper()
    scraper.download_table(version)