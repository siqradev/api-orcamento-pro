// src/domain/dtos/CompositionDTO.ts
// DTOs que chegam do UniversalParser.py para composições

/** Relação pai → filho vinda do Python parser */
export interface CompositionChildDTO {
  parentCode: string
  childCode: string
  coefficient: number
  priceAtTime?: number | null
  referenceTableId: string
}

/** Payload completo que o parser retorna para COMPOSICOES/PLANOS da SEINFRA */
export interface ParsedCompositionsPayload {
  items: import('./CreateItemDTO').CreateItemDTO[]
  compositions: CompositionChildDTO[]
}

/** Função de type guard para distinguir payload simples de composições */
export function isCompositionsPayload(
  data: unknown
): data is ParsedCompositionsPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    'compositions' in data &&
    Array.isArray((data as any).items) &&
    Array.isArray((data as any).compositions)
  )
}
