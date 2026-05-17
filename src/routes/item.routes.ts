import { FastifyInstance } from "fastify";
import { getItemsController } from "../controllers/item.controller";

export async function itemRoutes(app: FastifyInstance) {
  app.get("/items", getItemsController);
}