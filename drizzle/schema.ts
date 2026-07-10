import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// ==================== OFFICES (المكاتب - Multi-Tenant Core) ====================
export const offices = mysqlTable("offices", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  // Future: plan, subscription status
  plan: mysqlEnum("plan", ["trial", "starter", "professional", "enterprise"]).default("trial").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Office = typeof offices.$inferSelect;
export type InsertOffice = typeof offices.$inferInsert;

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // userType: owner = مالك مكتب, employee = موظف ينتظر دعوة
  userType: mysqlEnum("userType", ["owner", "employee"]).default("employee").notNull(),
  // officeId: for owners = their office, for employees = assigned office (null until invited)
  officeId: int("officeId"),
  // role within the office
  role: mysqlEnum("role", ["owner", "admin", "staff", "accountant"]).default("staff").notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  // Local auth: hashed password for email/password login
  passwordHash: varchar("passwordHash", { length: 255 }),
  // Future: email verification
  emailVerified: boolean("emailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== OFFICE MEMBERS (أعضاء المكتب + صلاحياتهم) ====================
export const officeMembers = mysqlTable("office_members", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("memberRole", ["owner", "admin", "staff", "accountant"]).default("staff").notNull(),
  // Granular permissions as JSON: { view_contracts, create_contracts, edit_contracts, delete_contracts, ... }
  permissions: json("permissions"),
  isActive: boolean("isActive").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OfficeMember = typeof officeMembers.$inferSelect;
export type InsertOfficeMember = typeof officeMembers.$inferInsert;

// ==================== INVITATIONS (الدعوات) ====================
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  invitedBy: int("invitedBy").notNull(), // userId of the owner/admin who sent the invite
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("inviteRole", ["admin", "staff", "accountant"]).default("staff").notNull(),
  // Default permissions granted upon acceptance
  permissions: json("permissions"),
  // Unique token sent in the email link
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("inviteStatus", ["pending", "accepted", "cancelled", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ==================== REFRESH TOKENS ====================
export const refreshTokens = mysqlTable("refresh_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// ==================== BRANCHES (فروع المكتب) ====================
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(), // Multi-tenant: each branch belongs to an office
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ==================== VEHICLES ====================
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(), // Multi-tenant isolation
  plateNumber: varchar("plateNumber", { length: 20 }).notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: int("year").notNull(),
  color: varchar("color", { length: 50 }),
  category: mysqlEnum("category", ["economy", "family", "luxury"]).default("economy").notNull(),
  // Free-form office-managed labels (e.g. "أسطول الشركات", "دفع رباعي")
  tags: json("tags"),
  currentMileage: int("currentMileage").default(0).notNull(),
  status: mysqlEnum("status", ["available", "reserved", "rented", "late", "maintenance", "in_transfer"]).default("available").notNull(),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }).notNull(),
  weeklyRate: decimal("weeklyRate", { precision: 10, scale: 2 }),
  monthlyRate: decimal("monthlyRate", { precision: 10, scale: 2 }),
  branchId: int("branchId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ==================== CUSTOMERS ====================
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(), // Multi-tenant isolation
  name: varchar("name", { length: 255 }).notNull(),
  idNumber: varchar("idNumber", { length: 50 }),
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 255 }),
  isBlacklisted: boolean("isBlacklisted").default(false).notNull(),
  blacklistReason: text("blacklistReason"),
  blacklistedAt: timestamp("blacklistedAt"),
  idImageKey: varchar("idImageKey", { length: 512 }),
  idImageUrl: varchar("idImageUrl", { length: 512 }),
  licenseImageKey: varchar("licenseImageKey", { length: 512 }),
  licenseImageUrl: varchar("licenseImageUrl", { length: 512 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ==================== RESERVATIONS ====================
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(), // Multi-tenant isolation
  customerId: int("customerId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ==================== CONTRACTS ====================
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(), // Multi-tenant isolation
  contractNumber: varchar("contractNumber", { length: 50 }).notNull(),
  reservationId: int("reservationId"),
  customerId: int("customerId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  branchId: int("branchId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  startMileage: int("startMileage"),
  endMileage: int("endMileage"),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }).notNull(),
  totalDays: int("totalDays").notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  additionalCharges: decimal("additionalCharges", { precision: 10, scale: 2 }).default("0"),
  finalPrice: decimal("finalPrice", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["draft", "active", "completed", "cancelled"]).default("draft").notNull(),
  pdfUrl: text("pdfUrl"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// ==================== HANDOVERS ====================
export const handovers = mysqlTable("handovers", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  contractId: int("contractId").notNull(),
  mileage: int("mileage").notNull(),
  fuelLevel: varchar("fuelLevel", { length: 50 }),
  fuelCost: decimal("fuelCost", { precision: 10, scale: 2 }),
  fuelLiters: decimal("fuelLiters", { precision: 8, scale: 2 }),
  photos: json("photos"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Handover = typeof handovers.$inferSelect;
export type InsertHandover = typeof handovers.$inferInsert;

// ==================== RETURNS ====================
export const returns = mysqlTable("returns", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  contractId: int("contractId").notNull(),
  mileage: int("mileage").notNull(),
  fuelLevel: varchar("fuelLevel", { length: 50 }),
  fuelCost: decimal("fuelCost", { precision: 10, scale: 2 }),
  fuelLiters: decimal("fuelLiters", { precision: 8, scale: 2 }),
  photos: json("photos"),
  damageNotes: text("damageNotes"),
  damageAmount: decimal("damageAmount", { precision: 10, scale: 2 }).default("0"),
  lateFees: decimal("lateFees", { precision: 10, scale: 2 }).default("0"),
  additionalKmFees: decimal("additionalKmFees", { precision: 10, scale: 2 }).default("0"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

// ==================== PAYMENTS ====================
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  contractId: int("contractId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["cash", "card", "bank_transfer", "stc_pay"]).default("cash").notNull(),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  recordedBy: int("recordedBy"),
  notes: text("notes"),
  pdfUrl: text("pdfUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ==================== TRANSFERS ====================
export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  vehicleId: int("vehicleId").notNull(),
  fromBranchId: int("fromBranchId").notNull(),
  toBranchId: int("toBranchId").notNull(),
  status: mysqlEnum("status", ["initiated", "in_transit", "received"]).default("initiated").notNull(),
  initiatedBy: int("initiatedBy"),
  receivedBy: int("receivedBy"),
  notes: text("notes"),
  initiatedAt: timestamp("initiatedAt").defaultNow().notNull(),
  receivedAt: timestamp("receivedAt"),
});

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

// ==================== MAINTENANCE ====================
export const maintenance = mysqlTable("maintenance", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  type: mysqlEnum("type", ["scheduled", "unscheduled", "preventive"]).default("scheduled").notNull(),
  reason: text("reason").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  odometerAtService: int("odometerAtService"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  nextDueOdometer: int("nextDueOdometer"),
  nextDueDate: timestamp("nextDueDate"),
  status: mysqlEnum("maintenanceStatus", ["scheduled", "in_progress", "completed"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Maintenance = typeof maintenance.$inferSelect;
export type InsertMaintenance = typeof maintenance.$inferInsert;

// ==================== VEHICLE DOCUMENTS ====================
export const vehicleDocuments = mysqlTable("vehicle_documents", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  type: mysqlEnum("docType", ["insurance", "registration", "inspection"]).notNull(),
  documentUrl: text("documentUrl"),
  expiryDate: timestamp("expiryDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
export type InsertVehicleDocument = typeof vehicleDocuments.$inferInsert;

// ==================== VEHICLE HISTORY ====================
export const vehicleHistory = mysqlTable("vehicle_history", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  vehicleId: int("vehicleId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  description: text("description"),
  relatedId: int("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleHistory = typeof vehicleHistory.$inferSelect;
export type InsertVehicleHistory = typeof vehicleHistory.$inferInsert;

// ==================== INSPECTION FORMS (customizable) ====================
// Office-defined inspection templates rendered during handover/return.
// `fields` is an ordered array of { key, type, label, required?, options? }
// where type ∈ photo | number | text | pass_fail | dropdown | date | signature.
export const inspectionTemplates = mysqlTable("inspection_templates", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  context: mysqlEnum("context", ["handover", "return", "both"]).default("both").notNull(),
  fields: json("fields").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InspectionTemplate = typeof inspectionTemplates.$inferSelect;
export type InsertInspectionTemplate = typeof inspectionTemplates.$inferInsert;

export const inspectionSubmissions = mysqlTable("inspection_submissions", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  templateId: int("templateId").notNull(),
  contractId: int("contractId").notNull(),
  vehicleId: int("vehicleId"),
  context: mysqlEnum("submissionContext", ["handover", "return"]).notNull(),
  answers: json("answers").notNull(),
  submittedBy: int("submittedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InspectionSubmission = typeof inspectionSubmissions.$inferSelect;
export type InsertInspectionSubmission = typeof inspectionSubmissions.$inferInsert;

// ==================== VEHICLE LOCATIONS (GPS tracking) ====================
// Provider-agnostic: `source` records where a ping came from (manual entry,
// driver-facing PWA geolocation, or a future real telematics/OBD provider)
// so the ingestion endpoint can plug into any of them without schema changes.
export const vehicleLocations = mysqlTable("vehicle_locations", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 11, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  heading: int("heading"),
  source: varchar("source", { length: 50 }).default("manual").notNull(),
  recordedAt: timestamp("recordedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleLocation = typeof vehicleLocations.$inferSelect;
export type InsertVehicleLocation = typeof vehicleLocations.$inferInsert;

// ==================== AUDIT LOG ====================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId"),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId"),
  oldValue: json("oldValue"),
  newValue: json("newValue"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ==================== ALERTS ====================
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  officeId: int("officeId").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  relatedEntity: varchar("relatedEntity", { length: 100 }),
  relatedId: int("relatedId"),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  branchId: int("branchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ==================== OTP CODES ====================
export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
