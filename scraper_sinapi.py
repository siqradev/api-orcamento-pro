import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError


class SinapiScraper:
    BASE_URL = "https://www.caixa.gov.br/site/Paginas/downloads.aspx#categoria_888"

    def __init__(self):
        self.base_path = Path(__file__).resolve().parent
        self.temp_dir = self.base_path / "temp"
        self.temp_dir.mkdir(exist_ok=True)

    def log(self, message):
        print(f"[SINAPI SCRAPER] {message}")

    def load_all_reports(self, page):
        """
        Faz scroll até o fim para carregar todos os relatórios.
        Necessário porque o portal carrega itens dinamicamente.
        """
        self.log("Carregando todos os relatórios...")

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

        self.log("Todos os relatórios carregados.")

    def find_monthly_file(self, page, month, year, extension="xlsx"):
        """
        Localiza o relatório SINAPI por mês/ano.
        Compatível com padrões:
        SINAPI-2024-12-FORMATO-XLSX
        SINAPI_2024_09_FORMATO_XLSX
        """

        self.log(
            f"Buscando arquivo {month}/{year} ({extension})"
        )

        links = page.locator("a.link-down")
        total = links.count()

        self.log(f"{total} links encontrados.")

        for i in range(total):
            try:
                link = links.nth(i)
                text = link.inner_text().strip().upper()

                print(f"[LINK {i}] {text}")

                matches_new_pattern = (
                    f"{year}-{month}" in text
                )

                matches_old_pattern = (
                    f"{year}_{month}" in text
                )

                if (
                    "SINAPI" in text and
                    (matches_new_pattern or matches_old_pattern) and
                    extension.upper() in text
                ):
                    self.log(f"Arquivo encontrado: {text}")
                    return link

            except Exception:
                continue

        raise Exception(
            f"Arquivo SINAPI {month}/{year} não encontrado."
        )

    def download_table(self, month, year, extension="xlsx"):
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True
            )

            context = browser.new_context(
                accept_downloads=True
            )

            page = context.new_page()

            try:
                self.log("Acessando portal da CAIXA...")

                page.goto(
                    self.BASE_URL,
                    wait_until="networkidle",
                    timeout=120000
                )

                page.wait_for_timeout(3000)

                self.load_all_reports(page)

                target_link = self.find_monthly_file(
                    page,
                    month,
                    year,
                    extension
                )

                self.log("Iniciando download...")

                with page.expect_download(timeout=120000) as download_info:
                    target_link.click()

                download = download_info.value

                filename = f"SINAPI_{year}_{month}.{extension}.zip"

                save_path = self.temp_dir / filename

                download.save_as(str(save_path))

                if not save_path.exists():
                    raise Exception(
                        "Falha ao salvar arquivo."
                    )

                self.log(
                    f"Download concluído: {save_path}"
                )

                print(f"SUCESSO: {save_path}")

                return str(save_path)

            except TimeoutError:
                self.log("Timeout na automação.")
                page.screenshot(
                    path=str(self.temp_dir / "timeout_error.png")
                )
                raise

            except Exception as e:
                self.log(f"Erro: {str(e)}")
                page.screenshot(
                    path=str(self.temp_dir / "error_debug.png")
                )
                raise

            finally:
                browser.close()


def validate_args():
    """
    Uso:
    python scraper_sinapi.py UF MES ANO
    UF é ignorada (mantida por compatibilidade).
    """

    if len(sys.argv) != 4:
        raise Exception(
            "Uso correto: python scraper_sinapi.py UF MES ANO"
        )

    state = sys.argv[1].upper()
    month = sys.argv[2]
    year = sys.argv[3]

    if len(month) != 2:
        raise Exception("Mês inválido. Use 01-12.")

    if len(year) != 4:
        raise Exception("Ano inválido.")

    return state, month, year


if __name__ == "__main__":
    state, month, year = validate_args()

    scraper = SinapiScraper()

    scraper.download_table(
        month=month,
        year=year,
        extension="xlsx"
    )