import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
};

describe("api", () => {
  it("fetches a month", async () => {
    const data = { month: "2026-10", templates: [], entries: [], expenses: [] };
    fetchMock.mockResolvedValue(json(data));

    expect(await api.getMonth("2026-10")).toEqual(data);
    expect(lastCall().url).toBe("/api/months/2026-10");
    expect(lastCall().init.method).toBe("GET");
    expect(lastCall().init.body).toBeUndefined();
  });

  it("saves an entry without repeating the template id in the body", async () => {
    const entry = {
      templateId: "t1",
      amountCents: 100000,
      paidAt: "2026-10-05",
    };
    fetchMock.mockResolvedValue(json(entry));

    await api.saveEntry("2026-10", entry);

    const { url, init } = lastCall();
    expect(url).toBe("/api/months/2026-10/entries/t1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      amountCents: 100000,
      paidAt: "2026-10-05",
    });
  });

  it("creates an expense with a JSON body that includes its id", async () => {
    const expense = {
      id: "e1",
      description: "Lunch",
      amountCents: 4590,
      category: "leisure",
      spentOn: "2026-10-03",
    } as const;
    fetchMock.mockResolvedValue(json(expense, 201));

    const created = await api.createExpense(expense);

    const { url, init } = lastCall();
    expect(created.id).toBe("e1");
    expect(url).toBe("/api/expenses");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual(expense);
  });

  it("fetches the expense description history", async () => {
    const history = [{ description: "Lunch", category: "leisure" }];
    fetchMock.mockResolvedValue(json(history));

    expect(await api.expenseHistory()).toEqual(history);
    expect(lastCall().url).toBe("/api/expenses/history");
  });

  it("deletes an expense and returns nothing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await api.deleteExpense("e1")).toBeUndefined();
    expect(lastCall().url).toBe("/api/expenses/e1");
    expect(lastCall().init.method).toBe("DELETE");
  });

  it("updates a template with a partial body", async () => {
    fetchMock.mockResolvedValue(json({ id: "t1" }));

    await api.updateTemplate("t1", { active: false });

    expect(lastCall().url).toBe("/api/templates/t1");
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      active: false,
    });
  });

  it("throws an ApiError with the server message", async () => {
    fetchMock.mockResolvedValue(json({ error: "Template not found" }, 404));

    const failure = await api.updateTemplate("x", {}).catch((e) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 404,
      message: "Template not found",
    });
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>", { status: 502, statusText: "Bad Gateway" }),
    );

    const failure = await api.getMonth("2026-10").catch((e) => e);

    expect(failure).toMatchObject({ status: 502, message: "Bad Gateway" });
  });

  it("lets network failures through", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(api.getMonth("2026-10")).rejects.toThrow("fetch failed");
  });
});
