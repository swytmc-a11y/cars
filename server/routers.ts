import { COOKIE_NAME } from "@shared/const";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, permissionProcedure, router } from "./_core/trpc";
import { ALL_PERMISSION_KEYS, resolvePermission } from "@shared/permissions";
import * as db from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendOtpEmail, sendInvitationEmail } from "./email";
import { renderHtmlToPdf, buildContractHtml, buildReceiptHtml, buildReportHtml } from "./pdf";
import { storagePut } from "./storage";

// ==================== ROUTERS ====================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== BRANCHES ====================
  branches: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllBranches(officeId);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getBranchById(input.id);
    }),
    create: permissionProcedure('manage_branches').input(z.object({
      name: z.string().min(1),
      city: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId ?? 1;
      const id = await db.createBranch({ ...input, officeId });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'branch', entityId: id, newValue: input });
      return { id };
    }),
    update: permissionProcedure('manage_branches').input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getBranchById(id);
      await db.updateBranch(id, data);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'branch', entityId: id, oldValue: old, newValue: data });
      return { success: true };
    }),
  }),

  // ==================== VEHICLES ====================
  vehicles: router({
    list: permissionProcedure('view_vehicles').input(z.object({
      branchId: z.number().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const { tag, ...filters } = input ?? {};
      const rows = await db.getAllVehicles({ ...filters, officeId });
      if (!tag) return rows;
      // Tag filtering happens here (per-office fleets are small) instead of
      // JSON queries that differ between MySQL and MariaDB.
      return rows.filter(v => Array.isArray(v.tags) && (v.tags as string[]).includes(tag));
    }),
    getById: permissionProcedure('view_vehicles').input(z.object({ id: z.number() })).query(async ({ input }) => {
      const vehicle = await db.getVehicleById(input.id);
      if (!vehicle) throw new TRPCError({ code: 'NOT_FOUND', message: 'السيارة غير موجودة' });
      const history = await db.getVehicleHistory(input.id);
      const documents = await db.getVehicleDocuments(input.id);
      const maintenanceRecords = await db.getAllMaintenance({ vehicleId: input.id });
      return { vehicle, history, documents, maintenance: maintenanceRecords };
    }),
    create: permissionProcedure('create_vehicles').input(z.object({
      plateNumber: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      year: z.number().min(1900).max(2030),
      color: z.string().optional(),
      category: z.enum(['economy', 'family', 'luxury']).optional(),
      currentMileage: z.number().optional(),
      dailyRate: z.string(),
      weeklyRate: z.string().optional(),
      monthlyRate: z.string().optional(),
      branchId: z.number(),
      tags: z.array(z.string()).optional(),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      // Empty strings from the form would fail on decimal columns
      if (!input.weeklyRate) delete input.weeklyRate;
      if (!input.monthlyRate) delete input.monthlyRate;
      const id = await db.createVehicle({ ...input, officeId } as any);
      await db.addVehicleHistory({ vehicleId: id!, eventType: 'status_change', description: 'تم إضافة السيارة للنظام' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'vehicle', entityId: id, newValue: input });
      return { id };
    }),
    update: permissionProcedure('edit_vehicles').input(z.object({
      id: z.number(),
      plateNumber: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      color: z.string().optional(),
      category: z.enum(['economy', 'family', 'luxury']).optional(),
      currentMileage: z.number().optional(),
      dailyRate: z.string().optional(),
      weeklyRate: z.string().optional(),
      monthlyRate: z.string().optional(),
      branchId: z.number().optional(),
      status: z.enum(['available', 'reserved', 'rented', 'late', 'maintenance', 'in_transfer']).optional(),
      isActive: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Empty strings from the form would fail on decimal columns
      if (data.weeklyRate === '') delete data.weeklyRate;
      if (data.monthlyRate === '') delete data.monthlyRate;
      if (data.dailyRate === '') delete data.dailyRate;
      const old = await db.getVehicleById(id);
      await db.updateVehicle(id, data as any);
      if (data.status && old && data.status !== old.status) {
        await db.addVehicleHistory({ vehicleId: id, eventType: 'status_change', description: `تغيير الحالة من ${old.status} إلى ${data.status}` });
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'vehicle', entityId: id, oldValue: old, newValue: data });
      return { success: true };
    }),
    delete: permissionProcedure('delete_vehicles').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.updateVehicle(input.id, { isActive: false });
      await db.addVehicleHistory({ vehicleId: input.id, eventType: 'status_change', description: 'تم حذف السيارة (حذف ناعم)' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'delete', entityType: 'vehicle', entityId: input.id, newValue: { isActive: false } });
      return { success: true };
    }),
    getStats: permissionProcedure('view_vehicles').input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getVehicleStats(input.id);
    }),
  }),

  // ==================== CUSTOMERS ====================
  customers: router({
    list: permissionProcedure('view_customers').input(z.object({ search: z.string().optional() }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllCustomers(input?.search, officeId);
    }),
    getById: permissionProcedure('view_customers').input(z.object({ id: z.number() })).query(async ({ input }) => {
      const customer = await db.getCustomerById(input.id);
      if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'العميل غير موجود' });
      const customerReservations = await db.getAllReservations({ customerId: input.id });
      const customerContracts = await db.getAllContracts({ customerId: input.id });
      return { customer, reservations: customerReservations, contracts: customerContracts };
    }),
    findByPhone: permissionProcedure('view_customers').input(z.object({ phone: z.string() })).query(async ({ input }) => {
      return db.getCustomerByPhone(input.phone);
    }),
    create: permissionProcedure('create_customers').input(z.object({
      name: z.string().min(1),
      idNumber: z.string().optional(),
      licenseNumber: z.string().optional(),
      phone: z.string().min(1),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      idImageKey: z.string().optional(),
      idImageUrl: z.string().optional(),
      licenseImageKey: z.string().optional(),
      licenseImageUrl: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Sanitize: convert empty strings to undefined for UNIQUE nullable fields
      const sanitized = {
        ...input,
        idNumber: input.idNumber?.trim() || undefined,
        licenseNumber: input.licenseNumber?.trim() || undefined,
        email: input.email?.trim() || undefined,
        address: input.address?.trim() || undefined,
        city: input.city?.trim() || undefined,
        idImageKey: input.idImageKey?.trim() || undefined,
        idImageUrl: input.idImageUrl?.trim() || undefined,
        licenseImageKey: input.licenseImageKey?.trim() || undefined,
        licenseImageUrl: input.licenseImageUrl?.trim() || undefined,
      };
      const officeId = (ctx.user as any).officeId;
      const id = await db.createCustomer({ ...sanitized, officeId } as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'customer', entityId: id, newValue: sanitized });
      return { id };
    }),
    uploadImage: permissionProcedure('create_customers').input(z.object({
      customerId: z.number(),
      type: z.enum(['id', 'license']),
      base64: z.string(),
      mimeType: z.string().default('image/jpeg'),
    })).mutation(async ({ input, ctx }) => {
      const { storagePut } = await import('./storage');
      const ext = input.mimeType.split('/')[1] || 'jpg';
      const key = `customers/${input.customerId}/${input.type}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.base64, 'base64');
      const { key: savedKey, url } = await storagePut(key, buffer, input.mimeType);
      const updateData = input.type === 'id'
        ? { idImageKey: savedKey, idImageUrl: url }
        : { licenseImageKey: savedKey, licenseImageUrl: url };
      await db.updateCustomer(input.customerId, updateData as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'customer', entityId: input.customerId, newValue: { imageType: input.type, url } });
      return { url, key: savedKey };
    }),
    updateImages: permissionProcedure('edit_customers').input(z.object({
      id: z.number(),
      idImageKey: z.string().optional(),
      idImageUrl: z.string().optional(),
      licenseImageKey: z.string().optional(),
      licenseImageUrl: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateCustomer(id, data as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'customer', entityId: id, newValue: data });
      return { success: true };
    }),
    update: permissionProcedure('edit_customers').input(z.object({
      id: z.number(),
      name: z.string().optional(),
      idNumber: z.string().optional(),
      licenseNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      isBlacklisted: z.boolean().optional(),
      blacklistReason: z.string().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getCustomerById(id);
      if (data.isBlacklisted === true) {
        (data as any).blacklistedAt = new Date();
      }
      await db.updateCustomer(id, data as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'customer', entityId: id, oldValue: old, newValue: data });
      return { success: true };
    }),
    delete: permissionProcedure('delete_customers').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await db.updateCustomer(input.id, { isActive: false });
      await db.createAuditLog({ userId: ctx.user.id, action: 'delete', entityType: 'customer', entityId: input.id, newValue: { isActive: false } });
      return { success: true };
    }),
    getPayments: permissionProcedure('view_payments').input(z.object({ customerId: z.number() })).query(async ({ input }) => {
      return db.getPaymentsByCustomerId(input.customerId);
    }),
  }),

  // ==================== RESERVATIONS ====================
  reservations: router({
    list: permissionProcedure('view_reservations').input(z.object({
      status: z.string().optional(),
      vehicleId: z.number().optional(),
      customerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllReservations({ ...(input ?? {}), officeId });
    }),
    create: permissionProcedure('create_reservations').input(z.object({
      customerId: z.number(),
      vehicleId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Check blacklist
      const customer = await db.getCustomerById(input.customerId);
      if (customer?.isBlacklisted) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'العميل في القائمة السوداء ولا يمكن إنشاء حجز له' });
      }
      // Check conflict
      const hasConflict = await db.checkReservationConflict(input.vehicleId, new Date(input.startDate), new Date(input.endDate));
      if (hasConflict) {
        throw new TRPCError({ code: 'CONFLICT', message: 'يوجد تعارض مع حجز آخر لنفس السيارة في هذه الفترة' });
      }
      const id = await db.createReservation({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdBy: ctx.user.id,
        officeId: (ctx.user as any).officeId ?? undefined,
      } as any);
      // Update vehicle status
      await db.updateVehicle(input.vehicleId, { status: 'reserved' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'rental', description: 'تم حجز السيارة' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'reservation', entityId: id, newValue: input });
      return { id };
    }),
    getById: permissionProcedure('view_reservations').input(z.object({ id: z.number() })).query(async ({ input }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND', message: 'الحجز غير موجود' });
      return reservation;
    }),
    update: permissionProcedure('edit_reservations').input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, startDate, endDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (startDate) data.startDate = new Date(startDate);
      if (endDate) data.endDate = new Date(endDate);
      const reservation = await db.getReservationById(id);
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND', message: 'الحجز غير موجود' });
      await db.updateReservation(id, data as any);
      // If cancelling, free the vehicle
      if (data.status === 'cancelled' && reservation.vehicleId) {
        await db.updateVehicle(reservation.vehicleId, { status: 'available' });
        await db.addVehicleHistory({ vehicleId: reservation.vehicleId, eventType: 'other', description: 'تم إلغاء الحجز' });
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'reservation', entityId: id, newValue: data });
      return { success: true };
    }),
    delete: permissionProcedure('edit_reservations').input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const reservation = await db.getReservationById(input.id);
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND', message: 'الحجز غير موجود' });
      if (reservation.vehicleId) {
        await db.updateVehicle(reservation.vehicleId, { status: 'available' });
      }
      await db.updateReservation(input.id, { status: 'cancelled' } as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'delete', entityType: 'reservation', entityId: input.id, newValue: null });
      return { success: true };
    }),
  }),

  // ==================== CONTRACTS ====================
  contracts: router({
    list: permissionProcedure('view_contracts').input(z.object({
      status: z.string().optional(),
      branchId: z.number().optional(),
      customerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllContracts({ ...(input ?? {}), officeId });
    }),
    getById: permissionProcedure('view_contracts').input(z.object({ id: z.number() })).query(async ({ input }) => {
      const contract = await db.getContractById(input.id);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'العقد غير موجود' });
      const contractPayments = await db.getPaymentsByContractId(input.id);
      const handover = await db.getHandoverByContractId(input.id);
      const returnRecord = await db.getReturnByContractId(input.id);
      const totalPaid = await db.getTotalPaymentsByContract(input.id);
      return { contract, payments: contractPayments, handover, return: returnRecord, totalPaid };
    }),
    generatePdf: permissionProcedure('view_contracts').input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const contract = await db.getContractById(input.id);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'العقد غير موجود' });
      const [customer, vehicle] = await Promise.all([
        db.getCustomerById(contract.customerId),
        db.getVehicleById(contract.vehicleId),
      ]);
      const html = buildContractHtml(contract, customer, vehicle);
      const pdf = await renderHtmlToPdf(html);
      const { url } = await storagePut(`contracts/${contract.id}/contract.pdf`, pdf, 'application/pdf');
      await db.updateContract(input.id, { pdfUrl: url });
      return { url };
    }),
    create: permissionProcedure('create_contracts').input(z.object({
      customerId: z.number(),
      vehicleId: z.number(),
      branchId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      dailyRate: z.string(),
      totalDays: z.number(),
      basePrice: z.string(),
      discount: z.string().optional(),
      notes: z.string().optional(),
      reservationId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Check blacklist
      const customer = await db.getCustomerById(input.customerId);
      if (customer?.isBlacklisted) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'العميل في القائمة السوداء' });
      }
      const contractNumber = await db.getNextContractNumber();
      const discount = Number(input.discount || 0);
      const finalPrice = Number(input.basePrice) - discount;
      const officeId = (ctx.user as any).officeId;
      const id = await db.createContract({
        ...input,
        contractNumber,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        finalPrice: String(finalPrice),
        status: 'active',
        createdBy: ctx.user.id,
        officeId,
      } as any);
      // Update vehicle status
      await db.updateVehicle(input.vehicleId, { status: 'rented' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'rental', description: `عقد إيجار رقم ${contractNumber}` });
      // Update reservation if linked
      if (input.reservationId) {
        await db.updateReservation(input.reservationId, { status: 'completed' });
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'contract', entityId: id, newValue: { ...input, contractNumber } });
      return { id, contractNumber };
    }),
    update: permissionProcedure('edit_contracts').input(z.object({
      id: z.number(),
      status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
      endMileage: z.number().optional(),
      additionalCharges: z.string().optional(),
      finalPrice: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getContractById(id);
      await db.updateContract(id, data as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'contract', entityId: id, oldValue: old, newValue: data });
      return { success: true };
    }),
  }),

  // ==================== HANDOVERS ====================
  handovers: router({
    create: permissionProcedure('edit_contracts').input(z.object({
      contractId: z.number(),
      mileage: z.number(),
      fuelLevel: z.string().optional(),
      fuelCost: z.string().optional(),
      fuelLiters: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!input.fuelCost) delete input.fuelCost;
      if (!input.fuelLiters) delete input.fuelLiters;
      const id = await db.createHandover({ ...input, createdBy: ctx.user.id });
      // Update contract start mileage
      await db.updateContract(input.contractId, { startMileage: input.mileage });
      // Update vehicle mileage
      const contract = await db.getContractById(input.contractId);
      if (contract) {
        await db.updateVehicle(contract.vehicleId, { currentMileage: input.mileage });
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'handover', entityId: id, newValue: input });
      return { id };
    }),
  }),

  // ==================== RETURNS ====================
  returns: router({
    calculate: permissionProcedure('edit_contracts').input(z.object({
      contractId: z.number(),
      mileage: z.number(),
      returnDate: z.string().optional(),
    })).query(async ({ input }) => {
      const contract = await db.getContractById(input.contractId);
      if (!contract) throw new TRPCError({ code: 'NOT_FOUND', message: 'العقد غير موجود' });
      const endDate = new Date(contract.endDate);
      const actualReturn = input.returnDate ? new Date(input.returnDate) : new Date();
      // Calculate late fees
      let lateDays = 0;
      let lateFees = 0;
      if (actualReturn > endDate) {
        lateDays = Math.ceil((actualReturn.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        lateFees = lateDays * Number(contract.dailyRate) * 1.5; // 150% daily rate for late
      }
      // Calculate additional km fees
      const startMileage = contract.startMileage || 0;
      const kmDriven = input.mileage - startMileage;
      const allowedKm = (contract.totalDays || 1) * 300; // 300km per day allowance
      let additionalKmFees = 0;
      if (kmDriven > allowedKm) {
        additionalKmFees = (kmDriven - allowedKm) * 0.5; // 0.5 SAR per extra km
      }
      return { lateDays, lateFees, additionalKmFees, kmDriven, allowedKm };
    }),
    create: permissionProcedure('edit_contracts').input(z.object({
      contractId: z.number(),
      mileage: z.number(),
      fuelLevel: z.string().optional(),
      fuelCost: z.string().optional(),
      fuelLiters: z.string().optional(),
      damageNotes: z.string().optional(),
      damageAmount: z.string().optional(),
      lateFees: z.string().optional(),
      additionalKmFees: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!input.fuelCost) delete input.fuelCost;
      if (!input.fuelLiters) delete input.fuelLiters;
      const id = await db.createReturn({ ...input, createdBy: ctx.user.id } as any);
      const contract = await db.getContractById(input.contractId);
      if (contract) {
        // Update contract
        const additionalCharges = Number(input.damageAmount || 0) + Number(input.lateFees || 0) + Number(input.additionalKmFees || 0);
        const finalPrice = Number(contract.finalPrice || contract.basePrice) + additionalCharges;
        await db.updateContract(input.contractId, {
          status: 'completed',
          endMileage: input.mileage,
          additionalCharges: String(additionalCharges),
          finalPrice: String(finalPrice),
        });
        // Update vehicle
        await db.updateVehicle(contract.vehicleId, { status: 'available', currentMileage: input.mileage });
        await db.addVehicleHistory({ vehicleId: contract.vehicleId, eventType: 'rental', description: 'تم إرجاع السيارة' });
      }
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'return', entityId: id, newValue: input });
      return { id };
    }),
  }),

  // ==================== PAYMENTS ====================
  payments: router({
    listByContract: permissionProcedure('view_payments').input(z.object({ contractId: z.number() })).query(async ({ input }) => {
      return db.getPaymentsByContractId(input.contractId);
    }),
    create: permissionProcedure('create_payments').input(z.object({
      contractId: z.number(),
      amount: z.string(),
      method: z.enum(['cash', 'card', 'bank_transfer', 'stc_pay']),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createPayment({ ...input, recordedBy: ctx.user.id, paidAt: new Date() });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'payment', entityId: id, newValue: input });
      return { id };
    }),
    generatePdf: permissionProcedure('view_payments').input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const payment = await db.getPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'الدفعة غير موجودة' });
      const contract = await db.getContractById(payment.contractId);
      const customer = contract ? await db.getCustomerById(contract.customerId) : undefined;
      const html = buildReceiptHtml(payment, contract, customer);
      const pdf = await renderHtmlToPdf(html);
      const { url } = await storagePut(`payments/${payment.id}/receipt.pdf`, pdf, 'application/pdf');
      await db.updatePayment(input.id, { pdfUrl: url });
      return { url };
    }),
  }),

  // ==================== TRANSFERS ====================
  transfers: router({
    list: permissionProcedure('view_transfers').input(z.object({
      status: z.string().optional(),
      vehicleId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllTransfers({ ...(input ?? {}), officeId });
    }),
    create: permissionProcedure('create_transfers').input(z.object({
      vehicleId: z.number(),
      fromBranchId: z.number(),
      toBranchId: z.number(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createTransfer({ ...input, initiatedBy: ctx.user.id });
      await db.updateVehicle(input.vehicleId, { status: 'in_transfer' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'transfer', description: 'بدء نقل السيارة' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'transfer', entityId: id, newValue: input });
      return { id };
    }),
    receive: permissionProcedure('create_transfers').input(z.object({
      id: z.number(),
      vehicleId: z.number(),
      toBranchId: z.number(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateTransfer(input.id, { status: 'received', receivedBy: ctx.user.id, receivedAt: new Date() });
      await db.updateVehicle(input.vehicleId, { status: 'available', branchId: input.toBranchId });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'transfer', description: 'تم استلام السيارة في الفرع الجديد' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'transfer', entityId: input.id, newValue: { status: 'received' } });
      return { success: true };
    }),
  }),

  // ==================== MAINTENANCE ====================
  maintenance: router({
    list: permissionProcedure('view_maintenance').input(z.object({
      vehicleId: z.number().optional(),
      status: z.string().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllMaintenance({ ...(input ?? {}), officeId });
    }),
    create: permissionProcedure('create_maintenance').input(z.object({
      vehicleId: z.number(),
      type: z.enum(['scheduled', 'unscheduled', 'preventive']).optional(),
      reason: z.string().min(1),
      cost: z.string().optional(),
      odometerAtService: z.number().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      nextDueOdometer: z.number().optional(),
      nextDueDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createMaintenance({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        nextDueDate: input.nextDueDate ? new Date(input.nextDueDate) : undefined,
        createdBy: ctx.user.id,
      } as any);
      await db.updateVehicle(input.vehicleId, { status: 'maintenance' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'maintenance', description: input.reason });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'maintenance', entityId: id, newValue: input });
      return { id };
    }),
    complete: permissionProcedure('edit_maintenance').input(z.object({
      id: z.number(),
      vehicleId: z.number(),
      cost: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateMaintenance(input.id, { status: 'completed', endDate: new Date(), cost: input.cost } as any);
      await db.updateVehicle(input.vehicleId, { status: 'available' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'maintenance', description: 'اكتملت الصيانة' });
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'maintenance', entityId: input.id, newValue: { status: 'completed' } });
      return { success: true };
    }),
  }),

  // ==================== VEHICLE DOCUMENTS ====================
  vehicleDocuments: router({
    list: permissionProcedure('view_vehicles').input(z.object({ vehicleId: z.number() })).query(async ({ input }) => {
      return db.getVehicleDocuments(input.vehicleId);
    }),
    create: permissionProcedure('edit_vehicles').input(z.object({
      vehicleId: z.number(),
      type: z.enum(['insurance', 'registration', 'inspection']),
      documentUrl: z.string().optional(),
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createVehicleDocument({
        ...input,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      } as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'vehicleDocument', entityId: id, newValue: input });
      return { id };
    }),
  }),

  // ==================== VEHICLE TRACKING (GPS) ====================
  // Provider-agnostic ingestion: pings can come from a manual entry, a
  // driver-facing PWA page, or a future real telematics/OBD provider.
  vehicleTracking: router({
    ingest: protectedProcedure.input(z.object({
      vehicleId: z.number(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      speed: z.number().optional(),
      heading: z.number().min(0).max(359).optional(),
      source: z.enum(['manual', 'driver_app', 'device']).default('manual'),
      recordedAt: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const id = await db.ingestVehicleLocation({
        officeId,
        vehicleId: input.vehicleId,
        lat: String(input.lat),
        lng: String(input.lng),
        speed: input.speed !== undefined ? String(input.speed) : undefined,
        heading: input.heading,
        source: input.source,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      });
      return { id };
    }),
    latest: permissionProcedure('view_tracking').query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getLatestVehicleLocations(officeId);
    }),
    history: permissionProcedure('view_tracking').input(z.object({
      vehicleId: z.number(),
      from: z.string().optional(),
      to: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getVehicleLocationHistory(
        input.vehicleId,
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined,
      );
    }),
  }),

  // ==================== INSPECTION FORMS ====================
  inspections: router({
    templates: permissionProcedure('edit_contracts').input(z.object({
      context: z.enum(['handover', 'return']).optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getInspectionTemplates(officeId, input?.context);
    }),
    createTemplate: adminProcedure.input(z.object({
      name: z.string().min(1),
      context: z.enum(['handover', 'return', 'both']).default('both'),
      fields: z.array(z.object({
        key: z.string().min(1),
        type: z.enum(['photo', 'number', 'text', 'pass_fail', 'dropdown', 'date', 'signature']),
        label: z.string().min(1),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
      })).min(1),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const id = await db.createInspectionTemplate({ ...input, officeId });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'inspectionTemplate', entityId: id, newValue: input });
      return { id };
    }),
    updateTemplate: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      context: z.enum(['handover', 'return', 'both']).optional(),
      fields: z.array(z.object({
        key: z.string().min(1),
        type: z.enum(['photo', 'number', 'text', 'pass_fail', 'dropdown', 'date', 'signature']),
        label: z.string().min(1),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
      })).min(1).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateInspectionTemplate(id, data);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'inspectionTemplate', entityId: id, newValue: data });
      return { success: true };
    }),
    uploadPhoto: permissionProcedure('edit_contracts').input(z.object({
      base64: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const ext = input.mimeType.split('/')[1] || 'jpg';
      const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      const { url } = await storagePut(`inspections/${officeId}/photo.${ext}`, buffer, input.mimeType);
      return { url };
    }),
    submit: permissionProcedure('edit_contracts').input(z.object({
      templateId: z.number(),
      contractId: z.number(),
      context: z.enum(['handover', 'return']),
      answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const template = await db.getInspectionTemplateById(input.templateId);
      if (!template || template.officeId !== officeId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'نموذج الفحص غير موجود' });
      }
      const missing = (template.fields as any[])
        .filter(f => f.required && (input.answers[f.key] === undefined || input.answers[f.key] === null || input.answers[f.key] === ''))
        .map(f => f.label);
      if (missing.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `حقول الفحص التالية مطلوبة: ${missing.join('، ')}` });
      }
      const contract = await db.getContractById(input.contractId);
      const id = await db.createInspectionSubmission({
        ...input,
        vehicleId: contract?.vehicleId,
        officeId,
        submittedBy: ctx.user.id,
      });
      return { id };
    }),
    listByContract: permissionProcedure('view_contracts').input(z.object({ contractId: z.number() })).query(async ({ input }) => {
      return db.getInspectionSubmissionsByContract(input.contractId);
    }),
  }),

  // ==================== ALERTS ====================
  alerts: router({
    list: permissionProcedure('view_alerts').input(z.object({
      isRead: z.boolean().optional(),
      branchId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getAlerts(input ?? undefined);
    }),
    markAsRead: permissionProcedure('view_alerts').input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markAlertAsRead(input.id);
      return { success: true };
    }),
    markAllAsRead: permissionProcedure('view_alerts').input(z.object({ branchId: z.number().optional() }).optional()).mutation(async ({ input }) => {
      await db.markAllAlertsAsRead(input?.branchId);
      return { success: true };
    }),
  }),

  // ==================== AUDIT LOGS ====================
  auditLogs: router({
    list: adminProcedure.input(z.object({
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      userId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAuditLogs({ ...(input ?? {}), officeId });
    }),
  }),

  // ==================== DASHBOARD ====================
  dashboard: router({
    stats: permissionProcedure('view_dashboard').input(z.object({ branchId: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getDashboardStats(input?.branchId, officeId);
    }),
  }),

  // ==================== GLOBAL SEARCH ====================
  search: router({
    global: protectedProcedure.input(z.object({ query: z.string().min(1) })).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.globalSearch(input.query, officeId);
    }),
  }),

  // ==================== QUICK CONTRACT ====================
  quickContract: router({
    create: permissionProcedure('create_contracts').input(z.object({
      // Customer: either existing or new
      customerId: z.number().optional(),
      newCustomer: z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        idNumber: z.string().optional(),
        licenseNumber: z.string().optional(),
        email: z.string().optional(),
        idImageBase64: z.string().optional(),
        idImageMimeType: z.string().optional(),
        licenseImageBase64: z.string().optional(),
        licenseImageMimeType: z.string().optional(),
      }).optional(),
      // Contract details
      vehicleId: z.number(),
      branchId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      dailyRate: z.string(),
      totalDays: z.number(),
      basePrice: z.string(),
      discount: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Step 1: Resolve customer
      let resolvedCustomerId = input.customerId;
      if (!resolvedCustomerId && input.newCustomer) {
        // Check if phone already exists
        const existing = await db.getCustomerByPhone(input.newCustomer.phone);
        if (existing) {
          resolvedCustomerId = existing.id;
        } else {
          // Sanitize: convert empty strings to undefined for UNIQUE nullable fields
          const sanitizedCustomer = {
            name: input.newCustomer.name,
            phone: input.newCustomer.phone,
            idNumber: input.newCustomer.idNumber?.trim() || undefined,
            licenseNumber: input.newCustomer.licenseNumber?.trim() || undefined,
            email: input.newCustomer.email?.trim() || undefined,
          };
          const newId = await db.createCustomer(sanitizedCustomer as any);
          if (!newId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'فشل إنشاء العميل' });
          resolvedCustomerId = newId;
          // Upload document images if provided
          if (input.newCustomer?.idImageBase64 && input.newCustomer?.idImageMimeType) {
            try {
              const { storagePut } = await import('./storage');
              const ext = input.newCustomer.idImageMimeType.split('/')[1] || 'jpg';
              const buf = Buffer.from(input.newCustomer.idImageBase64, 'base64');
              const { url, key } = await storagePut(`customers/${newId}/id.${ext}`, buf, input.newCustomer.idImageMimeType);
              await db.updateCustomer(newId, { idImageUrl: url, idImageKey: key });
            } catch (err) { console.warn('[QuickContract] Failed to upload ID image:', err); }
          }
          if (input.newCustomer?.licenseImageBase64 && input.newCustomer?.licenseImageMimeType) {
            try {
              const { storagePut } = await import('./storage');
              const ext = input.newCustomer.licenseImageMimeType.split('/')[1] || 'jpg';
              const buf = Buffer.from(input.newCustomer.licenseImageBase64, 'base64');
              const { url, key } = await storagePut(`customers/${newId}/license.${ext}`, buf, input.newCustomer.licenseImageMimeType);
              await db.updateCustomer(newId, { licenseImageUrl: url, licenseImageKey: key });
            } catch (err) { console.warn('[QuickContract] Failed to upload license image:', err); }
          }
          await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'customer', entityId: newId, newValue: sanitizedCustomer });
        }
      }
      if (!resolvedCustomerId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'يجب تحديد عميل أو إدخال بيانات عميل جديد' });

      // Step 2: Check blacklist
      const customer = await db.getCustomerById(resolvedCustomerId);
      if (customer?.isBlacklisted) throw new TRPCError({ code: 'FORBIDDEN', message: 'العميل في القائمة السوداء' });

      // Step 3: Check vehicle availability
      const vehicle = await db.getVehicleById(input.vehicleId);
      if (!vehicle) throw new TRPCError({ code: 'NOT_FOUND', message: 'السيارة غير موجودة' });
      if (vehicle.status !== 'available') throw new TRPCError({ code: 'CONFLICT', message: `السيارة غير متاحة حالياً (الحالة: ${vehicle.status})` });

      // Step 4: Create contract
      const contractNumber = await db.getNextContractNumber();
      const discount = Number(input.discount || 0);
      const finalPrice = Number(input.basePrice) - discount;
      const contractId = await db.createContract({
        customerId: resolvedCustomerId,
        vehicleId: input.vehicleId,
        branchId: input.branchId,
        contractNumber,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        dailyRate: input.dailyRate,
        totalDays: input.totalDays,
        basePrice: input.basePrice,
        discount: String(discount),
        finalPrice: String(finalPrice),
        notes: input.notes,
        status: 'active',
        createdBy: ctx.user.id,
      } as any);
      if (!contractId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'فشل إنشاء العقد' });

      // Step 5: Update vehicle status
      await db.updateVehicle(input.vehicleId, { status: 'rented' });
      await db.addVehicleHistory({ vehicleId: input.vehicleId, eventType: 'rental', description: `عقد سريع رقم ${contractNumber}` });
      await db.createAuditLog({ userId: ctx.user.id, action: 'create', entityType: 'contract', entityId: contractId, newValue: { contractNumber, customerId: resolvedCustomerId, vehicleId: input.vehicleId } });

      return { contractId, contractNumber, customerId: resolvedCustomerId };
    }),
  }),

  // ==================== LOCAL AUTH ====================
  localAuth: router({
    register: publicProcedure.input(z.object({
      name: z.string().min(2, 'الاسم مطلوب'),
      email: z.string().email('البريد الإلكتروني غير صحيح'),
      password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
      role: z.enum(['owner', 'admin', 'staff', 'accountant']).optional(),
      officeName: z.string().optional(),
      userType: z.enum(['owner', 'employee']).optional(),
      inviteToken: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'البريد الإلكتروني مستخدم بالفعل' });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userType = input.userType ?? 'employee';
      let officeId: number | null = null;
      // If owner: create office first
      if (userType === 'owner' && input.officeName) {
        const dbOffice = await import('./db-office');
        officeId = await dbOffice.createOffice({ name: input.officeName }) ?? null;
      }
      const user = await db.createLocalUser({
        name: input.name,
        email: input.email,
        passwordHash,
        role: userType === 'owner' ? 'owner' : (input.role ?? 'staff'),
        officeId,
        userType,
      });
      return { success: true, userId: user!.id };
    }),

    login: publicProcedure.input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }
      if (!user.isActive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير مفعّل، تواصل مع المدير' });
      }
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }
      // Create session token (short-lived: 1 hour)
      const sessionToken = await sdk.createSessionToken(user.openId, {
        expiresInMs: 60 * 60 * 1000,
        name: user.name ?? user.email ?? '',
      });
      // Create refresh token (30 days)
      const refreshToken = nanoid(64);
      const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.saveRefreshToken(user.id, refreshToken, refreshExpiry);
      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      // Set refresh token cookie (httpOnly, 30 days)
      ctx.res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      // Update last signed in
      await db.updateUser(user.id, { lastSignedIn: new Date() });
      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

    refresh: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie ?? '';
      const match = cookies.match(/refresh_token=([^;]+)/);
      const token = match?.[1];
      if (!token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'لا يوجد refresh token' });
      const stored = await db.getRefreshToken(token);
      if (!stored || stored.expiresAt < new Date()) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
      }
      const user = await db.getUserById(stored.userId);
      if (!user || !user.isActive) throw new TRPCError({ code: 'FORBIDDEN', message: 'الحساب غير مفعّل' });
      // Issue new session token
      const sessionToken = await sdk.createSessionToken(user.openId, {
        expiresInMs: 60 * 60 * 1000,
        name: user.name ?? '',
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
      return { success: true };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie ?? '';
      const match = cookies.match(/refresh_token=([^;]+)/);
      const token = match?.[1];
      if (token) await db.deleteRefreshToken(token);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie('refresh_token', { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    forgotPassword: publicProcedure.input(z.object({
      email: z.string().email('البريد الإلكتروني غير صحيح'),
    })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        // Don't reveal if email exists — always return success
        return { success: true };
      }
      const resetToken = nanoid(48);
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
      await db.savePasswordResetToken(user.id, resetToken, resetExpiry);
      return { success: true };
    }),

    resetPassword: publicProcedure.input(z.object({
      token: z.string().min(1, 'رمز الاستعادة مطلوب'),
      newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    })).mutation(async ({ input }) => {
      const record = await db.getPasswordResetToken(input.token);
      if (!record || record.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'رمز الاستعادة غير صحيح أو منتهي الصلاحية' });
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(record.userId, newHash);
      await db.deletePasswordResetToken(input.token);
      return { success: true };
    }),

    // ── OTP-based password reset ──────────────────────────────────────────
    requestOtp: publicProcedure.input(z.object({
      email: z.string().email('البريد الإلكتروني غير صحيح'),
    })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      // Always return success to avoid email enumeration
      if (!user || !user.passwordHash) return { success: true };
      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await db.createOtpCode(input.email, otp, expiresAt);
      const sent = await sendOtpEmail(input.email, otp, user.name ?? undefined);
      if (!sent) {
        // Don't reveal email existence; log server-side only
        console.error('[OTP] Failed to send email to:', input.email);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'حدث خطأ أثناء إرسال البريد، حاول مرة أخرى' });
      }
      return { success: true };
    }),

    verifyOtp: publicProcedure.input(z.object({
      email: z.string().email(),
      code: z.string().length(6, 'الكود يجب أن يكون 6 أرقام'),
    })).mutation(async ({ input }) => {
      const valid = await db.verifyOtpCode(input.email, input.code);
      if (!valid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'الكود غير صحيح أو منتهي الصلاحية' });
      }
      // Issue a short-lived reset token so the next step can reset the password
      const resetToken = nanoid(48);
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const user = await db.getUserByEmail(input.email);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      await db.savePasswordResetToken(user.id, resetToken, resetExpiry);
      return { success: true, resetToken };
    }),

    resetWithOtp: publicProcedure.input(z.object({
      resetToken: z.string().min(1),
      newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    })).mutation(async ({ input }) => {
      const record = await db.getPasswordResetToken(input.resetToken);
      if (!record || record.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'انتهت صلاحية الجلسة، ابدأ من جديد' });
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(record.userId, newHash);
      await db.deletePasswordResetToken(input.resetToken);
      return { success: true };
    }),

    // ── Create employee directly (owner only) ─────────────────────────────
    createEmployee: protectedProcedure.input(z.object({
      name: z.string().min(2, 'الاسم مطلوب'),
      email: z.string().email('البريد الإلكتروني غير صحيح'),
      password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
      role: z.enum(['admin', 'staff', 'accountant']),
      branchId: z.number().optional(),
      permissions: z.record(z.string(), z.boolean()).optional(),
    })).mutation(async ({ input, ctx }) => {
      // Only owner can create employees directly
      if (ctx.user.role !== 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'فقط مالك المكتب يمكنه إضافة موظفين' });
      }
      const officeId = (ctx.user as any).officeId;
      if (!officeId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد مكتب مرتبط بحسابك' });
      // Check email uniqueness
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'البريد الإلكتروني مستخدم بالفعل' });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const openId = `local_${input.email}`;
      // Create user directly as active
      const user = await db.createLocalUser({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        officeId,
        userType: 'employee',
        isActive: true,
      } as any);
      // Add to office_members
      const dbOffice = await import('./db-office');
      await dbOffice.addOfficeMember({
        officeId,
        userId: user!.id,
        role: input.role,
        permissions: input.permissions,
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: 'create',
        entityType: 'user',
        entityId: user!.id,
        newValue: { name: input.name, email: input.email, role: input.role },
      });
      return { success: true, userId: user!.id };
    }),

    // ── Update employee password (owner only) ─────────────────────────────
    updateEmployeePassword: protectedProcedure.input(z.object({
      userId: z.number(),
      newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'فقط مالك المكتب يمكنه تغيير كلمات مرور الموظفين' });
      }
      const officeId = (ctx.user as any).officeId;
      const targetUser = await db.getUserById(input.userId);
      if (!targetUser || (targetUser as any).officeId !== officeId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'الموظف غير موجود في مكتبك' });
      }
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(input.userId, newHash);
      return { success: true };
    }),
  }),

  // ==================== PROFILE ====================
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'المستخدم غير موجود' });
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }),
    update: protectedProcedure.input(z.object({
      name: z.string().min(2, 'الاسم مطلوب').optional(),
      email: z.string().email('بريد إلكتروني غير صحيح').optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateUserProfile(ctx.user.id, input);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'user', entityId: ctx.user.id, newValue: input });
      return { success: true };
    }),
    changePassword: protectedProcedure.input(z.object({
      currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
      newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يمكن تغيير كلمة المرور لهذا الحساب' });
      }
      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'كلمة المرور الحالية غير صحيحة' });
      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.updateUserPassword(ctx.user.id, newHash);
      return { success: true };
    }),
  }),

  // ==================== CUSTOMER PROFILE ====================
  customerProfile: router({
    getFullProfile: permissionProcedure('view_customers').input(z.object({ customerId: z.number() })).query(async ({ input }) => {
      const customer = await db.getCustomerById(input.customerId);
      if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'العميل غير موجود' });
      const customerContracts = await db.getAllContracts({ customerId: input.customerId });
      const customerReservations = await db.getAllReservations({ customerId: input.customerId });
      const customerPayments = await db.getPaymentsByCustomerId(input.customerId);
      // Get unique vehicles rented by this customer from contracts
      const vehicleIdsSet = new Set(customerContracts.map(c => c.vehicleId).filter((id): id is number => !!id));
      const vehicleIds = Array.from(vehicleIdsSet);
      const rentedVehicles = vehicleIds.length > 0 ? await db.getVehiclesByIds(vehicleIds) : [];
      const totalSpent = customerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const activeContracts = customerContracts.filter(c => c.status === 'active').length;
      const completedContracts = customerContracts.filter(c => c.status === 'completed').length;
      return {
        customer,
        contracts: customerContracts,
        reservations: customerReservations,
        payments: customerPayments,
        rentedVehicles,
        stats: { totalSpent, activeContracts, completedContracts, totalContracts: customerContracts.length },
      };
    }),
  }),

  // ==================== DASHBOARD STATS ====================
  dashboardStats: router({
    monthlyRevenue: permissionProcedure('view_dashboard').query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getMonthlyRevenue(6, officeId);
    }),
    fleetStatus: permissionProcedure('view_dashboard').query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getDashboardStats(undefined, officeId);
    }),
  }),

  // ==================== PDF REPORTS ====================
  reports: router({
    fleetPdf: permissionProcedure('view_reports').mutation(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const dbOffice = await import('./db-office');
      const [office, vehicles, branches] = await Promise.all([
        dbOffice.getOfficeById(officeId),
        db.getAllVehicles({ officeId }),
        db.getAllBranches(officeId),
      ]);
      const branchName = new Map(branches.map(b => [b.id, b.name]));
      const statusLabels: Record<string, string> = { available: 'متاحة', reserved: 'محجوزة', rented: 'مؤجرة', late: 'متأخرة', maintenance: 'صيانة', in_transfer: 'قيد النقل' };
      const categoryLabels: Record<string, string> = { economy: 'اقتصادية', family: 'عائلية', luxury: 'فاخرة' };
      const countBy = (status: string) => vehicles.filter(v => v.status === status).length;
      const html = buildReportHtml({
        title: 'تقرير حالة الأسطول',
        officeName: office?.name,
        summary: [
          { label: 'إجمالي السيارات', value: String(vehicles.length) },
          { label: 'متاحة', value: String(countBy('available')) },
          { label: 'مؤجرة', value: String(countBy('rented')) },
          { label: 'في الصيانة', value: String(countBy('maintenance')) },
          { label: 'متأخرة', value: String(countBy('late')) },
        ],
        tables: [{
          headers: ['اللوحة', 'السيارة', 'الفئة', 'الفرع', 'الحالة', 'العداد (كم)', 'السعر اليومي'],
          rows: vehicles.map(v => [
            v.plateNumber,
            `${v.brand} ${v.model} ${v.year}`,
            categoryLabels[v.category] ?? v.category,
            branchName.get(v.branchId) ?? '-',
            statusLabels[v.status] ?? v.status,
            v.currentMileage.toLocaleString('ar-SA'),
            `${Number(v.dailyRate).toLocaleString('ar-SA')} ر.س`,
          ]),
        }],
      });
      const pdf = await renderHtmlToPdf(html);
      const { url } = await storagePut(`reports/${officeId}/fleet.pdf`, pdf, 'application/pdf');
      return { url };
    }),
    revenuePdf: permissionProcedure('view_reports').input(z.object({
      months: z.number().min(1).max(24).default(6),
    }).optional()).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const dbOffice = await import('./db-office');
      const [office, revenue] = await Promise.all([
        dbOffice.getOfficeById(officeId),
        db.getMonthlyRevenue(input?.months ?? 6, officeId),
      ]);
      const total = revenue.reduce((sum, r) => sum + r.revenue, 0);
      const html = buildReportHtml({
        title: 'تقرير الإيرادات الشهرية',
        subtitle: `آخر ${input?.months ?? 6} أشهر`,
        officeName: office?.name,
        summary: [
          { label: 'إجمالي الإيرادات', value: `${total.toLocaleString('ar-SA')} ر.س` },
          { label: 'متوسط شهري', value: `${Math.round(total / revenue.length).toLocaleString('ar-SA')} ر.س` },
        ],
        tables: [{
          headers: ['الشهر', 'الإيرادات'],
          rows: revenue.map(r => [r.month, `${r.revenue.toLocaleString('ar-SA')} ر.س`]),
        }],
      });
      const pdf = await renderHtmlToPdf(html);
      const { url } = await storagePut(`reports/${officeId}/revenue.pdf`, pdf, 'application/pdf');
      return { url };
    }),
    contractsPdf: permissionProcedure('view_reports').input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional()).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      const dbOffice = await import('./db-office');
      const [office, allContracts, customers, vehicles] = await Promise.all([
        dbOffice.getOfficeById(officeId),
        db.getAllContracts({ officeId }),
        db.getAllCustomers(undefined, officeId),
        db.getAllVehicles({ officeId }),
      ]);
      const from = input?.from ? new Date(input.from) : null;
      const to = input?.to ? new Date(`${input.to}T23:59:59`) : null;
      const filtered = allContracts.filter(c => {
        const created = new Date(c.createdAt);
        return (!from || created >= from) && (!to || created <= to);
      });
      const customerName = new Map(customers.map(c => [c.id, c.name]));
      const vehiclePlate = new Map(vehicles.map(v => [v.id, v.plateNumber]));
      const statusLabels: Record<string, string> = { draft: 'مسودة', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي' };
      const total = filtered.reduce((sum, c) => sum + Number(c.finalPrice || c.basePrice), 0);
      const html = buildReportHtml({
        title: 'تقرير العقود',
        subtitle: from || to
          ? `من ${from ? from.toLocaleDateString('ar-SA') : 'البداية'} إلى ${to ? to.toLocaleDateString('ar-SA') : 'اليوم'}`
          : 'جميع العقود',
        officeName: office?.name,
        summary: [
          { label: 'عدد العقود', value: String(filtered.length) },
          { label: 'إجمالي القيمة', value: `${total.toLocaleString('ar-SA')} ر.س` },
          { label: 'عقود نشطة', value: String(filtered.filter(c => c.status === 'active').length) },
        ],
        tables: [{
          headers: ['رقم العقد', 'العميل', 'اللوحة', 'البداية', 'النهاية', 'الحالة', 'الإجمالي'],
          rows: filtered.map(c => [
            c.contractNumber,
            customerName.get(c.customerId) ?? '-',
            vehiclePlate.get(c.vehicleId) ?? '-',
            new Date(c.startDate).toLocaleDateString('ar-SA'),
            new Date(c.endDate).toLocaleDateString('ar-SA'),
            statusLabels[c.status] ?? c.status,
            `${Number(c.finalPrice || c.basePrice).toLocaleString('ar-SA')} ر.س`,
          ]),
        }],
      });
      const pdf = await renderHtmlToPdf(html);
      const { url } = await storagePut(`reports/${officeId}/contracts.pdf`, pdf, 'application/pdf');
      return { url };
    }),
  }),

  // ==================== EXPORT ====================
  export: router({
    contracts: permissionProcedure('view_reports').input(z.object({
      status: z.string().optional(),
      branchId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllContracts({ ...(input ?? {}), officeId });
    }),
    customers: permissionProcedure('view_reports').query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllCustomers(undefined, officeId);
    }),
    payments: permissionProcedure('view_reports').input(z.object({
      contractId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllPayments({ ...(input ?? {}), officeId });
    }),
  }),

    // ==================== USERS MANAGEMENT ====================
  users: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      return db.getAllUsers(officeId);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      role: z.enum(['owner', 'admin', 'staff', 'accountant']).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateUser(id, data as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'update', entityType: 'user', entityId: id, newValue: data });
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يمكن حذف حسابك الخاص' });
      await db.updateUser(input.id, { isActive: false } as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'delete', entityType: 'user', entityId: input.id, newValue: null });
      return { success: true };
    }),
  }),

  // ==================== OFFICE (Multi-Tenant) ====================
  office: router({
    // Get current user's office info
    myOffice: protectedProcedure.query(async ({ ctx }) => {
      const dbOffice = await import('./db-office');
      const officeId = (ctx.user as any).officeId;
      if (!officeId) return null;
      return dbOffice.getOfficeById(officeId);
    }),

    // Update office info (owner only)
    update: protectedProcedure.input(z.object({
      name: z.string().min(1).optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })).mutation(async ({ input, ctx }) => {
      const officeId = (ctx.user as any).officeId;
      if (!officeId) throw new TRPCError({ code: 'FORBIDDEN', message: 'لا يوجد مكتب مرتبط بحسابك' });
      if (ctx.user.role !== 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'فقط مالك المكتب يمكنه تعديل بيانات المكتب' });
      const dbOffice = await import('./db-office');
      await dbOffice.updateOffice(officeId, input);
      return { success: true };
    }),

    // List office members
    members: protectedProcedure.query(async ({ ctx }) => {
      const officeId = (ctx.user as any).officeId;
      if (!officeId) return [];
      const dbOffice = await import('./db-office');
      return dbOffice.getOfficeMembersByOffice(officeId);
    }),

    // Resolved permission map for the current user (drives sidebar visibility)
    myPermissions: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user as any;
      let memberPermissions: unknown = null;
      if (user.role !== 'owner' && user.officeId) {
        const dbOffice = await import('./db-office');
        const member = await dbOffice.getOfficeMember(user.officeId, user.id);
        memberPermissions = member?.permissions ?? null;
      }
      return Object.fromEntries(
        ALL_PERMISSION_KEYS.map(key => [key, resolvePermission(user.role, memberPermissions, key)]),
      ) as Record<string, boolean>;
    }),

    // Update member permissions/role
    updateMember: protectedProcedure.input(z.object({
      memberId: z.number(),
      role: z.enum(['admin', 'staff', 'accountant']).optional(),
      permissions: z.record(z.string(), z.boolean()).optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ليس لديك صلاحية تعديل أعضاء المكتب' });
      }
      const dbOffice = await import('./db-office');
      const { memberId, ...data } = input;
      await dbOffice.updateOfficeMember(memberId, data as any);
      return { success: true };
    }),

    // Remove member from office
    removeMember: protectedProcedure.input(z.object({
      userId: z.number(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'فقط مالك المكتب يمكنه إزالة الأعضاء' });
      }
      const officeId = (ctx.user as any).officeId;
      if (!officeId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد مكتب' });
      const dbOffice = await import('./db-office');
      await dbOffice.removeOfficeMember(officeId, input.userId);
      return { success: true };
    }),
  }),

  // ==================== INVITATIONS ====================
  invitations: router({
    // Send invitation (owner/admin only)
    send: protectedProcedure.input(z.object({
      email: z.string().email('البريد الإلكتروني غير صحيح'),
      role: z.enum(['admin', 'staff', 'accountant']),
      permissions: z.record(z.string(), z.boolean()).optional(),
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ليس لديك صلاحية إرسال الدعوات' });
      }
      const officeId = (ctx.user as any).officeId;
      if (!officeId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد مكتب مرتبط بحسابك' });

      const dbOffice = await import('./db-office');
      const { token, id } = await dbOffice.createInvitation({
        officeId,
        invitedBy: ctx.user.id,
        email: input.email,
        role: input.role,
        permissions: input.permissions as Record<string, boolean> | undefined,
      });

      // Get office name for email
      const office = await dbOffice.getOfficeById(officeId);

      // Send invitation email (non-blocking) using proper invitation template
      sendInvitationEmail({
        to: input.email,
        officeName: office?.name ?? 'مكتب تأجير السيارات',
        inviterName: ctx.user.name ?? 'مالك المكتب',
        role: input.role,
        inviteToken: token,
      }).catch((err) => console.error('[Invitation] Email send failed:', err)); // Non-blocking

      return { success: true, invitationId: id, token };
    }),

    // List invitations for current office
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'admin') return [];
      const officeId = (ctx.user as any).officeId;
      if (!officeId) return [];
      const dbOffice = await import('./db-office');
      return dbOffice.getInvitationsByOffice(officeId);
    }),

    // Cancel invitation
    cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'owner' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ليس لديك صلاحية إلغاء الدعوات' });
      }
      const officeId = (ctx.user as any).officeId;
      if (!officeId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا يوجد مكتب' });
      const dbOffice = await import('./db-office');
      await dbOffice.cancelInvitation(input.id, officeId);
      return { success: true };
    }),

    // Get invitation info by token (public)
    getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const dbOffice = await import('./db-office');
      const inv = await dbOffice.getInvitationByToken(input.token);
      if (!inv) return null;
      const office = await dbOffice.getOfficeById(inv.officeId);
      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        officeName: office?.name ?? 'مكتب تأجير السيارات',
        expiresAt: inv.expiresAt,
      };
    }),

    // Accept invitation (logged-in user)
    accept: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ input, ctx }) => {
      const dbOffice = await import('./db-office');
      const result = await dbOffice.acceptInvitation(input.token, ctx.user.id);
      return { success: true, ...result };
    }),
  }),
});
export type AppRouter = typeof appRouter;
