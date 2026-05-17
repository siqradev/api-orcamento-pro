// src/shared/utils/normalizeText.ts
// Remove acentos, converte para minúsculas e remove espaços extras
// Usado para o campo searchText no banco e nas queries de busca

export function normalizeText(text: string): string {
  if (!text) return ''

  return text
    .normalize('NFD')                    // decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')     // remove os diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')               // múltiplos espaços → um
    .trim()
}
