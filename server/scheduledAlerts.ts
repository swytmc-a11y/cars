/**
 * Scheduled Alerts Handler
 * Runs daily via Heartbeat cron to check:
 * 1. Vehicle documents expiring within 30 days
 * 2. Overdue contract returns (past end date, still active)
 *
 * Endpoint: POST /api/scheduled/daily-alerts
 * Auth: isCron === true (platform Heartbeat)
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import {
  vehicleDocuments,
  contracts,
  vehicles,
  customers,
  alerts,
  branches,
  vehicleLocations,
} from "../drizzle/schema";
import { and, eq, lte, gte, sql, desc, inArray } from "drizzle-orm";

const STALE_TRACKING_HOURS = 6;

export async function dailyAlertsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alertsCreated: string[] = [];

    // Get today's date string for deduplication (one alert per entity per day)
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // ─── 1. Check expiring vehicle documents ───────────────────────────────
    const expiringDocs = await db
      .select({
        docId: vehicleDocuments.id,
        vehicleId: vehicleDocuments.vehicleId,
        docType: vehicleDocuments.type,
        expiryDate: vehicleDocuments.expiryDate,
        vehiclePlate: vehicles.plateNumber,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        officeId: vehicles.officeId,
        branchId: vehicles.branchId,
      })
      .from(vehicleDocuments)
      .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(
        and(
          lte(vehicleDocuments.expiryDate, in30Days),
          gte(vehicleDocuments.expiryDate, now),
          eq(vehicles.isActive, true)
        )
      );

    const docTypeLabels: Record<string, string> = {
      insurance: "التأمين",
      registration: "الترخيص",
      inspection: "الفحص الدوري",
      other: "وثيقة",
    };

    for (const doc of expiringDocs) {
      const daysLeft = Math.ceil(
        (new Date(doc.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const label = docTypeLabels[doc.docType as string] ?? "وثيقة";
      const vehicleName = `${doc.vehicleBrand} ${doc.vehicleModel} (${doc.vehiclePlate})`;

      const message = `تنبيه: ${label} السيارة ${vehicleName} ستنتهي خلال ${daysLeft} يوم`;
      const alertType = daysLeft <= 7 ? "danger" : "warning";

      // Idempotency: skip if we already created this alert today
      const existingDocAlert = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(
          and(
            eq(alerts.relatedEntity, "vehicle"),
            eq(alerts.relatedId, doc.vehicleId),
            sql`DATE(${alerts.createdAt}) = ${todayStr}`,
            eq(alerts.title, `انتهاء ${label} قريباً`)
          )
        )
        .limit(1);

      if (existingDocAlert.length > 0) continue;

      await db.insert(alerts).values({
        officeId: doc.officeId,
        branchId: doc.branchId ?? null,
        type: alertType,
        title: `انتهاء ${label} قريباً`,
        message,
        relatedEntity: "vehicle",
        relatedId: doc.vehicleId,
        isRead: false,
      });

      alertsCreated.push(`doc-expiry:${doc.docId}`);
    }

    // ─── 2. Check overdue contracts (past end date, still active) ──────────
    const overdueContracts = await db
      .select({
        contractId: contracts.id,
        contractNumber: contracts.contractNumber,
        endDate: contracts.endDate,
        vehicleId: contracts.vehicleId,
        customerId: contracts.customerId,
        vehiclePlate: vehicles.plateNumber,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        officeId: contracts.officeId,
        branchId: contracts.branchId,
        customerName: customers.name,
      })
      .from(contracts)
      .innerJoin(vehicles, eq(contracts.vehicleId, vehicles.id))
      .innerJoin(customers, eq(contracts.customerId, customers.id))
      .where(
        and(
          eq(contracts.status, "active"),
          lte(contracts.endDate, now)
        )
      );

    for (const contract of overdueContracts) {
      const overdueDays = Math.floor(
        (now.getTime() - new Date(contract.endDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const vehicleName = `${contract.vehicleBrand} ${contract.vehicleModel} (${contract.vehiclePlate})`;
      const message = `العقد رقم ${contract.contractNumber} للعميل ${contract.customerName} - السيارة ${vehicleName} متأخرة ${overdueDays} يوم`;

      // Idempotency: skip if we already created this alert today
      const existingOverdueAlert = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(
          and(
            eq(alerts.relatedEntity, "contract"),
            eq(alerts.relatedId, contract.contractId),
            sql`DATE(${alerts.createdAt}) = ${todayStr}`,
            eq(alerts.title, "تأخر إرجاع سيارة")
          )
        )
        .limit(1);

      if (existingOverdueAlert.length > 0) continue;

      await db.insert(alerts).values({
        officeId: contract.officeId,
        branchId: contract.branchId ?? null,
        type: "danger",
        title: "تأخر إرجاع سيارة",
        message,
        relatedEntity: "contract",
        relatedId: contract.contractId,
        isRead: false,
      });

      alertsCreated.push(`overdue:${contract.contractId}`);
    }

    // ─── 3. Check stale GPS tracking on rented vehicles ────────────────────
    const rentedVehicles = await db
      .select({ id: vehicles.id, plateNumber: vehicles.plateNumber, brand: vehicles.brand, model: vehicles.model, officeId: vehicles.officeId, branchId: vehicles.branchId })
      .from(vehicles)
      .where(and(eq(vehicles.status, "rented"), eq(vehicles.isActive, true)));

    if (rentedVehicles.length > 0) {
      const staleThreshold = new Date(now.getTime() - STALE_TRACKING_HOURS * 60 * 60 * 1000);
      const rentedIds = rentedVehicles.map(v => v.id);
      const recentPings = await db
        .select({ vehicleId: vehicleLocations.vehicleId, recordedAt: vehicleLocations.recordedAt })
        .from(vehicleLocations)
        .where(and(inArray(vehicleLocations.vehicleId, rentedIds), gte(vehicleLocations.recordedAt, staleThreshold)));
      const trackedIds = new Set(recentPings.map(p => p.vehicleId));

      for (const vehicle of rentedVehicles) {
        if (trackedIds.has(vehicle.id)) continue;
        const vehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber})`;
        const message = `لا توجد بيانات موقع حديثة للسيارة ${vehicleName} منذ أكثر من ${STALE_TRACKING_HOURS} ساعات`;

        const existingStaleAlert = await db
          .select({ id: alerts.id })
          .from(alerts)
          .where(
            and(
              eq(alerts.relatedEntity, "vehicle"),
              eq(alerts.relatedId, vehicle.id),
              sql`DATE(${alerts.createdAt}) = ${todayStr}`,
              eq(alerts.title, "انقطاع تتبع السيارة")
            )
          )
          .limit(1);

        if (existingStaleAlert.length > 0) continue;

        await db.insert(alerts).values({
          officeId: vehicle.officeId,
          branchId: vehicle.branchId ?? null,
          type: "warning",
          title: "انقطاع تتبع السيارة",
          message,
          relatedEntity: "vehicle",
          relatedId: vehicle.id,
          isRead: false,
        });

        alertsCreated.push(`stale-tracking:${vehicle.id}`);
      }
    }

    return res.json({
      ok: true,
      alertsCreated: alertsCreated.length,
      details: alertsCreated,
      timestamp: now.toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return res.status(500).json({
      error,
      stack,
      context: { url: req.url, timestamp: new Date().toISOString() },
    });
  }
}
