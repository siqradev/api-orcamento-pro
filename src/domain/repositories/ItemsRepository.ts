// src/domain/repositories/IItemsRepository.ts

import { CreateItemDTO } from '../dtos/CreateItemDTO'

export interface ItemsRepository {
  
  bulkInsert(items: CreateItemDTO[]): Promise<void>

  findByCode(
    code: string,
    referenceTableId: string
  ): Promise<any | null>
}