import pandas as pd
import json
import re
import sys
from pathlib import Path


class TableParser:
    def __init__(self):
        self.re_seinfra_code = re.compile(r'^[A-Z]\d{2,5}$')
        self.re_sinapi_code  = re.compile(r'^\d+$')

    # ─── Leitura de arquivo ───────────────────────────────────────────────────

    def _read_file(self, file_path, **kwargs):
        ext = Path(file_path).suffix.lower()
        if ext == '.csv':
            return pd.read_csv(file_path, **kwargs)
        if ext == '.xls':
            return pd.read_excel(file_path, engine='xlrd', **kwargs)
        if ext == '.xlsx':
            return pd.read_excel(file_path, **kwargs)
        raise Exception(f'Formato não suportado: {ext}')

    def _normalize_columns(self, df):
        df.columns = [
            re.sub(r'\s+', ' ', str(col).strip().lower()
                   .replace('\n', ' ').replace('.', ''))
            for col in df.columns
        ]
        return df

    def _clean_price(self, value):
        if pd.isna(value) or value == '':
            return None
        if isinstance(value, str):
            cleaned = re.sub(r'[^\d,.-]', '', value)
            if cleaned == '':
                return None
            if ',' in cleaned and '.' in cleaned:
                cleaned = cleaned.replace('.', '').replace(',', '.')
            elif ',' in cleaned:
                cleaned = cleaned.replace(',', '.')
            try:
                return float(cleaned)
            except Exception:
                return None
        try:
            return float(value)
        except Exception:
            return None

    # ─── SINAPI — parse de uma aba ────────────────────────────────────────────

    def _parse_sinapi_sheet(self, file_path, sheet_name, reference_table_id):
        """
        Header real na linha 10 do Excel (linha 11 = primeiro dado).
        CE: índice 10 para insumos (ISD/ICD), índice 14 para composições (CSD/CCD).

        ISD/ICD: pandas lê normalmente (códigos são inteiros).
        CSD/CCD: openpyxl com data_only=False para extrair código da fórmula
                 HYPERLINK — pandas retornaria 0 pois não avalia fórmulas.
        """
        import openpyxl

        upper          = sheet_name.upper()
        is_composition = ('CSD' in upper or 'CCD' in upper)
        ce_idx         = 14 if is_composition else 10

        print(f'[PARSER] Aba {sheet_name} — CE idx={ce_idx}', file=sys.stderr)

        results = []
        skipped = {'codigo': 0, 'descricao': 0, 'preco': 0}

        if is_composition:
            # ── CSD / CCD: usa openpyxl para ler fórmulas HYPERLINK ──────────
            wb = openpyxl.load_workbook(file_path, data_only=False, read_only=True)
            ws = wb[sheet_name]

            re_hyperlink = re.compile(r',\s*(\d+)\s*\)\s*$')

            for row in ws.iter_rows(min_row=11):  # linha 11 = primeiro dado
                vals = [cell.value for cell in row]

                if len(vals) <= ce_idx:
                    continue

                # Coluna B (índice 1) — fórmula HYPERLINK ou inteiro
                raw = vals[1]
                if raw is None:
                    skipped['codigo'] += 1
                    continue

                raw_str = str(raw).strip()
                if 'HYPERLINK' in raw_str.upper():
                    m      = re_hyperlink.search(raw_str)
                    codigo = m.group(1) if m else ''
                else:
                    codigo = re.sub(r'[^\d]', '', raw_str)

                if codigo in ('', '0'):
                    skipped['codigo'] += 1
                    continue
                if not self.re_sinapi_code.match(codigo):
                    skipped['codigo'] += 1
                    continue

                categoria = str(vals[0]).strip() if vals[0] else ''
                descricao = str(vals[2]).strip() if vals[2] else ''
                unidade   = str(vals[3]).strip() if vals[3] else ''

                if descricao in ('', 'nan', 'None'):
                    skipped['descricao'] += 1
                    continue
                if unidade in ('', 'nan', 'None'):
                    continue

                preco = self._clean_price(vals[ce_idx])
                if preco is None or preco <= 0:
                    skipped['preco'] += 1
                    continue

                results.append({
                    'code':             codigo,
                    'category':         categoria,
                    'description':      descricao,
                    'unit':             unidade,
                    'type':             'COMPOSICAO',
                    'basePrice':        preco,
                    'referenceTableId': reference_table_id,
                })

            wb.close()

        else:
            # ── ISD / ICD: pandas — códigos são inteiros simples ─────────────
            df = self._read_file(file_path, sheet_name=sheet_name, header=9)
            df = self._normalize_columns(df)

            for _, row in df.iterrows():
                codigo = re.sub(r'[^\d]', '', str(row.iloc[1]).strip())

                if codigo in ('', '0'):
                    skipped['codigo'] += 1
                    continue
                if not self.re_sinapi_code.match(codigo):
                    skipped['codigo'] += 1
                    continue

                categoria = str(row.iloc[0]).strip()
                descricao = str(row.iloc[2]).strip()
                unidade   = str(row.iloc[3]).strip()

                if descricao in ('', 'nan'):
                    skipped['descricao'] += 1
                    continue
                if unidade in ('', 'nan'):
                    continue

                try:
                    preco = self._clean_price(row.iloc[ce_idx])
                except IndexError:
                    preco = None

                if preco is None or preco <= 0:
                    skipped['preco'] += 1
                    continue

                results.append({
                    'code':             codigo,
                    'category':         categoria,
                    'description':      descricao,
                    'unit':             unidade,
                    'type':             'INSUMO',
                    'basePrice':        preco,
                    'referenceTableId': reference_table_id,
                })

        print(
            f'[PARSER] {sheet_name}: {len(results)} ok | '
            f'ignorados → codigo:{skipped["codigo"]} '
            f'desc:{skipped["descricao"]} preco:{skipped["preco"]}',
            file=sys.stderr
        )
        return results

    # ─── SINAPI — Plano B: dual output ───────────────────────────────────────

    def parse_sinapi_dual(self, file_path, ref_onerada, ref_desonerada):
        """
        Lê o arquivo SINAPI UMA VEZ e retorna dois conjuntos:
          - onerada:    ISD + CSD  (Sem Desoneração)
          - desonerada: ICD + CCD  (Com Desoneração)

        Cada item já carrega o referenceTableId correto.
        """
        excel  = pd.ExcelFile(file_path)
        sheets = excel.sheet_names
        print(f'[PARSER] Abas encontradas: {sheets}', file=sys.stderr)

        onerada    = []
        desonerada = []

        for sheet in sheets:
            up = sheet.upper()
            if 'ISD' in up:        # Insumos Sem Desoneração  → ONERADA
                onerada.extend(
                    self._parse_sinapi_sheet(file_path, sheet, ref_onerada)
                )
            elif 'ICD' in up:      # Insumos Com Desoneração  → DESONERADA
                desonerada.extend(
                    self._parse_sinapi_sheet(file_path, sheet, ref_desonerada)
                )
            elif 'CSD' in up:      # Composições Sem Desoneração → ONERADA
                onerada.extend(
                    self._parse_sinapi_sheet(file_path, sheet, ref_onerada)
                )
            elif 'CCD' in up:      # Composições Com Desoneração → DESONERADA
                desonerada.extend(
                    self._parse_sinapi_sheet(file_path, sheet, ref_desonerada)
                )

        print(
            f'[PARSER] SINAPI TOTAL → onerada:{len(onerada)} desonerada:{len(desonerada)}',
            file=sys.stderr
        )
        return {'onerada': onerada, 'desonerada': desonerada}

    # ─── SEINFRA — insumos ───────────────────────────────────────────────────

    def parse_seinfra_insumos(self, file_path, reference_table_id):
        df = self._read_file(file_path)

        start_idx = None
        for idx, row in df.iterrows():
            if str(row.iloc[0]).strip().lower() == 'insumo':
                start_idx = idx
                break
        if start_idx is None:
            start_idx = 6

        df = self._read_file(file_path, skiprows=start_idx + 1)

        insumos = []
        for _, row in df.iterrows():
            codigo    = str(row.iloc[0]).strip()
            descricao = str(row.iloc[1]).strip()
            unidade   = str(row.iloc[2]).strip()
            preco     = self._clean_price(row.iloc[3])

            if not self.re_seinfra_code.match(codigo):
                continue
            if descricao in ('', 'nan'):
                continue
            if unidade in ('', 'nan'):
                continue
            if preco is None or preco <= 0:
                continue

            insumos.append({
                'code':             codigo,
                'description':      descricao,
                'unit':             unidade,
                'type':             'INSUMO',
                'basePrice':        preco,
                'referenceTableId': reference_table_id,
            })

        print(f'[PARSER] SEINFRA insumos: {len(insumos)}', file=sys.stderr)
        return insumos

    # ─── SEINFRA — composições ───────────────────────────────────────────────

    def parse_seinfra_composicoes(self, file_path, reference_table_id):
        """
        Retorna { items, compositions } compatível com ParsedCompositionsPayload.
        """
        df = self._read_file(file_path)

        header_idx = None
        for idx, row in df.iterrows():
            first = str(row.iloc[0]).strip().lower()
            if first in ('composição', 'composicao', 'código', 'codigo'):
                header_idx = idx
                break
        if header_idx is None:
            header_idx = 0

        df = self._read_file(file_path, skiprows=header_idx + 1)

        items          = []
        compositions   = []
        seen_codes     = set()
        current_parent = None

        for _, row in df.iterrows():
            codigo = str(row.iloc[0]).strip()

            if self.re_seinfra_code.match(codigo):
                if codigo not in seen_codes:
                    descricao = str(row.iloc[1]).strip()
                    unidade   = str(row.iloc[2]).strip()
                    preco     = self._clean_price(row.iloc[3]) if len(row) > 3 else None

                    if descricao not in ('', 'nan') and unidade not in ('', 'nan'):
                        items.append({
                            'code':             codigo,
                            'description':      descricao,
                            'unit':             unidade,
                            'type':             'COMPOSICAO',
                            'basePrice':        preco,
                            'referenceTableId': reference_table_id,
                        })
                        seen_codes.add(codigo)

                current_parent = codigo

            elif current_parent and codigo not in ('', 'nan'):
                try:
                    coeficiente = float(str(row.iloc[3]).replace(',', '.'))
                except Exception:
                    coeficiente = 1.0

                compositions.append({
                    'parentCode':  current_parent,
                    'childCode':   codigo,
                    'coefficient': coeficiente,
                    'unit':        str(row.iloc[2]).strip() if len(row) > 2 else '',
                })

        print(
            f'[PARSER] SEINFRA composições: {len(items)} itens, {len(compositions)} relações',
            file=sys.stderr
        )
        return {'items': items, 'compositions': compositions}

    # ─── Entry point ─────────────────────────────────────────────────────────

    def run(self, file_path, source_type, data_type, ref_onerada, ref_desonerada=''):
        source    = source_type.upper()
        data_type = data_type.upper()

        if source == 'SINAPI':
            return self.parse_sinapi_dual(file_path, ref_onerada, ref_desonerada)

        if source == 'SEINFRA':
            if data_type == 'INSUMOS':
                return self.parse_seinfra_insumos(file_path, ref_onerada)
            if data_type in ('COMPOSICOES', 'PLANOS'):
                return self.parse_seinfra_composicoes(file_path, ref_onerada)

        return []


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # args: file_path source data_type ref_onerada [ref_desonerada]
    if len(sys.argv) < 5:
        print(json.dumps({'error': 'Argumentos insuficientes'}))
        sys.exit(1)

    file_path      = sys.argv[1]
    source         = sys.argv[2]
    data_type      = sys.argv[3]
    ref_onerada    = sys.argv[4]
    ref_desonerada = sys.argv[5] if len(sys.argv) > 5 else ''

    parser = TableParser()
    data   = parser.run(file_path, source, data_type, ref_onerada, ref_desonerada)

    print(json.dumps(data, ensure_ascii=False))
