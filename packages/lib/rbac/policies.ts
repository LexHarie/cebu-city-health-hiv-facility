/**
 * RBAC Permission Policies
 * Defines comprehensive permissions for all roles and resources
 */

import { 
  ROLES, 
  RESOURCES, 
  ACTIONS, 
  SCOPES, 
  type Role, 
  type Permission 
} from './constants'

/**
 * Role-based permission policies
 * Each role maps to an array of permissions they are granted
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  
  // ENCODER - Basic data entry role
  [ROLES.ENCODER]: [
    // Clients - can create and update basic info within facility
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Encounters - can create and update within facility
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Lab panels - can view and create orders within facility
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Tasks - can view assigned tasks
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Dashboard - basic view
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    }
  ],

  // DATA_ANALYST - Read-only access for reporting and analysis
  [ROLES.DATA_ANALYST]: [
    // Clients - read-only access to all data for analysis
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Encounters - read-only access
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Lab data - read-only for analysis
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Prescriptions and pharmacy data
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.DISPENSES,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // STI data for epidemiological analysis
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Reports - full access
    {
      resource: RESOURCES.REPORTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Dashboard - advanced analytics view
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.ALL
    },
    // Facilities - read-only for context
    {
      resource: RESOURCES.FACILITIES,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ALL
    }
  ],

  // PHARMACIST - Medication and dispensing management
  [ROLES.PHARMACIST]: [
    // Clients - read access to medication-relevant info
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Prescriptions - full management within facility
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Dispenses - full management within facility
    {
      resource: RESOURCES.DISPENSES,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Tasks - pharmacy-related tasks
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Dashboard - pharmacy metrics
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    }
  ],

  // NURSE - Clinical care and case management support
  [ROLES.NURSE]: [
    // Clients - comprehensive management within facility
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Encounters - full management within facility
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Lab management within facility
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // STI screening and history
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Tasks - can manage assigned tasks
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Prescriptions - can view and assist with
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Dashboard - clinical view
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    }
  ],

  // CASE_MANAGER - Client relationship and care coordination
  [ROLES.CASE_MANAGER]: [
    // Clients - full management of assigned clients
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.ASSIGN, ACTIONS.TRANSFER],
      scope: SCOPES.ASSIGNED
    },
    // Encounters - manage for assigned clients
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Lab data for assigned clients
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // STI data for assigned clients
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Tasks - comprehensive task management
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Prescriptions for assigned clients
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.ASSIGNED
    },
    // Dashboard - case management view
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    }
  ],

  // PHYSICIAN - Clinical decision making and prescribing
  [ROLES.PHYSICIAN]: [
    // Clients - comprehensive clinical management
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.ASSIGN],
      scope: SCOPES.FACILITY
    },
    // Encounters - full clinical documentation
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Lab management and interpretation
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // STI management
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Prescriptions - full prescribing authority
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Tasks - can create and manage clinical tasks
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    },
    // Dashboard - clinical overview
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    },
    // Reports - clinical reports
    {
      resource: RESOURCES.REPORTS,
      actions: [ACTIONS.READ, ACTIONS.LIST],
      scope: SCOPES.FACILITY
    }
  ],

  // ADMIN - Facility administration and user management
  [ROLES.ADMIN]: [
    // Users - full user management within facility
    {
      resource: RESOURCES.USERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.ASSIGN],
      scope: SCOPES.FACILITY
    },
    // Facility management
    {
      resource: RESOURCES.FACILITIES,
      actions: [ACTIONS.READ, ACTIONS.UPDATE],
      scope: SCOPES.OWN
    },
    // Audit logs - facility-level access
    {
      resource: RESOURCES.AUDIT_LOGS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    // All clinical data within facility
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.LIST, ACTIONS.TRANSFER, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.DISPENSES,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    // Tasks - administrative oversight
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.ASSIGN],
      scope: SCOPES.FACILITY
    },
    // Reports - administrative reports
    {
      resource: RESOURCES.REPORTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.FACILITY
    },
    // Dashboard - administrative overview
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.FACILITY
    }
  ],

  // DIRECTOR - System-wide oversight and management
  [ROLES.DIRECTOR]: [
    // System-wide user management
    {
      resource: RESOURCES.USERS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.ASSIGN, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // Full facility management
    {
      resource: RESOURCES.FACILITIES,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST],
      scope: SCOPES.ALL
    },
    // System-wide audit access
    {
      resource: RESOURCES.AUDIT_LOGS,
      actions: [ACTIONS.READ, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // All clinical data system-wide
    {
      resource: RESOURCES.CLIENTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.TRANSFER, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.ENCOUNTERS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.LAB_PANELS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.LAB_RESULTS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.PRESCRIPTIONS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.DISPENSES,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.STI_HISTORY,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    {
      resource: RESOURCES.STI_SCREENINGS,
      actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // System-wide task management
    {
      resource: RESOURCES.TASKS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.ASSIGN, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // System-wide reporting
    {
      resource: RESOURCES.REPORTS,
      actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.LIST, ACTIONS.EXPORT],
      scope: SCOPES.ALL
    },
    // System-wide dashboard
    {
      resource: RESOURCES.DASHBOARD,
      actions: [ACTIONS.READ],
      scope: SCOPES.ALL
    }
  ]
}

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Get all permissions for multiple roles (union of permissions)
 */
export function getMultiRolePermissions(roles: Role[]): Permission[] {
  const allPermissions: Permission[] = []
  
  for (const role of roles) {
    allPermissions.push(...getRolePermissions(role))
  }
  
  return allPermissions
}

/**
 * Check if a role has higher or equal hierarchy than another
 */
export function hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  return userLevel >= requiredLevel
}