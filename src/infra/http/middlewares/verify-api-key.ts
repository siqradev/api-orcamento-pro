import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../database/prisma'; 

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({ error: 'API Key ausente.' });
  }

  try {
    // 2. Aqui usaremos a instância que já foi configurada no arquivo central
    const keyExists = await prisma.apiKey.findUnique({
      where: { key: apiKey, active: true }
    });

    if (!keyExists) {
      return reply.status(403).send({ error: 'API Key inválida ou inativa.' });
    }
  } catch (error) {
    console.error('Erro ao verificar API Key:', error);
    return reply.status(500).send({ error: 'Erro interno no servidor.' });
  }
}