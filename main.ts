import Fastify from 'fastify';
import multipart from '@fastify/multipart'; // 1. IMPORTANTE: Importar o plugin
import { verifyApiKey } from './src/infra/http/middlewares/verify-api-key';
import { prisma } from './src/infra/database/prisma';
import { PrismaItemsRepository } from './src/infra/database/PrismaItemsRepository';

import { ImportTableUseCase } from './src/application/use-cases/ImportTableUseCase';
import { SinapiScraper } from './src/infra/scrapers/SinapiScraper';
import { ImportController } from './src/infra/http/controllers/ImportController';
import { GetItemController } from './src/infra/http/controllers/GetItemController'

const app = Fastify({
  logger: true,
  connectionTimeout: 300000 
});

// 2. REGISTRAR O PLUGIN MULTIPART ANTES DE TUDO
// Isso resolve o erro "request.file is not a function"
app.register(multipart, {
  limits: {
    fieldNameSize: 100, // Max field name size em bytes
    fieldSize: 100,     // Max field value size em bytes
    fields: 10,         // Max número de campos non-file
    fileSize: 100000000, // LImite de 100MB para o arquivo da tabela
    files: 1            // Max número de arquivos por requisição
  }
});

// 3. Segurança Global
app.addHook('preHandler', verifyApiKey);

// 4. Injeção de Dependências
const repository = new PrismaItemsRepository(prisma);
const scraper = new SinapiScraper();

const getItemController = new GetItemController()
const importTableUseCase = new ImportTableUseCase(scraper, repository);
const importController = new ImportController(importTableUseCase);

// 5. Definição das Rotas
app.post('/import', (req, res) => importController.handle(req, res));

app.get('/health', async () => {
  return { 
    status: 'ok', 
    service: 'api_orcamento_pro',
    timestamp: new Date().toISOString()
  };
});

app.get('/items/:code',(req, res) =>
    getItemController.handle(req, res)
)

const start = async () => {
  try {
    // Porta alterada para 3000 conforme seu código, mas verifique se o Insomnia aponta para ela
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 API de Orçamento Profissional rodando em http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();