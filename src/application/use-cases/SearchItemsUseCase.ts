// src/application/use-cases/SearchItemsUseCase.ts

import {
  IItemsRepository,
  ItemResult,
  SearchFilters,
} from '../../domain/repositories/ItemsRepository'

export class SearchItemsUseCase {
  constructor(private readonly repository: IItemsRepository) {}

  async execute(query: string, filters?: SearchFilters): Promise<ItemResult[]> {
    if (!query || query.trim().length < 2) {
      throw new Error('A busca requer ao menos 2 caracteres.')
    }

    return this.repository.search(query.trim(), filters)
  }
}
