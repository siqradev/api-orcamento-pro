import sys
import json
import zipfile
import pandas as pd
from pathlib import Path
from playwright.sync_api import sync_playwright


class SinapiScraper:
    BASE_URL = "https://www.caixa.gov.br/site/Paginas/downloads.aspx#categoria_888"

    def __init__(self):
        self.base_path = Path(__file__).resolve().parent

        self.temp_dir = self.base_path / "temp"

        self.temp_dir.mkdir(exist_ok=True)

    def log(self, message):
        print(
            f"[SINAPI SCRAPER] {message}",
            file=sys.stderr
        )

    def load_all_reports(self, page):
        self.log(
            "Carregando relatórios dinâmicos..."
        )

        previous_height = 0

        while True:
            current_height = page.evaluate(
                "document.body.scrollHeight"
            )

            if current_height == previous_height:
                break

            previous_height = current_height

            page.evaluate(
                "window.scrollTo(0, document.body.scrollHeight)"
            )

            page.wait_for_timeout(2000)

    def _extract_and_find_xlsx(
        self,
        zip_path,
        year,
        month
    ):
        """
        Extrai ZIP e localiza o arquivo correto do SINAPI
        """

        self.log(
            f"Extraindo conteúdo de {zip_path.name}..."
        )

        extract_path = (
            self.temp_dir /
            f"extracted_{year}_{month}"
        )

        extract_path.mkdir(exist_ok=True)

        try:
            with zipfile.ZipFile(
                zip_path,
                'r'
            ) as zip_ref:
                zip_ref.extractall(extract_path)

            excel_files = list(
                extract_path.rglob("*.xlsx")
            )

            self.log(
                f"Arquivos encontrados: {[f.name for f in excel_files]}"
            )

            # PRIORIDADE 1
            # Arquivo Referência

            for file in excel_files:
                name = (
                    file.name
                    .lower()
                    .replace("ê", "e")
                    .replace("é", "e")
                )

                if (
                    "referencia" in name
                    and not file.name.startswith("~$")
                ):
                    self.log(
                        f"Arquivo referência encontrado: {file.name}"
                    )

                    return str(file)

            # PRIORIDADE 2
            # Arquivo com abas ISD/CSD etc

            for file in excel_files:
                try:
                    excel = pd.ExcelFile(file)

                    sheets = [
                        s.upper()
                        for s in excel.sheet_names
                    ]

                    if any(
                        s in sheets
                        for s in [
                            "ISD",
                            "ICD",
                            "CSD",
                            "CCD"
                        ]
                    ):
                        self.log(
                            f"Arquivo SINAPI válido encontrado: {file.name}"
                        )

                        return str(file)

                except Exception:
                    continue

            return None

        except Exception as e:
            self.log(
                f"Erro na extração: {str(e)}"
            )

            return None

    def find_monthly_file(
        self,
        page,
        month,
        year
    ):
        """
        Localiza o arquivo correto no portal da Caixa
        """

        links = page.locator(
            "a.link-down"
        )

        total = links.count()

        self.log(
            f"Analisando {total} links..."
        )

        for i in range(total):
            text = (
                links
                .nth(i)
                .inner_text()
                .strip()
                .upper()
            )

            matches_date = (
                f"{year}-{month}" in text
                or f"{year}_{month}" in text
            )

            if (
                "SINAPI" in text
                and matches_date
                and "XLSX" in text
            ):
                self.log(
                    f"Arquivo encontrado: {text}"
                )

                return links.nth(i)

        return None

    def download_table(
        self,
        state,
        month,
        year
    ):
        with sync_playwright() as p:

            browser = p.chromium.launch(
                headless=True
            )

            context = browser.new_context(
                accept_downloads=True
            )

            page = context.new_page()

            try:
                self.log(
                    f"Acessando portal da CAIXA para {month}/{year}..."
                )

                page.goto(
                    self.BASE_URL,
                    wait_until="networkidle",
                    timeout=90000
                )

                self.load_all_reports(page)

                target_link = self.find_monthly_file(
                    page,
                    month,
                    year
                )

                if not target_link:
                    raise Exception(
                        f"Arquivo SINAPI {month}/{year} não localizado."
                    )

                self.log(
                    "Iniciando download..."
                )

                with page.expect_download(
                    timeout=120000
                ) as download_info:

                    target_link.click()

                download = download_info.value

                zip_path = (
                    self.temp_dir /
                    f"SINAPI_{year}_{month}_RAW.zip"
                )

                download.save_as(
                    str(zip_path)
                )

                excel_path = (
                    self._extract_and_find_xlsx(
                        zip_path,
                        year,
                        month
                    )
                )

                if not excel_path:
                    raise Exception(
                        "Excel de referência não encontrado dentro do ZIP."
                    )

                return {
                    "success": True,
                    "state": state,
                    "excel_path": excel_path,
                    "zip_path": str(zip_path)
                }

            except Exception as e:

                self.log(
                    f"Erro: {str(e)}"
                )

                return {
                    "success": False,
                    "error": str(e)
                }

            finally:
                browser.close()


if __name__ == "__main__":

    if len(sys.argv) < 4:

        print(json.dumps({
            "success": False,
            "error": "Uso: python scraper_sinapi.py UF MES ANO"
        }))

        sys.exit(1)

    state = sys.argv[1]
    month = sys.argv[2]
    year = sys.argv[3]

    scraper = SinapiScraper()

    result = scraper.download_table(
        state,
        month,
        year
    )

    print(
        json.dumps(
            result,
            ensure_ascii=False
        )
    )