// src/application/use-cases/ListItemsUseCase.ts

import {
  IItemsRepository,
  PaginatedResult,
  SearchFilters,
} from '../../domain/repositories/ItemsRepository'

export class ListItemsUseCase {
  constructor(private readonly repository: IItemsRepository) {}

  async execute(
    page = 1,
    limit = 20,
    filters?: SearchFilters
  ): Promise<PaginatedResult> {
    // Garante limites razoáveis
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(Math.max(1, limit), 100)

    return this.repository.paginate(safePage, safeLimit, filters)
  }
}
