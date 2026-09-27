// Display names for the backend's UserRole values — shared by the profile card and the
// "who cancelled / refunded this order" log lines.
export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  STAFF: 'Kitchen staff',
  INVENTORY_MANAGER: 'Inventory manager',
  SUPER_ADMIN: 'Platform admin',
};

/**
 * "Asha (Kitchen staff)" for a populated user reference (the backend sends `{ name, role }` for
 * an order's cancelledByUserId / refundedByUserId); null when there's no one to name.
 */
export const describeActor = (actor: unknown): string | null => {
  if (!actor || typeof actor !== 'object') return null;
  const { name, role } = actor as { name?: string; role?: string };
  if (!name) return null;
  return role ? `${name} (${ROLE_LABELS[role] || role})` : name;
};
