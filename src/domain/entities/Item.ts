// Seguindo a regra de "Regras de negócio e tipos puros" do seu PDF
export interface ItemProps {
  id?: string;
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: 'INSUMO' | 'COMPOSICAO';
  fonte: string; // ex: SINAPI
}

export class Item {
  constructor(public props: ItemProps) {
    if (!props.descricao) {
      throw new Error("A descrição do item é obrigatória.");
    }
  }

  get codigo() { return this.props.codigo; }
  get descricao() { return this.props.descricao; }
}