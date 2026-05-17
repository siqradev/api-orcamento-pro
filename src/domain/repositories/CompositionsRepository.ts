// src/domain/repositories/CompositionsRepository.ts

import { CompositionChildDTO } from '../dtos/CompositionDTO'

export interface ICompositionsRepository {
  /** Persiste relações pai → filho em lote */
  bulkInsert(
    compositions: CompositionChildDTO[],
    referenceTableId: string
  ): Promise<void>

  /** Retorna todos os filhos diretos de uma composição */
  findChildren(
    parentCode: string,
    referenceTableId: string
  ): Promise<CompositionRow[]>

  /** Retorna todas as composições que usam um insumo */
  findParents(
    childCode: string,
    referenceTableId: string
  ): Promise<CompositionRow[]>
}

export interface CompositionRow {
  id: string
  parentItemId: string
  childItemId: string
  coefficient: number
  parentItem: {
    id: string
    code: string
    description: string
    unit: string
    type: string
    basePrice: number | null
  }
  childItem: {
    id: string
    code: string
    description: string
    unit: string
    type: string
    basePrice: number | null
  }
}
