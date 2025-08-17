/**
 * RBAC Permission Checking Helper
 * Provides the main `can` function for permission evaluation
 */

import { getSession, type SessionData } from '../auth/sessions'
import { 
  SCOPES,
  type Role, 
  type Action, 
  type Resource, 
  type Permission,
  type PermissionContext 
} from './constants'
import { getMultiRolePermissions } from './policies'

/**
 * Resource record interface for permission checking
 */
export interface ResourceRecord {
  id?: string
  userId?: string
  facilityId?: string
  assignedUserId?: string
  [key: string]: unknown
}

/**
 * Check if user has permission to perform action on resource
 */
export async function can(
  action: Action,
  resource: Resource,
  record?: ResourceRecord
): Promise<boolean> {
  const session = await getSession()
  if (!session) {
    return false
  }

  return canWithSession(session, action, resource, record)
}

/**
 * Check permission using existing session data
 */
export function canWithSession(
  session: SessionData,
  action: Action,
  resource: Resource,
  record?: ResourceRecord
): boolean {
  const context: PermissionContext = {
    userId: session.userId,
    userRoles: session.roles as Role[],
    facilityId: session.facilityId,
    resourceOwnerId: record?.userId,
    resourceFacilityId: record?.facilityId,
    assignedUserId: record?.assignedUserId
  }

  return evaluatePermissions(context, action, resource, record)
}

/**
 * Core permission evaluation logic
 */
function evaluatePermissions(
  context: PermissionContext,
  action: Action,
  resource: Resource,
  record?: ResourceRecord
): boolean {
  const userPermissions = getMultiRolePermissions(context.userRoles)
  
  // Find permissions that match the resource and action
  const relevantPermissions = userPermissions.filter(permission => 
    permission.resource === resource && 
    permission.actions.includes(action)
  )

  if (relevantPermissions.length === 0) {
    return false
  }

  // Check if any of the relevant permissions pass scope validation
  return relevantPermissions.some(permission => 
    evaluateScope(permission, context, record)
  )
}

/**
 * Evaluate if permission scope allows access to the resource
 */
function evaluateScope(
  permission: Permission,
  context: PermissionContext,
  record?: ResourceRecord
): boolean {
  switch (permission.scope) {
    case SCOPES.ALL:
      return true

    case SCOPES.FACILITY:
      if (!context.facilityId) {
        return false
      }
      // If no record provided, assume facility-scoped access is allowed
      if (!record) {
        return true
      }
      // Check if resource belongs to user's facility
      return record.facilityId === context.facilityId

    case SCOPES.OWN:
      if (!record) {
        return false
      }
      // Check if user owns the resource
      return record.userId === context.userId

    case SCOPES.ASSIGNED:
      if (!record) {
        return false
      }
      // Check if resource is assigned to user or user owns it
      return record.assignedUserId === context.userId || 
             record.userId === context.userId

    default:
      return false
  }
}

/**
 * Require permission check - throws error if not authorized
 */
export async function requirePermission(
  action: Action,
  resource: Resource,
  record?: ResourceRecord
): Promise<void> {
  const hasPermission = await can(action, resource, record)
  
  if (!hasPermission) {
    throw new Error(`Insufficient permissions to ${action} ${resource}`)
  }
}

/**
 * Require permission check with session - throws error if not authorized
 */
export function requirePermissionWithSession(
  session: SessionData,
  action: Action,
  resource: Resource,
  record?: ResourceRecord
): void {
  const hasPermission = canWithSession(session, action, resource, record)
  
  if (!hasPermission) {
    throw new Error(`Insufficient permissions to ${action} ${resource}`)
  }
}

/**
 * Get all resources a user can access for a given action
 */
export function getAccessibleResources(
  session: SessionData,
  action: Action
): Resource[] {
  const userPermissions = getMultiRolePermissions(session.roles as Role[])
  
  return userPermissions
    .filter(permission => permission.actions.includes(action))
    .map(permission => permission.resource)
    .filter((resource, index, array) => array.indexOf(resource) === index) // deduplicate
}

/**
 * Check if user has any role from a list of roles
 */
export function hasAnyRole(session: SessionData, roles: Role[]): boolean {
  return roles.some(role => session.roles.includes(role))
}

/**
 * Check if user has all roles from a list of roles
 */
export function hasAllRoles(session: SessionData, roles: Role[]): boolean {
  return roles.every(role => session.roles.includes(role))
}