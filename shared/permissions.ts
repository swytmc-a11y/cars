// Single source of truth for per-module permissions, shared by the tRPC
// enforcement middleware (server) and the staff-management UI (client).
// Keys keep the legacy flat `action_module` format already stored in
// office_members.permissions, so existing saved records remain valid.

export type MemberRole = "owner" | "admin" | "staff" | "accountant";

export interface PermissionAction {
  key: string;
  label: string;
}

export interface PermissionModule {
  key: string;
  label: string;
  actions: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    actions: [{ key: "view_dashboard", label: "عرض" }],
  },
  {
    key: "vehicles",
    label: "السيارات",
    actions: [
      { key: "view_vehicles", label: "عرض" },
      { key: "create_vehicles", label: "إضافة" },
      { key: "edit_vehicles", label: "تعديل" },
      { key: "delete_vehicles", label: "حذف" },
    ],
  },
  {
    key: "tracking",
    label: "تتبع السيارات",
    actions: [{ key: "view_tracking", label: "عرض" }],
  },
  {
    key: "customers",
    label: "العملاء",
    actions: [
      { key: "view_customers", label: "عرض" },
      { key: "create_customers", label: "إضافة" },
      { key: "edit_customers", label: "تعديل" },
      { key: "delete_customers", label: "حذف" },
    ],
  },
  {
    key: "reservations",
    label: "الحجوزات",
    actions: [
      { key: "view_reservations", label: "عرض" },
      { key: "create_reservations", label: "إضافة" },
      { key: "edit_reservations", label: "تعديل" },
    ],
  },
  {
    key: "contracts",
    label: "العقود",
    actions: [
      { key: "view_contracts", label: "عرض" },
      { key: "create_contracts", label: "إنشاء" },
      { key: "edit_contracts", label: "تعديل" },
      { key: "delete_contracts", label: "حذف" },
    ],
  },
  {
    key: "payments",
    label: "المدفوعات",
    actions: [
      { key: "view_payments", label: "عرض" },
      { key: "create_payments", label: "تسجيل دفعات" },
    ],
  },
  {
    key: "transfers",
    label: "النقل بين الفروع",
    actions: [
      { key: "view_transfers", label: "عرض" },
      { key: "create_transfers", label: "إنشاء واستلام" },
    ],
  },
  {
    key: "maintenance",
    label: "الصيانة",
    actions: [
      { key: "view_maintenance", label: "عرض" },
      { key: "create_maintenance", label: "جدولة" },
      { key: "edit_maintenance", label: "تعديل" },
    ],
  },
  {
    key: "reports",
    label: "التقارير",
    actions: [{ key: "view_reports", label: "عرض" }],
  },
  {
    key: "alerts",
    label: "التنبيهات",
    actions: [{ key: "view_alerts", label: "عرض" }],
  },
  {
    key: "branches",
    label: "الفروع",
    actions: [{ key: "manage_branches", label: "إدارة" }],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_MODULES.flatMap(m =>
  m.actions.map(a => a.key),
);

function template(overrides: Record<string, boolean>): Record<string, boolean> {
  const base = Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, false]));
  return { ...base, ...overrides };
}

// Role templates: applied as the fallback when a member has no explicit
// setting for a key, and offered as one-click presets in the UI.
export const ROLE_TEMPLATES: Record<Exclude<MemberRole, "owner">, Record<string, boolean>> = {
  admin: template({
    view_dashboard: true,
    view_vehicles: true, create_vehicles: true, edit_vehicles: true, delete_vehicles: true,
    view_tracking: true,
    view_customers: true, create_customers: true, edit_customers: true,
    view_reservations: true, create_reservations: true, edit_reservations: true,
    view_contracts: true, create_contracts: true, edit_contracts: true,
    view_payments: true, create_payments: true,
    view_transfers: true, create_transfers: true,
    view_maintenance: true, create_maintenance: true, edit_maintenance: true,
    view_reports: true,
    view_alerts: true,
    manage_branches: true,
  }),
  staff: template({
    view_dashboard: true,
    view_vehicles: true,
    view_tracking: true,
    view_customers: true, create_customers: true, edit_customers: true,
    view_reservations: true, create_reservations: true, edit_reservations: true,
    view_contracts: true, create_contracts: true, edit_contracts: true,
    view_payments: true, create_payments: true,
    view_transfers: true,
    view_maintenance: true,
    view_alerts: true,
  }),
  accountant: template({
    view_dashboard: true,
    view_vehicles: true,
    view_customers: true,
    view_contracts: true,
    view_payments: true, create_payments: true,
    view_reports: true,
    view_alerts: true,
  }),
};

/**
 * Resolve whether a member may perform an action.
 * - Owner: always allowed.
 * - Explicit boolean in the member's saved permissions wins.
 * - Otherwise fall back to the role template (so adding new permission keys
 *   never locks out members whose saved record predates the key).
 */
export function resolvePermission(
  role: string | null | undefined,
  permissions: unknown,
  key: string,
): boolean {
  if (role === "owner") return true;
  const perms =
    typeof permissions === "string"
      ? (safeParse(permissions) as Record<string, unknown> | null)
      : (permissions as Record<string, unknown> | null);
  const explicit = perms?.[key];
  if (typeof explicit === "boolean") return explicit;
  const roleTemplate = ROLE_TEMPLATES[role as Exclude<MemberRole, "owner">];
  return roleTemplate?.[key] ?? false;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
