import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_PERMISSIONS,
  getAdminViewContext,
  getDefaultAdminPath,
  hasAdminPermission,
} from "../modules/admin/admin.permissions.js";

test("un administrateur possède toutes les permissions", () => {
  const administrator = { role: "admin" };

  for (const permission of Object.values(ADMIN_PERMISSIONS)) {
    assert.equal(hasAdminPermission(administrator, permission), true);
  }
});

test("un gestionnaire de réservations ne possède que la permission des réservations", () => {
  const reservationManager = { role: "reservation_manager" };

  assert.equal(hasAdminPermission(reservationManager, ADMIN_PERMISSIONS.MANAGE_RESERVATIONS), true);
  assert.equal(hasAdminPermission(reservationManager, ADMIN_PERMISSIONS.MANAGE_REVIEWS), false);
  assert.equal(hasAdminPermission(reservationManager, ADMIN_PERMISSIONS.MANAGE_EVENTS), false);
  assert.equal(hasAdminPermission(reservationManager, ADMIN_PERMISSIONS.MANAGE_PREFERENCES), false);
});

test("la redirection après connexion dépend des permissions du rôle", () => {
  assert.equal(getDefaultAdminPath({ role: "admin" }), "/admin/tableau-de-bord");
  assert.equal(getDefaultAdminPath({ role: "reservation_manager" }), "/admin/reservations");
  assert.equal(getDefaultAdminPath({ role: "unknown" }), null);
});

test("le contexte d’interface reflète les accès du gestionnaire de réservations", () => {
  assert.deepEqual(getAdminViewContext({ role: "reservation_manager" }), {
    adminAccess: {
      reviews: false,
      events: false,
      reservations: true,
      preferences: false,
    },
    userRoleLabel: "Gestionnaire des réservations",
  });
});
