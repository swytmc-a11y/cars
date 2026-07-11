import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { resolvePermission } from '@shared/permissions';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // owner has full admin access, admin role also has access
    const userRole = (ctx.user as any)?.role;
    if (!ctx.user || (userRole !== 'admin' && userRole !== 'owner')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Procedure gated by a per-module permission key (e.g. "create_contracts").
 * Owners always pass. Other roles are checked against their
 * office_members.permissions record, falling back to their role template.
 */
export function permissionProcedure(permissionKey: string) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      const user = ctx.user as any;
      if (user?.role !== "owner") {
        let memberPermissions: unknown = null;
        if (user?.officeId) {
          const dbOffice = await import("../db-office");
          const member = await dbOffice.getOfficeMember(user.officeId, user.id);
          memberPermissions = member?.permissions ?? null;
        }
        if (!resolvePermission(user?.role, memberPermissions, permissionKey)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتنفيذ هذا الإجراء" });
        }
      }
      return next({ ctx: { ...ctx, user: ctx.user! } });
    }),
  );
}
