/**
 * db-office.ts
 * Multi-Tenant helper functions for offices, invitations, and office members.
 */
import { and, eq, desc, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import {
  offices, InsertOffice, Office,
  officeMembers, InsertOfficeMember, OfficeMember,
  invitations, InsertInvitation, Invitation,
  users,
} from "../drizzle/schema";

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    view_dashboard: true,
    view_vehicles: true, create_vehicles: true, edit_vehicles: true, delete_vehicles: true,
    view_customers: true, create_customers: true, edit_customers: true, delete_customers: false,
    view_contracts: true, create_contracts: true, edit_contracts: true, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: true, create_maintenance: true, edit_maintenance: true,
    view_reports: true,
    manage_branches: true,
    manage_staff: false,
  },
  staff: {
    view_dashboard: true,
    view_vehicles: true, create_vehicles: false, edit_vehicles: false, delete_vehicles: false,
    view_customers: true, create_customers: true, edit_customers: true, delete_customers: false,
    view_contracts: true, create_contracts: true, edit_contracts: true, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: true, create_maintenance: false, edit_maintenance: false,
    view_reports: false,
    manage_branches: false,
    manage_staff: false,
  },
  accountant: {
    view_dashboard: true,
    view_vehicles: true, create_vehicles: false, edit_vehicles: false, delete_vehicles: false,
    view_customers: true, create_customers: false, edit_customers: false, delete_customers: false,
    view_contracts: true, create_contracts: false, edit_contracts: false, delete_contracts: false,
    view_payments: true, create_payments: true,
    view_maintenance: false, create_maintenance: false, edit_maintenance: false,
    view_reports: true,
    manage_branches: false,
    manage_staff: false,
  },
};

// ==================== OFFICES ====================

export async function createOffice(data: InsertOffice): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(offices).values(data);
  return result[0].insertId;
}

export async function getOfficeById(id: number): Promise<Office | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(offices).where(eq(offices.id, id)).limit(1);
  return result[0];
}

export async function updateOffice(id: number, data: Partial<InsertOffice>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(offices).set(data).where(eq(offices.id, id));
}

// ==================== OFFICE MEMBERS ====================

export async function addOfficeMember(data: InsertOfficeMember): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(officeMembers).values(data);
  return result[0].insertId;
}

export async function getOfficeMember(officeId: number, userId: number): Promise<OfficeMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(officeMembers)
    .where(and(eq(officeMembers.officeId, officeId), eq(officeMembers.userId, userId), eq(officeMembers.isActive, true)))
    .limit(1);
  return result[0];
}

export async function getOfficeMembersByOffice(officeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: officeMembers.id,
    userId: officeMembers.userId,
    role: officeMembers.role,
    permissions: officeMembers.permissions,
    isActive: officeMembers.isActive,
    joinedAt: officeMembers.joinedAt,
    name: users.name,
    email: users.email,
  })
    .from(officeMembers)
    .leftJoin(users, eq(officeMembers.userId, users.id))
    .where(and(eq(officeMembers.officeId, officeId), eq(officeMembers.isActive, true)))
    .orderBy(desc(officeMembers.joinedAt));
}

export async function updateOfficeMember(id: number, data: Partial<InsertOfficeMember>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(officeMembers).set(data).where(eq(officeMembers.id, id));
}

export async function removeOfficeMember(officeId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(officeMembers)
    .set({ isActive: false })
    .where(and(eq(officeMembers.officeId, officeId), eq(officeMembers.userId, userId)));
  // Also deactivate user's officeId
  await db.update(users).set({ officeId: null, isActive: false }).where(eq(users.id, userId));
}

// ==================== INVITATIONS ====================

export async function createInvitation(data: {
  officeId: number;
  invitedBy: number;
  email: string;
  role: 'admin' | 'staff' | 'accountant';
  permissions?: Record<string, boolean>;
}): Promise<{ token: string; id: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Cancel any existing pending invitations for this email+office
  await db.update(invitations)
    .set({ status: 'cancelled' })
    .where(and(
      eq(invitations.officeId, data.officeId),
      eq(invitations.email, data.email),
      eq(invitations.status, 'pending')
    ));

  const token = nanoid(64);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
  const perms = data.permissions ?? DEFAULT_PERMISSIONS[data.role] ?? DEFAULT_PERMISSIONS.staff;

  const result = await db.insert(invitations).values({
    officeId: data.officeId,
    invitedBy: data.invitedBy,
    email: data.email,
    role: data.role,
    permissions: perms,
    token,
    status: 'pending',
    expiresAt,
  });

  return { token, id: result[0].insertId };
}

export async function getInvitationByToken(token: string): Promise<Invitation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invitations)
    .where(and(eq(invitations.token, token), eq(invitations.status, 'pending'), gt(invitations.expiresAt, new Date())))
    .limit(1);
  return result[0];
}

export async function getInvitationsByOffice(officeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations)
    .where(eq(invitations.officeId, officeId))
    .orderBy(desc(invitations.createdAt));
}

export async function acceptInvitation(token: string, userId: number): Promise<{ officeId: number; role: string; permissions: unknown }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const invitation = await getInvitationByToken(token);
  if (!invitation) throw new Error('الدعوة غير صالحة أو منتهية الصلاحية');

  // Mark invitation as accepted
  await db.update(invitations)
    .set({ status: 'accepted', acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  // Add user to office_members
  await db.insert(officeMembers).values({
    officeId: invitation.officeId,
    userId,
    role: invitation.role as any,
    permissions: invitation.permissions,
    isActive: true,
  });

  // Update user's officeId and activate them
  await db.update(users).set({
    officeId: invitation.officeId,
    role: invitation.role as any,
    isActive: true,
  }).where(eq(users.id, userId));

  return {
    officeId: invitation.officeId,
    role: invitation.role,
    permissions: invitation.permissions,
  };
}

export async function cancelInvitation(id: number, officeId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(invitations)
    .set({ status: 'cancelled' })
    .where(and(eq(invitations.id, id), eq(invitations.officeId, officeId)));
}

// Mark expired invitations
export async function expireOldInvitations(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(invitations)
    .set({ status: 'expired' })
    .where(and(eq(invitations.status, 'pending'), eq(invitations.expiresAt, new Date())));
}
