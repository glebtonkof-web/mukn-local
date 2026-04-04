/**
 * RBAC - Role-Based Access Control System
 * Defines roles, permissions, and access control for the application
 */

// Role types
export type Role = 'admin' | 'operator' | 'user'

// Permission types
export type Permission =
  // User management
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_roles'

  // Influencer management
  | 'influencer:read'
  | 'influencer:create'
  | 'influencer:update'
  | 'influencer:delete'

  // Account management
  | 'account:read'
  | 'account:create'
  | 'account:update'
  | 'account:delete'

  // Campaign management
  | 'campaign:read'
  | 'campaign:create'
  | 'campaign:update'
  | 'campaign:delete'

  // Content management
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'

  // Analytics
  | 'analytics:read'
  | 'analytics:export'

  // Settings
  | 'settings:read'
  | 'settings:update'

  // AI features
  | 'ai:generate'
  | 'ai:configure'

  // API keys
  | 'apikey:read'
  | 'apikey:create'
  | 'apikey:delete'

  // Security
  | 'security:read'
  | 'security:update'

  // Monetization
  | 'monetization:read'
  | 'monetization:create'
  | 'monetization:update'

  // Traffic methods
  | 'traffic:read'
  | 'traffic:execute'

  // Sessions
  | 'session:read'
  | 'session:delete'

  // 2FA
  | '2fa:enable'
  | '2fa:disable'

  // Admin only
  | 'admin:full_access'
  | 'admin:audit_logs'
  | 'admin:system_config'

// Permission groups for easier management
export const PermissionGroups = {
  USER_MANAGEMENT: ['user:read', 'user:create', 'user:update', 'user:delete', 'user:manage_roles'] as Permission[],
  INFLUENCER_MANAGEMENT: ['influencer:read', 'influencer:create', 'influencer:update', 'influencer:delete'] as Permission[],
  ACCOUNT_MANAGEMENT: ['account:read', 'account:create', 'account:update', 'account:delete'] as Permission[],
  CAMPAIGN_MANAGEMENT: ['campaign:read', 'campaign:create', 'campaign:update', 'campaign:delete'] as Permission[],
  CONTENT_MANAGEMENT: ['content:read', 'content:create', 'content:update', 'content:delete'] as Permission[],
  ANALYTICS: ['analytics:read', 'analytics:export'] as Permission[],
  SETTINGS: ['settings:read', 'settings:update'] as Permission[],
  AI_FEATURES: ['ai:generate', 'ai:configure'] as Permission[],
  API_KEYS: ['apikey:read', 'apikey:create', 'apikey:delete'] as Permission[],
  SECURITY: ['security:read', 'security:update'] as Permission[],
  MONETIZATION: ['monetization:read', 'monetization:create', 'monetization:update'] as Permission[],
  TRAFFIC: ['traffic:read', 'traffic:execute'] as Permission[],
  SESSIONS: ['session:read', 'session:delete'] as Permission[],
  TWO_FA: ['2fa:enable', '2fa:disable'] as Permission[],
  ADMIN: ['admin:full_access', 'admin:audit_logs', 'admin:system_config'] as Permission[]
} as const

// Role definitions with their permissions
export const RolePermissions: Record<Role, Permission[]> = {
  admin: [
    // Full access to everything
    ...PermissionGroups.USER_MANAGEMENT,
    ...PermissionGroups.INFLUENCER_MANAGEMENT,
    ...PermissionGroups.ACCOUNT_MANAGEMENT,
    ...PermissionGroups.CAMPAIGN_MANAGEMENT,
    ...PermissionGroups.CONTENT_MANAGEMENT,
    ...PermissionGroups.ANALYTICS,
    ...PermissionGroups.SETTINGS,
    ...PermissionGroups.AI_FEATURES,
    ...PermissionGroups.API_KEYS,
    ...PermissionGroups.SECURITY,
    ...PermissionGroups.MONETIZATION,
    ...PermissionGroups.TRAFFIC,
    ...PermissionGroups.SESSIONS,
    ...PermissionGroups.TWO_FA,
    ...PermissionGroups.ADMIN
  ],
  operator: [
    // Operator can manage content and campaigns but not users or security
    ...PermissionGroups.INFLUENCER_MANAGEMENT,
    ...PermissionGroups.ACCOUNT_MANAGEMENT,
    ...PermissionGroups.CAMPAIGN_MANAGEMENT,
    ...PermissionGroups.CONTENT_MANAGEMENT,
    ...PermissionGroups.ANALYTICS,
    'settings:read',
    ...PermissionGroups.AI_FEATURES,
    'apikey:read',
    'apikey:create',
    ...PermissionGroups.MONETIZATION,
    ...PermissionGroups.TRAFFIC,
    'session:read',
    ...PermissionGroups.TWO_FA
  ],
  user: [
    // Basic user permissions
    'influencer:read',
    'influencer:create',
    'influencer:update',
    'account:read',
    'account:create',
    'account:update',
    'campaign:read',
    'campaign:create',
    'campaign:update',
    'content:read',
    'content:create',
    'content:update',
    'analytics:read',
    'settings:read',
    'ai:generate',
    'apikey:read',
    'apikey:create',
    'monetization:read',
    'traffic:read',
    'session:read',
    ...PermissionGroups.TWO_FA
  ]
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = RolePermissions[role]
  return permissions.includes(permission)
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role]
  return permissions.every(p => rolePermissions.includes(p))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role]
  return permissions.some(p => rolePermissions.includes(p))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return [...RolePermissions[role]]
}

/**
 * Get role hierarchy level (higher = more privileges)
 */
export function getRoleLevel(role: Role): number {
  switch (role) {
    case 'admin': return 3
    case 'operator': return 2
    case 'user': return 1
    default: return 0
  }
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole)
}

/**
 * Validate role string
 */
export function isValidRole(role: string): role is Role {
  return ['admin', 'operator', 'user'].includes(role)
}

/**
 * Resource action mapping for API endpoints
 */
export const ResourceActions = {
  users: {
    read: 'user:read' as Permission,
    create: 'user:create' as Permission,
    update: 'user:update' as Permission,
    delete: 'user:delete' as Permission
  },
  influencers: {
    read: 'influencer:read' as Permission,
    create: 'influencer:create' as Permission,
    update: 'influencer:update' as Permission,
    delete: 'influencer:delete' as Permission
  },
  accounts: {
    read: 'account:read' as Permission,
    create: 'account:create' as Permission,
    update: 'account:update' as Permission,
    delete: 'account:delete' as Permission
  },
  campaigns: {
    read: 'campaign:read' as Permission,
    create: 'campaign:create' as Permission,
    update: 'campaign:update' as Permission,
    delete: 'campaign:delete' as Permission
  },
  content: {
    read: 'content:read' as Permission,
    create: 'content:create' as Permission,
    update: 'content:update' as Permission,
    delete: 'content:delete' as Permission
  },
  analytics: {
    read: 'analytics:read' as Permission,
    export: 'analytics:export' as Permission
  },
  settings: {
    read: 'settings:read' as Permission,
    update: 'settings:update' as Permission
  },
  ai: {
    generate: 'ai:generate' as Permission,
    configure: 'ai:configure' as Permission
  },
  apikeys: {
    read: 'apikey:read' as Permission,
    create: 'apikey:create' as Permission,
    delete: 'apikey:delete' as Permission
  },
  security: {
    read: 'security:read' as Permission,
    update: 'security:update' as Permission
  },
  monetization: {
    read: 'monetization:read' as Permission,
    create: 'monetization:create' as Permission,
    update: 'monetization:update' as Permission
  },
  traffic: {
    read: 'traffic:read' as Permission,
    execute: 'traffic:execute' as Permission
  },
  sessions: {
    read: 'session:read' as Permission,
    delete: 'session:delete' as Permission
  }
} as const

/**
 * Check permission for resource action
 */
export function checkResourcePermission(
  role: Role,
  resource: keyof typeof ResourceActions,
  action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'generate' | 'configure' | 'execute'
): boolean {
  const resourceActions = ResourceActions[resource]
  if (!resourceActions) return false

  const permission = (resourceActions as Record<string, Permission>)[action]
  if (!permission) return false

  return hasPermission(role, permission)
}

/**
 * RBAC Middleware helper for API routes
 */
export function createRBACMiddleware(role: Role) {
  return {
    can: (permission: Permission) => hasPermission(role, permission),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAccess: (resource: keyof typeof ResourceActions, action: string) =>
      checkResourcePermission(role, resource, action as 'read'),
    getPermissions: () => getRolePermissions(role),
    getLevel: () => getRoleLevel(role),
    isAdmin: () => role === 'admin',
    isOperator: () => role === 'operator',
    isUser: () => role === 'user'
  }
}

/**
 * Permission requirement decorator for UI components
 */
export interface PermissionRequirement {
  permissions?: Permission[]
  anyPermission?: Permission[]
  role?: Role | Role[]
  minLevel?: number
}

/**
 * Check if user meets permission requirements
 */
export function meetsRequirements(
  role: Role,
  requirements: PermissionRequirement
): boolean {
  // Check role requirement
  if (requirements.role) {
    if (Array.isArray(requirements.role)) {
      if (!requirements.role.includes(role)) return false
    } else if (requirements.role !== role) {
      return false
    }
  }

  // Check minimum level requirement
  if (requirements.minLevel !== undefined) {
    if (getRoleLevel(role) < requirements.minLevel) return false
  }

  // Check all permissions requirement
  if (requirements.permissions && requirements.permissions.length > 0) {
    if (!hasAllPermissions(role, requirements.permissions)) return false
  }

  // Check any permission requirement
  if (requirements.anyPermission && requirements.anyPermission.length > 0) {
    if (!hasAnyPermission(role, requirements.anyPermission)) return false
  }

  return true
}

// RBAC utility object for default export
const RBAC = {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  getRoleLevel,
  canManageRole,
  isValidRole,
  checkResourcePermission,
  createRBACMiddleware,
  meetsRequirements,
  RolePermissions,
  PermissionGroups,
  ResourceActions
}

export default RBAC
