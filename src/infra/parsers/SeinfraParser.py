import pandas as pd
import json
import re
from pathlib import Path

class SeinfraParser:
    def __init__(self, temp_dir="temp"):
        self.temp_dir = Path(temp_dir)

    def parse_insumos(self, file_path):
        """Lê a tabela de insumos da SEINFRA"""
        # Pula as linhas de cabeçalho da SEINFRA (geralmente as 7 primeiras)
        df = pd.read_csv(file_path, skiprows=7)
        
        insumos = []
        for _, row in df.iterrows():
            codigo = str(row.iloc[0]).strip()
            # Filtra apenas linhas que possuem código de insumo válido (ex: I8600)
            if codigo.startswith('I') or codigo.isdigit():
                insumos.append({
                    "code": codigo,
                    "description": str(row.iloc[1]).strip(),
                    "unit": str(row.iloc[2]).strip(),
                    "price": self._clean_price(row.iloc[3]),
                    "type": "INSUMO"
                })
        return insumos

    def parse_composicoes(self, file_path):
        """Lê a tabela de composições e seus coeficientes"""
        df = pd.read_csv(file_path)
        composicoes = []
        current_comp = None

        for _, row in df.iterrows():
            line_val = str(row.iloc[0])

            # Identifica início de uma nova composição (Ex: C1802 - BOMBA...)
            if re.match(r'^[A-Z]\d{4}', line_val):
                if current_comp:
                    composicoes.append(current_comp)
                
                parts = line_val.split(' - ')
                current_comp = {
                    "code": parts[0].strip(),
                    "description": parts[1].split(' - ')[0].strip(),
                    "unit": line_val.split(' - ')[-1].strip(),
                    "items": []
                }
                continue

            # Identifica itens dentro da composição (Mão de Obra, Materiais, Equipamentos)
            item_code = str(row.iloc[0]).strip()
            if item_code.startswith('I') and current_comp:
                current_comp["items"].append({
                    "child_code": item_code,
                    "coefficient": float(row.iloc[3]),
                    "price_at_time": self._clean_price(row.iloc[4])
                })

        if current_comp:
            composicoes.append(current_comp)
        return composicoes

    def _clean_price(self, value):
        if pd.isna(value): return 0.0
        if isinstance(value, str):
            return float(value.replace('.', '').replace(',', '.'))
        return float(value)

# Exemplo de uso para gerar o JSON para o Node.js
if __name__ == "__main__":
    parser = SeinfraParser()
    # insumos = parser.parse_insumos("Tabela-de-Insumos-028.1.csv")
    # print(json.dumps(insumos[:2], indent=2))