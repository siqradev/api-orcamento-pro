import pandas as pd
import json
import re
import sys
from pathlib import Path


class TableParser:
    def __init__(self):
        self.re_seinfra_code = re.compile(
            r'^[A-Z]\d{2,5}$'
        )

    def _read_file(
        self,
        file_path,
        **kwargs
    ):
        ext = Path(file_path).suffix.lower()

        if ext == ".csv":
            return pd.read_csv(
                file_path,
                **kwargs
            )

        if ext == ".xls":
            return pd.read_excel(
                file_path,
                engine="xlrd",
                **kwargs
            )

        if ext == ".xlsx":
            return pd.read_excel(
                file_path,
                **kwargs
            )

        raise Exception(
            f"Formato não suportado: {ext}"
        )

    def _normalize_columns(self, df):
        df.columns = [
            re.sub(
                r"\s+",
                " ",
                str(col)
                .strip()
                .lower()
                .replace("\n", " ")
                .replace(".", "")
            )
            for col in df.columns
        ]

        return df

    def _clean_price(self, value):
        if pd.isna(value) or value == "":
            return 0.0

        if isinstance(value, str):
            cleaned = re.sub(
                r"[^\d,.-]",
                "",
                value
            )

            if "," in cleaned and "." in cleaned:
                cleaned = (
                    cleaned
                    .replace(".", "")
                    .replace(",", ".")
                )

            elif "," in cleaned:
                cleaned = cleaned.replace(",", ".")

            try:
                return float(cleaned)
            except Exception:
                return 0.0

        try:
            return float(value)
        except Exception:
            return 0.0

    def parse_seinfra_insumos(
        self,
        file_path,
        reference_table_id
    ):
        df = self._read_file(file_path)

        start_idx = None

        for idx, row in df.iterrows():
            first_col = str(
                row.iloc[0]
            ).strip().lower()

            if first_col == "insumo":
                start_idx = idx
                break

        if start_idx is None:
            start_idx = 6

        df = self._read_file(
            file_path,
            skiprows=start_idx + 1
        )

        insumos = []

        for _, row in df.iterrows():
            codigo = str(
                row.iloc[0]
            ).strip()

            if self.re_seinfra_code.match(codigo):
                insumos.append({
                    "code": codigo,
                    "description": str(
                        row.iloc[1]
                    ).strip(),
                    "unit": str(
                        row.iloc[2]
                    ).strip(),
                    "type": "INSUMO",
                    "basePrice": self._clean_price(
                        row.iloc[3]
                    ),
                    "referenceTableId":
                        reference_table_id
                })

        print(
            f"TOTAL SEINFRA PARSEADO: {len(insumos)}",
            file=sys.stderr
        )

        return insumos

    def parse_sinapi_referencia(
        self,
        file_path,
        sheet_name,
        reference_table_id
    ):
        df = self._read_file(
            file_path,
            sheet_name=sheet_name,
            header=5
        )

        results = []

        for _, row in df.iterrows():
            categoria = str(
                row.iloc[0]
            ).strip()

            codigo = str(
                row.iloc[1]
            ).strip()

            descricao = str(
                row.iloc[2]
            ).strip()

            unidade = str(
                row.iloc[3]
            ).strip()

            preco = self._clean_price(
                row.iloc[-1]
            )

            if codigo in ["", "nan"]:
                continue

            if descricao in ["", "nan"]:
                continue

            if preco <= 0:
                continue

            results.append({
                "code": codigo,
                "category": categoria,
                "description": descricao,
                "unit": unidade,
                "type":
                    "INSUMO"
                    if sheet_name in ["ISD", "ICD"]
                    else "COMPOSICAO",
                "basePrice": preco,
                "referenceTableId":
                    reference_table_id
            })

        print(
            f"{sheet_name} TOTAL: {len(results)}",
            file=sys.stderr
        )

        return results

    def run(
        self,
        file_path,
        source_type,
        data_type,
        reference_table_id
    ):
        source = source_type.upper()
        data_type = data_type.upper()

        if (
            source == "SEINFRA"
            and data_type == "INSUMOS"
        ):
            return self.parse_seinfra_insumos(
                file_path,
                reference_table_id
            )

        if (
            source == "SINAPI"
            and data_type in [
                "ISD",
                "ICD",
                "CSD",
                "CCD"
            ]
        ):
            return self.parse_sinapi_referencia(
                file_path,
                data_type,
                reference_table_id
            )

        return []


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(
            json.dumps({
                "error": "Argumentos insuficientes"
            })
        )
        sys.exit(1)

    file_path = sys.argv[1]
    source = sys.argv[2]
    data_type = sys.argv[3]
    reference_table_id = sys.argv[4]

    parser = TableParser()

    data = parser.run(
        file_path,
        source,
        data_type,
        reference_table_id
    )

    print(
        json.dumps(
            data,
            ensure_ascii=False
        )
    )