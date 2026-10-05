import { Hono } from "hono";
import { notFound, readBody } from "../http";
import { templateInput, templatePatch } from "../schemas";
import type { Templates } from "../templates";

export function templateRoutes(templates: Templates) {
  const routes = new Hono();

  routes.get("/", (c) => c.json(templates.list()));

  routes.post("/", async (c) => {
    const input = await readBody(c, templateInput);
    return c.json(templates.create(input), 201);
  });

  routes.put("/:id", async (c) => {
    const patch = await readBody(c, templatePatch);
    const updated = templates.update(c.req.param("id"), patch);
    if (!updated) throw notFound("Template");
    return c.json(updated);
  });

  return routes;
}
