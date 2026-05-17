// src/infra/http/routes/routes.ts

import { FastifyInstance } from "fastify";

import { healthRoutes } from "./health.routes";
import { itemsRoutes } from "./items.routes";
import { importRoutes } from "./import.routes";

export async function appRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(itemsRoutes);
  await app.register(importRoutes);
}