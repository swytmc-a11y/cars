/**
 * Tests for dailyAlertsHandler (server/scheduledAlerts.ts)
 *
 * Strategy: mock sdk.authenticateRequest and getDb.
 * The Drizzle query builder uses a fluent chain that resolves when awaited.
 * We build a mock chain where the final `.limit()` / `.values()` call
 * returns a Promise so `await db.select()...limit()` works correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Keep drizzle-orm operators as simple pass-through stubs
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: (...args: unknown[]) => ({ _and: args }),
    eq: (col: unknown, val: unknown) => ({ _eq: [col, val] }),
    lte: (col: unknown, val: unknown) => ({ _lte: [col, val] }),
    gte: (col: unknown, val: unknown) => ({ _gte: [col, val] }),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        _sql: { strings, values },
      }),
      { raw: (s: string) => ({ _sqlRaw: s }) }
    ),
  };
});

// Minimal schema stubs
vi.mock("../drizzle/schema", () => ({
  vehicleDocuments: { id: "id", vehicleId: "vehicleId", type: "type", expiryDate: "expiryDate" },
  contracts: { id: "id", contractNumber: "contractNumber", endDate: "endDate", vehicleId: "vehicleId", customerId: "customerId", branchId: "branchId", status: "status" },
  vehicles: { id: "id", plateNumber: "plateNumber", brand: "brand", model: "model", branchId: "branchId", isActive: "isActive" },
  customers: { id: "id", name: "name" },
  alerts: { id: "id", relatedEntity: "relatedEntity", relatedId: "relatedId", createdAt: "createdAt", title: "title" },
  branches: { id: "id" },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { dailyAlertsHandler } from "./scheduledAlerts";

const mockSdk = vi.mocked(sdk);
const mockGetDb = vi.mocked(getDb);

function makeCronUser() {
  return { isCron: true, taskUid: "test-task-uid" };
}

function makeReq(): Request {
  return { url: "/api/scheduled/daily-alerts", headers: {} } as unknown as Request;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

/**
 * Build a Drizzle-like fluent mock.
 * The chain is thenable (has .then) so `await chain` resolves to `result`.
 * `.limit()` and `.values()` also return a thenable resolving to `result`.
 */
function makeChain(result: unknown) {
  const thenable = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    catch: (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject),
  };

  const limitFn = vi.fn().mockReturnValue(thenable);
  const valuesFn = vi.fn().mockReturnValue(thenable);

  const chain: Record<string, unknown> = {
    ...thenable,
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: limitFn,
    values: valuesFn,
  };

  // Make chain itself thenable (for cases where no .limit() is called)
  Object.assign(chain, thenable);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("dailyAlertsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when called by a non-cron user", async () => {
    mockSdk.authenticateRequest.mockResolvedValue({ isCron: false } as never);
    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only endpoint" });
  });

  it("returns 500 when database is unavailable", async () => {
    mockSdk.authenticateRequest.mockResolvedValue(makeCronUser() as never);
    mockGetDb.mockResolvedValue(null as never);
    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Database not available" });
  });

  it("returns ok:true with zero alerts when nothing is expiring or overdue", async () => {
    mockSdk.authenticateRequest.mockResolvedValue(makeCronUser() as never);

    const db = {
      select: vi.fn().mockReturnValue(makeChain([])),
      insert: vi.fn().mockReturnValue(makeChain([])),
    };

    mockGetDb.mockResolvedValue(db as never);

    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alertsCreated: 0 })
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates an alert for an expiring vehicle document", async () => {
    mockSdk.authenticateRequest.mockResolvedValue(makeCronUser() as never);

    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const expiringDocs = [
      {
        docId: 1,
        vehicleId: 10,
        docType: "insurance",
        expiryDate: in15Days,
        vehiclePlate: "ABC-123",
        vehicleBrand: "Toyota",
        vehicleModel: "Camry",
        branchId: 1,
      },
    ];

    // select call sequence:
    // 1st → expiringDocs list
    // 2nd → idempotency check for doc alert → [] (no existing)
    // 3rd → overdueContracts list → []
    let selectCallCount = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        return makeChain(
          selectCallCount === 1 ? expiringDocs : []
        );
      }),
      insert: vi.fn().mockReturnValue(makeChain([])),
    };

    mockGetDb.mockResolvedValue(db as never);

    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alertsCreated: 1 })
    );
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("creates an alert for an overdue contract", async () => {
    mockSdk.authenticateRequest.mockResolvedValue(makeCronUser() as never);

    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const overdueContracts = [
      {
        contractId: 99,
        contractNumber: "CNT-001",
        endDate: yesterday,
        vehicleId: 10,
        customerId: 5,
        vehiclePlate: "XYZ-999",
        vehicleBrand: "Honda",
        vehicleModel: "Civic",
        branchId: 1,
        customerName: "أحمد محمد",
      },
    ];

    // select call sequence:
    // 1st → expiringDocs → []
    // 2nd → overdueContracts list
    // 3rd → idempotency check for overdue alert → [] (no existing)
    let selectCallCount = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        return makeChain(
          selectCallCount === 2 ? overdueContracts : []
        );
      }),
      insert: vi.fn().mockReturnValue(makeChain([])),
    };

    mockGetDb.mockResolvedValue(db as never);

    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alertsCreated: 1 })
    );
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("skips inserting when an identical alert already exists today (idempotency)", async () => {
    mockSdk.authenticateRequest.mockResolvedValue(makeCronUser() as never);

    const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const expiringDocs = [
      {
        docId: 1,
        vehicleId: 10,
        docType: "insurance",
        expiryDate: in15Days,
        vehiclePlate: "ABC-123",
        vehicleBrand: "Toyota",
        vehicleModel: "Camry",
        branchId: 1,
      },
    ];

    // select call sequence:
    // 1st → expiringDocs list
    // 2nd → idempotency check → existing alert found → skip insert
    // 3rd → overdueContracts → []
    let selectCallCount = 0;
    const db = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return makeChain(expiringDocs);
        if (selectCallCount === 2) return makeChain([{ id: 42 }]); // existing alert
        return makeChain([]);
      }),
      insert: vi.fn().mockReturnValue(makeChain([])),
    };

    mockGetDb.mockResolvedValue(db as never);

    const req = makeReq();
    const res = makeRes();

    await dailyAlertsHandler(req, res);

    // No insert because alert already exists today
    expect(db.insert).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alertsCreated: 0 })
    );
  });
});
