import { z } from "zod";

export const OtpTypeSchema = z.enum(["EMAIL", "SMS", "TOTP"]);

export const CreateUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  displayName: z.string().min(1).max(100).optional(),
  facilityId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).min(1)
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({
  email: true
});

export const RequestOtpSchema = z.object({
  email: z.string().email(),
  type: OtpTypeSchema.default("EMAIL")
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
  type: OtpTypeSchema.default("EMAIL")
});

export const CreateSessionSchema = z.object({
  userId: z.string().uuid(),
  expiresAt: z.coerce.date(),
  ip: z.string().optional(),
  userAgent: z.string().optional()
});

export const CreateRoleSchema = z.object({
  name: z.enum(["PHYSICIAN", "NURSE", "CASE_MANAGER", "ENCODER", "ADMIN"])
});

export const AssignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid()
});

export const RemoveRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid()
});

export const LoginAttemptSchema = z.object({
  email: z.string().email(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  success: z.boolean()
});

export const SessionValidationSchema = z.object({
  sessionId: z.string().uuid(),
  ip: z.string().optional(),
  userAgent: z.string().optional()
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof RemoveRoleSchema>;
export type LoginAttemptInput = z.infer<typeof LoginAttemptSchema>;
export type SessionValidationInput = z.infer<typeof SessionValidationSchema>;