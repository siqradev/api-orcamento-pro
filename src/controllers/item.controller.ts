import { FastifyReply, FastifyRequest } from "fastify";
import { ItemService } from "../services/item.service";

const itemService = new ItemService();

export async function getItemsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = request.query as {
    page?: string;
    limit?: string;
    q?: string;
    tableId?: string;
  };

  const result = await itemService.getItems({
    page: Number(query.page || 1),
    limit: Number(query.limit || 20),
    q: query.q,
    tableId: query.tableId,
  });

  return reply.send(result);
}