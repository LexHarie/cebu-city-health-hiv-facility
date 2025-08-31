import { z } from "zod";

export const ResultStatusSchema = z.enum([
  "POSITIVE",
  "NEGATIVE", 
  "INDETERMINATE",
  "PENDING",
  "NOT_DONE"
]);

export const ViralLoadStatusSchema = z.enum([
  "UNDETECTABLE",
  "SUPPRESSED",
  "DETECTABLE", 
  "HIGH_NOT_SUPPRESSED",
  "PENDING",
  "NOT_DONE"
]);

export const CreateLabPanelSchema = z.object({
  clientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  panelTypeId: z.string().uuid(),
  orderedAt: z.coerce.date().optional(),
  collectedAt: z.coerce.date().optional(),
  reportedAt: z.coerce.date().optional(),
  labName: z.string().max(100).optional(),
  status: ResultStatusSchema.default("PENDING")
});

export const CreateLabResultSchema = z.object({
  panelId: z.string().uuid(),
  testTypeId: z.string().uuid(),
  valueNum: z.number().optional(),
  valueText: z.string().max(500).optional(),
  unit: z.string().max(20).optional(),
  refLow: z.number().optional(),
  refHigh: z.number().optional(),
  abnormal: z.boolean().optional()
}).refine((data) => data.valueNum !== undefined || data.valueText !== undefined, {
  message: "Either valueNum or valueText must be provided"
});

export const UpdateLabPanelSchema = CreateLabPanelSchema.partial().omit({
  clientId: true
});

export const UpdateLabResultSchema = z.object({
  valueNum: z.number().optional(),
  valueText: z.string().max(500).optional(),
  unit: z.string().max(20).optional(),
  refLow: z.number().optional(),
  refHigh: z.number().optional(),
  abnormal: z.boolean().optional()
}).partial().refine((data) => 
  data.valueNum !== undefined || data.valueText !== undefined || 
  Object.keys(data).length === 0, {
  message: "Either valueNum or valueText must be provided"
});

export const CreateSTIScreeningSchema = z.object({
  clientId: z.string().uuid(),
  diseaseId: z.string().uuid(),
  screeningDate: z.coerce.date(),
  result: ResultStatusSchema,
  labPanelId: z.string().uuid().optional(),
  testName: z.string().max(100).optional(),
  note: z.string().optional()
});

export const CreateSTIHistorySchema = z.object({
  clientId: z.string().uuid(),
  diseaseId: z.string().uuid(),
  hadHistory: z.boolean(),
  note: z.string().optional()
});

export const LabSearchSchema = z.object({
  clientId: z.string().uuid().optional(),
  panelType: z.string().optional(),
  status: ResultStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export type CreateLabPanelInput = z.infer<typeof CreateLabPanelSchema>;
export type CreateLabResultInput = z.infer<typeof CreateLabResultSchema>;
export type UpdateLabPanelInput = z.infer<typeof UpdateLabPanelSchema>;
export type UpdateLabResultInput = z.infer<typeof UpdateLabResultSchema>;
export type CreateSTIScreeningInput = z.infer<typeof CreateSTIScreeningSchema>;
export type CreateSTIHistoryInput = z.infer<typeof CreateSTIHistorySchema>;
export type LabSearchInput = z.infer<typeof LabSearchSchema>;