export interface CompositionProps {
  parentItemId: string; // ID da Composição pai
  childItemId: string;  // ID do Insumo ou sub-composição
  coeficiente: number;
}

export class Composition {
  constructor(public props: CompositionProps) {}
}