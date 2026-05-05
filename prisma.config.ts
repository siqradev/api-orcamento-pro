import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    // Usamos o comando 'node' com os loaders do TSX e o env-file nativo do Node 22
    seed: 'node --import tsx --env-file .env prisma/seed.ts',
  },
});