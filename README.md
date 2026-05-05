# API Orçamento Pro

API profissional para importação, processamento e consulta de tabelas de orçamento:

- SINAPI
- SEINFRA

## Stack

- Node.js
- TypeScript
- Fastify
- Prisma
- PostgreSQL
- Python (Parser)

## Funcionalidades

- Upload de planilhas
- Parsing universal
- Persistência em banco
- API Key auth
- Consulta por código

## Endpoints

POST /import
GET /items/:code
GET /health

## Rodando localmente

```bash
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev