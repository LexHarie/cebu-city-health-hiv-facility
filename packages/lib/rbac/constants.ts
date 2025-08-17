/**
 * Role-Based Access Control (RBAC) Constants
 * Defines all system roles and their hierarchical relationships
 */

// System roles with their hierarchical levels
export const ROLES = {
  PHYSICIAN: 'PHYSICIAN',
  NURSE: 'NURSE', 
  CASE_MANAGER: 'CASE_MANAGER',
  ENCODER: 'ENCODER',
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  DATA_ANALYST: 'DATA_ANALYST',
  PHARMACIST: 'PHARMACIST'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Role hierarchy - higher numbers have more privileges
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ENCODER]: 1,
  [ROLES.DATA_ANALYST]: 2,
  [ROLES.PHARMACIST]: 3,
  [ROLES.NURSE]: 4,
  [ROLES.CASE_MANAGER]: 5,
  [ROLES.PHYSICIAN]: 6,
  [ROLES.ADMIN]: 7,
  [ROLES.DIRECTOR]: 8
} as const

// Resources that can be controlled by RBAC
export const RESOURCES = {
  CLIENTS: 'clients',
  ENCOUNTERS: 'encounters', 
  LAB_PANELS: 'lab_panels',
  LAB_RESULTS: 'lab_results',
  PRESCRIPTIONS: 'prescriptions',
  DISPENSES: 'dispenses',
  STI_HISTORY: 'sti_history',
  STI_SCREENINGS: 'sti_screenings',
  TASKS: 'tasks',
  USERS: 'users',
  FACILITIES: 'facilities',
  AUDIT_LOGS: 'audit_logs',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard'
} as const

export type Resource = typeof RESOURCES[keyof typeof RESOURCES]

// Actions that can be performed on resources
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  EXPORT: 'export',
  ASSIGN: 'assign',
  TRANSFER: 'transfer'
} as const

export type Action = typeof ACTIONS[keyof typeof ACTIONS]

// Scope modifiers for permissions
export const SCOPES = {
  OWN: 'own',           // Only resources user created/owns
  FACILITY: 'facility', // Resources within user's facility
  ASSIGNED: 'assigned', // Resources assigned to user
  ALL: 'all'           // All resources (system-wide)
} as const

export type Scope = typeof SCOPES[keyof typeof SCOPES]

// Permission structure
export interface Permission {
  resource: Resource
  actions: Action[]
  scope: Scope
  conditions?: Record<string, unknown>
}

// Context for permission evaluation
export interface PermissionContext {
  userId: string
  userRoles: Role[]
  facilityId?: string
  resourceOwnerId?: string
  resourceFacilityId?: string
  assignedUserId?: string
  [key: string]: unknown
}