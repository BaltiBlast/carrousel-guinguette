export const ADMIN_PERMISSIONS = Object.freeze({
  MANAGE_REVIEWS: "reviews.manage",
  MANAGE_EVENTS: "events.manage",
  MANAGE_RESERVATIONS: "reservations.manage",
  MANAGE_PREFERENCES: "preferences.manage",
});

const ROLE_PERMISSIONS = Object.freeze({
  admin: new Set(Object.values(ADMIN_PERMISSIONS)),
  reservation_manager: new Set([ADMIN_PERMISSIONS.MANAGE_RESERVATIONS]),
});

const ROLE_LABELS = Object.freeze({
  admin: "Administrateur",
  reservation_manager: "Gestionnaire des réservations",
});

const ADMIN_DESTINATIONS = Object.freeze([
  { permission: ADMIN_PERMISSIONS.MANAGE_REVIEWS, path: "/admin/tableau-de-bord" },
  { permission: ADMIN_PERMISSIONS.MANAGE_EVENTS, path: "/admin/evenements" },
  { permission: ADMIN_PERMISSIONS.MANAGE_RESERVATIONS, path: "/admin/reservations" },
  { permission: ADMIN_PERMISSIONS.MANAGE_PREFERENCES, path: "/admin/preferences" },
]);

export function hasAdminPermission(user, permission) {
  return Boolean(ROLE_PERMISSIONS[user?.role]?.has(permission));
}

export function getDefaultAdminPath(user) {
  return ADMIN_DESTINATIONS.find(({ permission }) => hasAdminPermission(user, permission))?.path || null;
}

export function getAdminViewContext(user) {
  return {
    adminAccess: {
      reviews: hasAdminPermission(user, ADMIN_PERMISSIONS.MANAGE_REVIEWS),
      events: hasAdminPermission(user, ADMIN_PERMISSIONS.MANAGE_EVENTS),
      reservations: hasAdminPermission(user, ADMIN_PERMISSIONS.MANAGE_RESERVATIONS),
      preferences: hasAdminPermission(user, ADMIN_PERMISSIONS.MANAGE_PREFERENCES),
    },
    userRoleLabel: ROLE_LABELS[user?.role] || "Utilisateur",
  };
}
