import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

export async function readBody<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, {
      message: "Request body must be valid JSON",
    });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HTTPException(400, { message: z.prettifyError(result.error) });
  }
  return result.data;
}

export function notFound(what: string): HTTPException {
  return new HTTPException(404, { message: `${what} not found` });
}

export function handleError(error: Error, c: Context) {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
}
