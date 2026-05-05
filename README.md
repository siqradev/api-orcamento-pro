# 📊 API Orçamento Pro

<p align="center">
  <img src="https://shields.io" />
  <img src="https://shields.io" />
  <img src="https://shields.io" />
  <img src="https://shields.io" />
  <img src="https://shields.io" />
  <img src="https://shields.io" />
</p>

<p align="center">
  <strong>API profissional para importação, processamento e consulta de tabelas de orçamento (SINAPI, SEINFRA).</strong>
</p>

<p align="center">
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-api-endpoints">Endpoints</a>
</p>

---

## 🚀 Sobre o Projeto

O **API Orçamento Pro** é uma solução robusta para engenheiros e desenvolvedores que precisam lidar com grandes volumes de dados de tabelas de custos de construção civil. Ele automatiza o parsing de planilhas complexas e expõe os dados através de uma API de alta performance.

## ✨ Funcionalidades

- [x] **Upload Inteligente:** Suporte para planilhas .xlsx e .csv.
- [x] **Parsing Universal:** Motor em Python especializado em tabelas SINAPI e SEINFRA.
- [x] **Persistência Segura:** Banco de dados PostgreSQL otimizado com Prisma ORM.
- [x] **Segurança:** Autenticação via API Key.
- [x] **Consulta Rápida:** Busca por código de insumo ou composição em milissegundos.

## 🛠 Tecnologias

As seguintes ferramentas foram usadas na construção do projeto:

- **Backend:** Node.js + TypeScript
- **Framework:** Fastify (Alta performance)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Data Engine:** Python (Scripts de parsing com Pandas/Openpyxl)

## 📦 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com

# 2. Instale as dependências
npm install

# 3. Configure o Banco de Dados (variáveis de ambiente no .env)
npx prisma migrate dev

# 4. Alimente o banco inicial (Seed)
npx tsx prisma/seed.ts

# 5. Inicie o servidor
npm run dev
```

## 🔌 API Endpoints


| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/import` | Realiza o upload e processamento de nova tabela. |
| `GET` | `/items/:code` | Retorna detalhes de um item específico pelo código. |
| `GET` | `/health` | Verifica o status da API e do banco de dados. |

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
<p align="center">
  Feito por <strong>Siqra Dev</strong>
</p>
