import { z } from "zod";

export const LifecycleStatusSchema = z.enum([
  "ACTIVE",
  "TRANSFERRED_OUT", 
  "EXPIRED",
  "LOST_TO_FOLLOW_UP",
  "INACTIVE"
]);

export const SexAssignedAtBirthSchema = z.enum([
  "MALE",
  "FEMALE", 
  "INTERSEX",
  "UNKNOWN"
]);

export const CreateClientSchema = z.object({
  facilityId: z.string().uuid(),
  clientCode: z.string().min(1).max(50),
  uic: z.string().min(1).max(50),
  philHealth: z.string().optional(),
  legalSurname: z.string().min(1).max(100),
  legalFirst: z.string().min(1).max(100),
  legalMiddle: z.string().max(100).optional(),
  suffix: z.string().max(20).optional(),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  sexAtBirth: SexAssignedAtBirthSchema,
  genderIdentityId: z.string().uuid().optional(),
  homeAddress: z.string().optional(),
  workAddress: z.string().optional(),
  occupation: z.string().max(100).optional(),
  contactNumber: z.string().max(32).optional(),
  email: z.string().email().optional(),
  caseManagerId: z.string().uuid().optional(),
  notes: z.string().optional(),
  dateEnrolled: z.coerce.date(),
  currentFacilityId: z.string().uuid(),
  populationIds: z.array(z.string().uuid()).optional()
});

export const UpdateClientSchema = CreateClientSchema.partial().omit({
  facilityId: true,
  dateEnrolled: true
});

export const ClientSearchSchema = z.object({
  search: z.string().optional(),
  status: LifecycleStatusSchema.optional(),
  facilityId: z.string().uuid().optional(),
  caseManagerId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export const TransferClientSchema = z.object({
  clientId: z.string().uuid(),
  toFacilityId: z.string().uuid(),
  transferDate: z.coerce.date(),
  note: z.string().optional()
});

export const UpdateClientStatusSchema = z.object({
  status: LifecycleStatusSchema,
  expirationDate: z.coerce.date().optional()
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ClientSearchInput = z.infer<typeof ClientSearchSchema>;
export type TransferClientInput = z.infer<typeof TransferClientSchema>;
export type UpdateClientStatusInput = z.infer<typeof UpdateClientStatusSchema>;