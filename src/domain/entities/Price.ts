export interface PriceProps {
  itemId: string;
  uf: string;
  valor: number;
  dataBase: Date;
  comDesoneracao: boolean;
}

export class Price {
  constructor(public props: PriceProps) {}

  get valorFormatado() {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.props.valor);
  }
}