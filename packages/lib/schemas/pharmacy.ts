import { z } from "zod";

export const MedicationCategorySchema = z.enum([
  "ARV",
  "PREP", 
  "TB_PROPHYLAXIS",
  "STI",
  "OTHER"
]);

export const CreateMedicationSchema = z.object({
  name: z.string().min(1).max(200),
  category: MedicationCategorySchema,
  code: z.string().max(50).optional(),
  extra: z.record(z.unknown()).optional(),
  active: z.boolean().default(true)
});

export const CreateRegimenSchema = z.object({
  name: z.string().min(1).max(200),
  category: MedicationCategorySchema,
  active: z.boolean().default(true),
  items: z.array(z.object({
    medicationId: z.string().uuid(),
    qtyPerDose: z.number().positive().optional(),
    unit: z.string().max(20).optional()
  })).min(1)
});

const CreatePrescriptionBase = z.object({
  clientId: z.string().uuid(),
  category: MedicationCategorySchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  prescriberId: z.string().uuid().optional(),
  instructions: z.string().optional(),
  reasonChange: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const CreatePrescriptionSchema = z.union([
  CreatePrescriptionBase.extend({ type: z.literal("regimen"), regimenId: z.string().uuid() })
    .transform(({ type: _t, regimenId, ...data }) => ({ ...data, regimenId })),
  CreatePrescriptionBase.extend({ type: z.literal("medication"), medicationId: z.string().uuid() })
    .transform(({ type: _t, medicationId, ...data }) => ({ ...data, medicationId })),
]);

export const UpdatePrescriptionSchema = z.object({
  endDate: z.coerce.date().optional(),
  instructions: z.string().optional(),
  reasonChange: z.string().optional(),
  isActive: z.boolean().optional()
});

export const CreateDispenseSchema = z.object({
  prescriptionId: z.string().uuid(),
  dispensedAt: z.coerce.date(),
  daysSupply: z.number().int().positive().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  nextRefillDate: z.coerce.date().optional(),
  note: z.string().optional()
});

export const DispenseSearchSchema = z.object({
  clientId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
  category: MedicationCategorySchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export const PrescriptionSearchSchema = z.object({
  clientId: z.string().uuid().optional(),
  category: MedicationCategorySchema.optional(),
  isActive: z.boolean().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;
export type CreateRegimenInput = z.infer<typeof CreateRegimenSchema>;
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof UpdatePrescriptionSchema>;
export type CreateDispenseInput = z.infer<typeof CreateDispenseSchema>;
export type DispenseSearchInput = z.infer<typeof DispenseSearchSchema>;
export type PrescriptionSearchInput = z.infer<typeof PrescriptionSearchSchema>;
