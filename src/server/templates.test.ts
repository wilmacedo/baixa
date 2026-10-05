import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db";
import { createTemplates } from "./templates";

let db: Db;
let templates: ReturnType<typeof createTemplates>;

beforeEach(() => {
  db = openDatabase(":memory:");
  templates = createTemplates(db);
});

afterEach(() => db.close());

const rent = {
  name: "Rent",
  amountCents: 100000,
  dueDay: 10,
  group: "fixed",
} as const;

describe("templates", () => {
  it("creates an active template with an id", () => {
    const created = templates.create(rent);

    expect(created).toMatchObject({ ...rent, active: true, position: 1 });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("stores the automatic flag, off by default", () => {
    const manual = templates.create(rent);
    const auto = templates.create({ ...rent, autoPaid: true });

    expect([manual.autoPaid, auto.autoPaid]).toEqual([false, true]);
    expect(templates.update(auto.id, { autoPaid: false })?.autoPaid).toBe(
      false,
    );
  });

  it("appends new templates at the end of the order", () => {
    templates.create(rent);
    const internet = templates.create({ ...rent, name: "Internet" });
    const gym = templates.create({ ...rent, name: "Gym" });

    expect([internet.position, gym.position]).toEqual([2, 3]);
    expect(templates.list().map((t) => t.name)).toEqual([
      "Rent",
      "Internet",
      "Gym",
    ]);
  });

  it("returns a template by id and undefined for an unknown id", () => {
    const created = templates.create(rent);

    expect(templates.get(created.id)).toEqual(created);
    expect(templates.get("missing")).toBeUndefined();
  });

  it("updates only the given fields", () => {
    const created = templates.create(rent);
    const updated = templates.update(created.id, { amountCents: 105000 });

    expect(updated).toEqual({ ...created, amountCents: 105000 });
  });

  it("deactivates and reactivates a template", () => {
    const created = templates.create(rent);

    expect(templates.update(created.id, { active: false })?.active).toBe(false);
    expect(templates.update(created.id, { active: true })?.active).toBe(true);
  });

  it("moves a template to another group", () => {
    const created = templates.create(rent);

    expect(templates.update(created.id, { group: "cards" })?.group).toBe(
      "cards",
    );
  });

  it("returns undefined when updating an unknown template", () => {
    expect(templates.update("missing", { name: "x" })).toBeUndefined();
  });
});
