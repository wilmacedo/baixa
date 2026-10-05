import type { MonthKey } from "../shared/months";
import type {
  Entry,
  Expense,
  ExpenseInput,
  MonthData,
  Template,
  TemplateInput,
  TemplatePatch,
} from "../shared/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  getMonth: (month: MonthKey) => request<MonthData>("GET", `/months/${month}`),

  saveEntry: (month: MonthKey, { templateId, ...values }: Entry) =>
    request<Entry>("PUT", `/months/${month}/entries/${templateId}`, values),

  listTemplates: () => request<Template[]>("GET", "/templates"),

  createTemplate: (input: TemplateInput) =>
    request<Template>("POST", "/templates", input),

  updateTemplate: (id: string, patch: TemplatePatch) =>
    request<Template>("PUT", `/templates/${id}`, patch),

  createExpense: (input: ExpenseInput) =>
    request<Expense>("POST", "/expenses", input),

  replaceExpense: (id: string, input: ExpenseInput) =>
    request<Expense>("PUT", `/expenses/${id}`, input),

  deleteExpense: (id: string) => request<void>("DELETE", `/expenses/${id}`),
};
