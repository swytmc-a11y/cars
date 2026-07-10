import { and, desc, eq, gte, like, lte, ne, or, sql, count, sum, inArray, lt } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql, { Pool } from "mysql2/promise";
import {
  InsertUser, users,
  refreshTokens, InsertRefreshToken,
  otpCodes, InsertOtpCode,
  branches, InsertBranch,
  vehicles, InsertVehicle,
  customers, InsertCustomer,
  reservations, InsertReservation,
  contracts, InsertContract,
  handovers, InsertHandover,
  returns, InsertReturn,
  payments, InsertPayment,
  transfers, InsertTransfer,
  maintenance, InsertMaintenance,
  vehicleDocuments, InsertVehicleDocument,
  vehicleHistory, InsertVehicleHistory,
  vehicleLocations, InsertVehicleLocation,
  auditLogs, InsertAuditLog,
  alerts, InsertAlert,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: MySql2Database<any> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      // Remove ssl JSON fragment from URL if present (TiDB Cloud format)
      const cleanUrl = dbUrl.replace(/\?ssl=\{[^}]*\}/, '');
      _pool = mysql.createPool({
        uri: cleanUrl,
        ssl: { rejectUnauthorized: true },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      _db = drizzle(_pool);
      console.log('[Database] Connected to TiDB Cloud successfully');
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    if (user.isActive !== undefined) { values.isActive = user.isActive; updateSet.isActive = user.isActive; }
    if (user.officeId !== undefined) { values.officeId = user.officeId; updateSet.officeId = user.officeId; }

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    else { values.role = 'staff'; }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(officeId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (officeId) conditions.push(eq(users.officeId, officeId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(users).where(where).orderBy(desc(users.createdAt));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'owner' | 'admin' | 'staff' | 'accountant';
  officeId?: number | null;
  userType?: 'owner' | 'employee';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Use email as openId for local users (prefixed)
  const openId = `local_${data.email}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: 'local',
    passwordHash: data.passwordHash,
    role: data.role ?? 'staff',
    officeId: data.officeId ?? null,
    userType: data.userType ?? 'employee',
    isActive: data.userType === 'owner' ? true : false,
    lastSignedIn: new Date(),
  });
  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return created[0];
}

export async function saveRefreshToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(refreshTokens).values({ userId, token, expiresAt });
}

export async function getRefreshToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteRefreshToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

export async function deleteExpiredRefreshTokens() {
  const db = await getDb();
  if (!db) return;
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== BRANCHES ====================
export async function getAllBranches(officeId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(branches.isActive, true)];
  if (officeId) conditions.push(eq(branches.officeId, officeId));
  return db.select().from(branches).where(and(...conditions)).orderBy(desc(branches.createdAt));
}

export async function getBranchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return result[0];
}

export async function createBranch(data: InsertBranch) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(branches).values(data);
  return result[0].insertId;
}

export async function updateBranch(id: number, data: Partial<InsertBranch>) {
  const db = await getDb();
  if (!db) return;
  await db.update(branches).set(data).where(eq(branches.id, id));
}

// ==================== VEHICLES ====================
export async function getAllVehicles(filters?: { branchId?: number; status?: string; category?: string; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(vehicles.isActive, true)];
  if (filters?.officeId) conditions.push(eq(vehicles.officeId, filters.officeId));
  if (filters?.branchId) conditions.push(eq(vehicles.branchId, filters.branchId));
  if (filters?.status) conditions.push(eq(vehicles.status, filters.status as any));
  if (filters?.category) conditions.push(eq(vehicles.category, filters.category as any));
  return db.select().from(vehicles).where(and(...conditions)).orderBy(desc(vehicles.createdAt));
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result[0];
}

export async function createVehicle(data: InsertVehicle) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(vehicles).values(data);
  return result[0].insertId;
}

export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
}

// ==================== CUSTOMERS ====================
export async function getAllCustomers(search?: string, officeId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(customers.isActive, true)];
  if (officeId) conditions.push(eq(customers.officeId, officeId));
  if (search) {
    conditions.push(or(
      like(customers.name, `%${search}%`),
      like(customers.phone, `%${search}%`),
      like(customers.idNumber, `%${search}%`)
    )!);
  }
  return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result[0];
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(customers).values(data);
  return result[0].insertId;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

// ==================== RESERVATIONS ====================
export async function getAllReservations(filters?: { status?: string; vehicleId?: number; customerId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(reservations.officeId, filters.officeId));
  if (filters?.status) conditions.push(eq(reservations.status, filters.status as any));
  if (filters?.vehicleId) conditions.push(eq(reservations.vehicleId, filters.vehicleId));
  if (filters?.customerId) conditions.push(eq(reservations.customerId, filters.customerId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(reservations).where(where).orderBy(desc(reservations.createdAt));
}

export async function checkReservationConflict(vehicleId: number, startDate: Date, endDate: Date, excludeId?: number) {
  const db = await getDb();
  if (!db) return false;
  const conditions = [
    eq(reservations.vehicleId, vehicleId),
    or(eq(reservations.status, 'pending'), eq(reservations.status, 'confirmed'))!,
    lte(reservations.startDate, endDate),
    gte(reservations.endDate, startDate),
  ];
  if (excludeId) conditions.push(ne(reservations.id, excludeId));
  const result = await db.select({ count: count() }).from(reservations).where(and(...conditions));
  return (result[0]?.count ?? 0) > 0;
}

export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(reservations).values(data);
  return result[0].insertId;
}

export async function getReservationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return result[0];
}

export async function updateReservation(id: number, data: Partial<InsertReservation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(reservations).set(data).where(eq(reservations.id, id));
}

// ==================== CONTRACTS ====================
export async function getAllContracts(filters?: { status?: string; branchId?: number; customerId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(contracts.officeId, filters.officeId));
  if (filters?.status) conditions.push(eq(contracts.status, filters.status as any));
  if (filters?.branchId) conditions.push(eq(contracts.branchId, filters.branchId));
  if (filters?.customerId) conditions.push(eq(contracts.customerId, filters.customerId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(contracts).where(where).orderBy(desc(contracts.createdAt));
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result[0];
}

export async function getNextContractNumber() {
  const db = await getDb();
  if (!db) return "RC-0001";
  const year = new Date().getFullYear();
  const result = await db.select({ count: count() }).from(contracts);
  const num = (result[0]?.count ?? 0) + 1;
  return `RC-${year}-${String(num).padStart(5, '0')}`;
}

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(contracts).values(data);
  return result[0].insertId;
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contracts).set(data).where(eq(contracts.id, id));
}

// ==================== HANDOVERS ====================
export async function getHandoverByContractId(contractId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(handovers).where(eq(handovers.contractId, contractId)).limit(1);
  return result[0];
}

export async function createHandover(data: InsertHandover) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(handovers).values(data);
  return result[0].insertId;
}

// ==================== RETURNS ====================
export async function getReturnByContractId(contractId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(returns).where(eq(returns.contractId, contractId)).limit(1);
  return result[0];
}

export async function createReturn(data: InsertReturn) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(returns).values(data);
  return result[0].insertId;
}

// ==================== PAYMENTS ====================
export async function getPaymentsByContractId(contractId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.contractId, contractId)).orderBy(desc(payments.paidAt));
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(payments).values(data);
  return result[0].insertId;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result[0];
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function getTotalPaymentsByContract(contractId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.contractId, contractId));
  return Number(result[0]?.total ?? 0);
}

// ==================== TRANSFERS ====================
export async function getAllTransfers(filters?: { status?: string; vehicleId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(transfers.officeId, filters.officeId));
  if (filters?.status) conditions.push(eq(transfers.status, filters.status as any));
  if (filters?.vehicleId) conditions.push(eq(transfers.vehicleId, filters.vehicleId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(transfers).where(where).orderBy(desc(transfers.initiatedAt));
}

export async function createTransfer(data: InsertTransfer) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(transfers).values(data);
  return result[0].insertId;
}

export async function updateTransfer(id: number, data: Partial<InsertTransfer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transfers).set(data).where(eq(transfers.id, id));
}

// ==================== MAINTENANCE ====================
export async function getAllMaintenance(filters?: { vehicleId?: number; status?: string; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(maintenance.officeId, filters.officeId));
  if (filters?.vehicleId) conditions.push(eq(maintenance.vehicleId, filters.vehicleId));
  if (filters?.status) conditions.push(eq(maintenance.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(maintenance).where(where).orderBy(desc(maintenance.createdAt));
}

export async function createMaintenance(data: InsertMaintenance) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(maintenance).values(data);
  return result[0].insertId;
}

export async function updateMaintenance(id: number, data: Partial<InsertMaintenance>) {
  const db = await getDb();
  if (!db) return;
  await db.update(maintenance).set(data).where(eq(maintenance.id, id));
}

// ==================== VEHICLE DOCUMENTS ====================
export async function getVehicleDocuments(vehicleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, vehicleId)).orderBy(desc(vehicleDocuments.createdAt));
}

export async function createVehicleDocument(data: InsertVehicleDocument) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(vehicleDocuments).values(data);
  return result[0].insertId;
}

// ==================== VEHICLE HISTORY ====================
export async function getVehicleHistory(vehicleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vehicleHistory).where(eq(vehicleHistory.vehicleId, vehicleId)).orderBy(desc(vehicleHistory.createdAt));
}

export async function addVehicleHistory(data: InsertVehicleHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(vehicleHistory).values(data);
}

// ==================== VEHICLE LOCATIONS (GPS tracking) ====================
export async function ingestVehicleLocation(data: InsertVehicleLocation) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(vehicleLocations).values(data);
  return result[0].insertId;
}

export async function getLatestVehicleLocations(officeId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(vehicleLocations)
    .where(eq(vehicleLocations.officeId, officeId))
    .orderBy(desc(vehicleLocations.recordedAt));
  const latestByVehicle = new Map<number, typeof rows[number]>();
  for (const row of rows) {
    if (!latestByVehicle.has(row.vehicleId)) latestByVehicle.set(row.vehicleId, row);
  }
  return Array.from(latestByVehicle.values());
}

export async function getVehicleLocationHistory(vehicleId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(vehicleLocations.vehicleId, vehicleId)];
  if (from) conditions.push(gte(vehicleLocations.recordedAt, from));
  if (to) conditions.push(lte(vehicleLocations.recordedAt, to));
  return db
    .select()
    .from(vehicleLocations)
    .where(and(...conditions))
    .orderBy(desc(vehicleLocations.recordedAt));
}

// ==================== AUDIT LOG ====================
export async function getAuditLogs(filters?: { entityType?: string; entityId?: number; userId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(auditLogs.officeId, filters.officeId));
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt));
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

// ==================== ALERTS ====================
export async function getAlerts(filters?: { isRead?: boolean; branchId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(alerts.officeId, filters.officeId));
  if (filters?.isRead !== undefined) conditions.push(eq(alerts.isRead, filters.isRead));
  if (filters?.branchId) conditions.push(eq(alerts.branchId, filters.branchId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt));
}

export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(alerts).values(data);
}

export async function markAlertAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(alerts).set({ isRead: true, readAt: new Date() }).where(eq(alerts.id, id));
}

export async function markAllAlertsAsRead(branchId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(alerts.isRead, false)];
  if (branchId) conditions.push(eq(alerts.branchId, branchId));
  await db.update(alerts).set({ isRead: true, readAt: new Date() }).where(and(...conditions));
}

// ==================== VEHICLE STATS ====================
export async function getVehicleStats(vehicleId: number) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalContracts: 0, occupancyRate: 0, totalDaysRented: 0 };
  // Total contracts and revenue
  const vehicleContracts = await db.select().from(contracts).where(eq(contracts.vehicleId, vehicleId));
  const totalContracts = vehicleContracts.length;
  const totalRevenue = vehicleContracts.reduce((sum, c) => sum + Number(c.finalPrice || c.basePrice || 0), 0);
  const totalDaysRented = vehicleContracts.reduce((sum, c) => sum + (c.totalDays || 0), 0);
  // Occupancy rate (last 90 days)
  const daysInPeriod = 90;
  const occupancyRate = daysInPeriod > 0 ? Math.round((totalDaysRented / daysInPeriod) * 100) : 0;
  return { totalRevenue, totalContracts, occupancyRate: Math.min(occupancyRate, 100), totalDaysRented };
}

// ==================== ALL PAYMENTS (for export) ====================
export async function getAllPayments(filters?: { branchId?: number; contractId?: number; officeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.officeId) conditions.push(eq(payments.officeId, filters.officeId));
  if (filters?.contractId) conditions.push(eq(payments.contractId, filters.contractId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select({
      id: payments.id,
      contractId: payments.contractId,
      amount: payments.amount,
      method: payments.method,
      notes: payments.notes,
      paidAt: payments.paidAt,
      contractNumber: contracts.contractNumber,
      customerName: customers.name,
      vehiclePlate: vehicles.plateNumber,
    })
    .from(payments)
    .leftJoin(contracts, eq(payments.contractId, contracts.id))
    .leftJoin(customers, eq(contracts.customerId, customers.id))
    .leftJoin(vehicles, eq(contracts.vehicleId, vehicles.id))
    .where(where)
    .orderBy(desc(payments.paidAt));
}

// ==================== PAYMENTS BY CUSTOMER ====================
export async function getPaymentsByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all contracts for this customer then get payments
  const customerContracts = await db.select().from(contracts).where(eq(contracts.customerId, customerId));
  if (customerContracts.length === 0) return [];
  const contractIds = customerContracts.map(c => c.id);
  const allPayments = await db.select().from(payments).where(inArray(payments.contractId, contractIds)).orderBy(desc(payments.paidAt));
  return allPayments;
}

// ==================== DASHBOARD STATS ====================
export async function getDashboardStats(branchId?: number, officeId?: number) {
  const db = await getDb();
  if (!db) return null;
  const vehicleConditions: any[] = [eq(vehicles.isActive, true)];
  if (branchId) vehicleConditions.push(eq(vehicles.branchId, branchId));
  if (officeId) vehicleConditions.push(eq(vehicles.officeId, officeId));
  const allVehicles = await db.select().from(vehicles).where(and(...vehicleConditions));
  const totalVehicles = allVehicles.length;
  const available = allVehicles.filter(v => v.status === 'available').length;
  const rented = allVehicles.filter(v => v.status === 'rented').length;
  const inMaintenance = allVehicles.filter(v => v.status === 'maintenance').length;
  const late = allVehicles.filter(v => v.status === 'late').length;
  const inTransfer = allVehicles.filter(v => v.status === 'in_transfer').length;
  // Active contracts filtered by officeId
  const contractConditions: any[] = [eq(contracts.status, 'active')];
  if (officeId) contractConditions.push(eq(contracts.officeId, officeId));
  const activeContracts = await db.select({ count: count() }).from(contracts).where(and(...contractConditions));
  // Unread alerts filtered by officeId
  const alertConditions: any[] = [eq(alerts.isRead, false)];
  if (officeId) alertConditions.push(eq(alerts.officeId, officeId));
  const unreadAlerts = await db.select({ count: count() }).from(alerts).where(and(...alertConditions));
  // Revenue this month filtered by officeId
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueConditions: any[] = [gte(payments.paidAt, startOfMonth)];
  if (officeId) revenueConditions.push(eq(payments.officeId, officeId));
  const monthlyRevenue = await db.select({ total: sum(payments.amount) }).from(payments).where(and(...revenueConditions));
  return {
    totalVehicles,
    available,
    rented,
    inMaintenance,
    late,
    inTransfer,
    occupancyRate: totalVehicles > 0 ? Math.round((rented / totalVehicles) * 100) : 0,
    activeContracts: activeContracts[0]?.count ?? 0,
    unreadAlerts: unreadAlerts[0]?.count ?? 0,
    monthlyRevenue: Number(monthlyRevenue[0]?.total ?? 0),
  };
}

// ==================== GLOBAL SEARCH ====================
export async function globalSearch(query: string, officeId?: number) {
  const db = await getDb();
  if (!db || !query.trim()) return { vehicles: [], customers: [], contracts: [] };
  const q = `%${query.trim()}%`;
  const vehicleConditions: any[] = [
    eq(vehicles.isActive, true),
    or(like(vehicles.plateNumber, q), like(vehicles.brand, q), like(vehicles.model, q))!
  ];
  if (officeId) vehicleConditions.push(eq(vehicles.officeId, officeId));
  const vehicleResults = await db.select({
    id: vehicles.id,
    plateNumber: vehicles.plateNumber,
    brand: vehicles.brand,
    model: vehicles.model,
    year: vehicles.year,
    status: vehicles.status,
  }).from(vehicles).where(and(...vehicleConditions)).limit(5);
  const customerConditions: any[] = [
    eq(customers.isActive, true),
    or(like(customers.name, q), like(customers.phone, q), like(customers.idNumber, q))!
  ];
  if (officeId) customerConditions.push(eq(customers.officeId, officeId));
  const customerResults = await db.select({
    id: customers.id,
    name: customers.name,
    phone: customers.phone,
    idNumber: customers.idNumber,
    isBlacklisted: customers.isBlacklisted,
  }).from(customers).where(and(...customerConditions)).limit(5);
  const contractConditions: any[] = [like(contracts.contractNumber, q)];
  if (officeId) contractConditions.push(eq(contracts.officeId, officeId));
  const contractResults = await db.select({
    id: contracts.id,
    contractNumber: contracts.contractNumber,
    status: contracts.status,
    finalPrice: contracts.finalPrice,
    basePrice: contracts.basePrice,
    startDate: contracts.startDate,
    endDate: contracts.endDate,
  }).from(contracts).where(and(...contractConditions)).limit(5);
  return {
    vehicles: vehicleResults,
    customers: customerResults,
    contracts: contractResults,
  };
}

// ==================== PROFILE ====================
export async function updateUserProfile(id: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

// ==================== MONTHLY REVENUE ====================
export async function getMonthlyRevenue(months: number = 6, officeId?: number) {
  const db = await getDb();
  if (!db) return [];
  const results: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthLabel = d.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
    const conditions: any[] = [gte(payments.paidAt, start), lte(payments.paidAt, end)];
    if (officeId) conditions.push(eq(payments.officeId, officeId));
    const rev = await db.select({ total: sum(payments.amount) }).from(payments).where(and(...conditions));
    results.push({ month: monthLabel, revenue: Number(rev[0]?.total ?? 0) });
  }
  return results;
}

// ==================== PASSWORD RESET TOKENS ====================
export async function savePasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  // Store in refresh_tokens table with a special prefix to distinguish
  await db.insert(refreshTokens).values({ userId, token: `reset_${token}`, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(refreshTokens)
    .where(eq(refreshTokens.token, `reset_${token}`)).limit(1);
  return result[0] ?? null;
}

export async function deletePasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(refreshTokens).where(eq(refreshTokens.token, `reset_${token}`));
}

export async function getVehiclesByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(vehicles).where(inArray(vehicles.id, ids));
}

// ==================== OTP CODES ====================
/** Create a new OTP code for the given email (invalidates previous unused codes) */
export async function createOtpCode(email: string, code: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Mark all previous unused codes for this email as used
  await db.update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.email, email), eq(otpCodes.used, false)));
  // Insert new code
  await db.insert(otpCodes).values({ email, code, expiresAt, used: false });
}

/** Verify an OTP code: returns true and marks it used if valid, false otherwise */
export async function verifyOtpCode(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const [record] = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.email, email),
      eq(otpCodes.code, code),
      eq(otpCodes.used, false),
      gte(otpCodes.expiresAt, now)
    ))
    .limit(1);
  if (!record) return false;
  // Mark as used
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, record.id));
  return true;
}

/** Check if a valid (unused, non-expired) OTP exists for this email — used for the reset step */
export async function hasValidOtp(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const [record] = await db.select({ id: otpCodes.id }).from(otpCodes)
    .where(and(
      eq(otpCodes.email, email),
      eq(otpCodes.used, false),
      gte(otpCodes.expiresAt, now)
    ))
    .limit(1);
  return !!record;
}
