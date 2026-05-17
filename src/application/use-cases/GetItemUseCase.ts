// src/application/use-cases/GetItemUseCase.ts

import {
  IItemsRepository,
  ItemResult,
} from '../../domain/repositories/ItemsRepository'

export class GetItemUseCase {
  constructor(private readonly repository: IItemsRepository) {}

  async execute(
    code: string,
    referenceTableId: string
  ): Promise<ItemResult | null> {
    return this.repository.findByCode(code, referenceTableId)
  }
}
