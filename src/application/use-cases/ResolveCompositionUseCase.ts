// src/application/use-cases/ResolveCompositionUseCase.ts
// Motor de cálculo de composição com DFS recursivo
//
// Dado um código de composição, retorna a árvore completa com:
//   - Custo acumulado por insumo (coeficientes multiplicados em cascata)
//   - Breakdown por categoria: MATERIAL, MAO_DE_OBRA, EQUIPAMENTO
//   - Detecção de ciclo para evitar loop infinito

import { IItemsRepository }        from '../../domain/repositories/ItemsRepository'
import { ICompositionsRepository } from '../../domain/repositories/CompositionsRepository'

// ─── Tipos de saída ───────────────────────────────────────────────────────────

export interface ResolvedComposition {
  code:        string
  description: string
  unit:        string
  totalCost:   number
  breakdown:   CostBreakdown
  tree:        CompositionNode
}

export interface CostBreakdown {
  material:    number
  maoDeObra:   number
  equipamento: number
  outros:      number
}

export interface CompositionNode {
  code:               string
  description:        string
  unit:               string
  type:               string
  coefficient:        number           // coeficiente relativo ao pai
  accumulatedCoeff:   number           // coeficiente acumulado desde a raiz
  unitPrice:          number | null
  totalCost:          number | null    // unitPrice × accumulatedCoeff
  children:           CompositionNode[]
  isCycleDetected?:   boolean
}

// ─── UseCase ──────────────────────────────────────────────────────────────────

export class ResolveCompositionUseCase {
  constructor(
    private readonly itemsRepository:        IItemsRepository,
    private readonly compositionsRepository: ICompositionsRepository
  ) {}

  async execute(
    code: string,
    referenceTableId: string,
    quantity = 1
  ): Promise<ResolvedComposition> {
    // Verifica se o item raiz existe
    const root = await this.itemsRepository.findByCode(code, referenceTableId)
    if (!root) {
      throw new Error(`Composição "${code}" não encontrada na tabela ${referenceTableId}.`)
    }

    // DFS com controle de ciclo: Set de IDs visitados no caminho atual
    const visitedPath = new Set<string>()
    const tree = await this.buildNode(
      root.code,
      root.description,
      root.unit,
      root.type,
      /* coefficient    */ 1,
      /* accumulatedCf  */ quantity,
      referenceTableId,
      visitedPath
    )

    // Acumula breakdown percorrendo a árvore
    const breakdown: CostBreakdown = {
      material:    0,
      maoDeObra:   0,
      equipamento: 0,
      outros:      0,
    }

    this.accumulateBreakdown(tree, breakdown)

    const totalCost =
      breakdown.material +
      breakdown.maoDeObra +
      breakdown.equipamento +
      breakdown.outros

    return {
      code:        root.code,
      description: root.description,
      unit:        root.unit,
      totalCost,
      breakdown,
      tree,
    }
  }

  // ─── DFS recursivo ────────────────────────────────────────────────────────

  private async buildNode(
    code:             string,
    description:      string,
    unit:             string,
    type:             string,
    coefficient:      number,
    accumulatedCoeff: number,
    referenceTableId: string,
    visitedPath:      Set<string>
  ): Promise<CompositionNode> {
    // Preço unitário do item
    const itemData = await this.itemsRepository.findByCode(code, referenceTableId)
    const unitPrice = itemData?.basePrice
      ? Number(itemData.basePrice)
      : null

    const node: CompositionNode = {
      code,
      description,
      unit,
      type,
      coefficient,
      accumulatedCoeff,
      unitPrice,
      totalCost: unitPrice !== null ? unitPrice * accumulatedCoeff : null,
      children:  [],
    }

    // Insumo (folha da árvore) — não tem filhos
    if (type === 'INSUMO') return node

    // Verifica ciclo: se este código já está no caminho atual → ciclo detectado
    if (visitedPath.has(code)) {
      node.isCycleDetected = true
      console.warn(`[DFS] Ciclo detectado: ${code} já está no caminho atual`)
      return node
    }

    // Marca como visitado neste caminho
    visitedPath.add(code)

    // Busca filhos diretos
    const children = await this.compositionsRepository.findChildren(code, referenceTableId)

    for (const relation of children) {
      const childCoeff = Number(relation.coefficient)
      const childItem  = relation.childItem

      const childNode = await this.buildNode(
        childItem.code,
        childItem.description,
        childItem.unit,
        childItem.type,
        childCoeff,
        /* acumulado = pai × filho */
        accumulatedCoeff * childCoeff,
        referenceTableId,
        // Clona o Set para não contaminar caminhos irmãos
        new Set(visitedPath)
      )

      node.children.push(childNode)
    }

    // Remove da visita ao retornar (backtracking)
    visitedPath.delete(code)

    return node
  }

  // ─── Acumula breakdown percorrendo a árvore em pós-ordem ─────────────────

  private accumulateBreakdown(
    node:      CompositionNode,
    breakdown: CostBreakdown
  ): void {
    // Só acumula nas folhas (insumos reais)
    if (node.type === 'INSUMO' && node.totalCost !== null) {
      const category = this.classifyCategory(node.description)

      if (category === 'MATERIAL')      breakdown.material    += node.totalCost
      else if (category === 'MAO_OBRA') breakdown.maoDeObra   += node.totalCost
      else if (category === 'EQUIP')    breakdown.equipamento += node.totalCost
      else                              breakdown.outros      += node.totalCost
    }

    for (const child of node.children) {
      this.accumulateBreakdown(child, breakdown)
    }
  }

  // ─── Classificação heurística de categoria ────────────────────────────────
  // Baseado nos códigos e descrições comuns da SEINFRA/SINAPI

  private classifyCategory(description: string): 'MATERIAL' | 'MAO_OBRA' | 'EQUIP' | 'OUTROS' {
    const desc = description.toUpperCase()

    const maoDeObraTerms = [
      'SERVENTE', 'OFICIAL', 'PEDREIRO', 'CARPINTEIRO',
      'ELETRICISTA', 'ENCANADOR', 'MESTRE', 'AJUDANTE',
      'ARMADOR', 'OPERADOR', 'MAO DE OBRA', 'MÃO DE OBRA',
    ]
    const equipTerms = [
      'EQUIPAMENTO', 'BETONEIRA', 'COMPACTADOR', 'ANDAIME',
      'ESCAVADEIRA', 'CAMINHÃO', 'TRATOR', 'MOTO',
      'VIBRADOR', 'COMPRESSOR', 'GUINDASTE', 'RETRO',
    ]

    if (maoDeObraTerms.some((t) => desc.includes(t))) return 'MAO_OBRA'
    if (equipTerms.some((t) => desc.includes(t)))     return 'EQUIP'
    return 'MATERIAL'
  }
}
