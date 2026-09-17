import assert from "node:assert/strict";
import test from "node:test";

import { requirePermission } from "../modules/admin/admin.middlewares.js";
import { ADMIN_PERMISSIONS } from "../modules/admin/admin.permissions.js";

test("une route non autorisée poursuit vers la gestion 404", () => {
  const middleware = requirePermission(ADMIN_PERMISSIONS.MANAGE_EVENTS);
  let nextValue;

  middleware({ adminUser: { role: "reservation_manager" } }, {}, (value) => {
    nextValue = value;
  });

  assert.equal(nextValue, "route");
});

test("une route autorisée poursuit son traitement normal", () => {
  const middleware = requirePermission(ADMIN_PERMISSIONS.MANAGE_RESERVATIONS);
  let nextValue = "not-called";

  middleware({ adminUser: { role: "reservation_manager" } }, {}, (value) => {
    nextValue = value;
  });

  assert.equal(nextValue, undefined);
});
