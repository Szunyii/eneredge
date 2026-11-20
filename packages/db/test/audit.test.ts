import { afterAll, beforeAll, expect, test } from "bun:test";
import { audit } from "../src/repositories/audit.ts";
import { createTestDatabase, type TestDatabase } from "../src/testing.ts";

let database: TestDatabase;
beforeAll(async () => {
  database = await createTestDatabase();
});
afterAll(() => database.close());

test("the detail of an audit row is stored as a JSON object, readable in SQL", async () => {
  await database.db.transaction((transaction) =>
    audit.record(transaction, {
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "park.update",
      targetType: "park",
      targetId: "park-1",
      detail: { changed: ["name", "timezone"] },
    }),
  );

  const [row] = await database.db.$client`
    select jsonb_typeof(detail) as kind, detail -> 'changed' ->> 0 as first_changed, detail
    from audit_log where target_id = 'park-1'
  `;
  expect(row.kind).toBe("object");
  expect(row.first_changed).toBe("name");
  expect(row.detail).toEqual({ changed: ["name", "timezone"] });
});

test("an audit row without detail has an empty object", async () => {
  await database.db.transaction((transaction) =>
    audit.record(transaction, {
      organizationId: null,
      actorUserId: null,
      action: "park.delete",
      targetType: "park",
      targetId: "park-2",
    }),
  );

  const [row] = await database.db
    .$client`select detail, at from audit_log where target_id = 'park-2'`;
  expect(row.detail).toEqual({});
  expect(row.at).toBeInstanceOf(Date);
});
