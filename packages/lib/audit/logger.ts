import { PrismaClient, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

export type AuditAction = "LOGIN" | "READ" | "CREATE" | "UPDATE" | "DELETE" | "EXPORT";
export type ActorType = "USER" | "SYSTEM";

export interface AuditLogData {
  userId?: string;
  actorType: ActorType;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

export class AuditLogger {
  constructor(private prisma: PrismaClient) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          actorType: data.actorType,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          before: data.before,
          after: data.after,
          ip: data.ip,
          userAgent: data.userAgent
        }
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  async logUserAction(
    userId: string,
    action: AuditAction,
    entity: string,
    entityId: string,
    request?: NextRequest,
    before?: Prisma.InputJsonValue,
    after?: Prisma.InputJsonValue
  ): Promise<void> {
    await this.log({
      userId,
      actorType: "USER",
      action,
      entity,
      entityId,
      before,
      after,
      ip: request ? this.getClientIP(request) : undefined,
      userAgent: request?.headers.get("user-agent") || undefined
    });
  }

  async logSystemAction(
    action: AuditAction,
    entity?: string,
    entityId?: string,
    before?: Prisma.InputJsonValue,
    after?: Prisma.InputJsonValue
  ): Promise<void> {
    await this.log({
      actorType: "SYSTEM",
      action,
      entity,
      entityId,
      before,
      after
    });
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
    
    if (realIP) {
      return realIP;
    }
    
    return request.ip || "unknown";
  }
}

export function createAuditMiddleware(prisma: PrismaClient) {
  const logger = new AuditLogger(prisma);

  return {
    logCreate: async (
      userId: string,
      entity: string,
      entityId: string,
      data: Prisma.InputJsonValue,
      request?: NextRequest
    ) => {
      await logger.logUserAction(userId, "CREATE", entity, entityId, request, undefined, data);
    },

    logUpdate: async (
      userId: string,
      entity: string,
      entityId: string,
      before: Prisma.InputJsonValue,
      after: Prisma.InputJsonValue,
      request?: NextRequest
    ) => {
      await logger.logUserAction(userId, "UPDATE", entity, entityId, request, before, after);
    },

    logDelete: async (
      userId: string,
      entity: string,
      entityId: string,
      data: Prisma.InputJsonValue,
      request?: NextRequest
    ) => {
      await logger.logUserAction(userId, "DELETE", entity, entityId, request, data, undefined);
    },

    logRead: async (
      userId: string,
      entity: string,
      entityId: string,
      request?: NextRequest
    ) => {
      if (["Client", "LabPanel", "Prescription"].includes(entity)) {
        await logger.logUserAction(userId, "READ", entity, entityId, request);
      }
    },

    logLogin: async (
      userId: string,
      request?: NextRequest
    ) => {
      await logger.logUserAction(userId, "LOGIN", "User", userId, request);
    },

    logExport: async (
      userId: string,
      entity: string,
      request?: NextRequest
    ) => {
      await logger.logUserAction(userId, "EXPORT", entity, "bulk", request);
    }
  };
}
