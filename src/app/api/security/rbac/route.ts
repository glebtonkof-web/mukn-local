/**
 * RBAC API Endpoint
 * Check permissions and manage roles
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  getRoleLevel,
  canManageRole,
  isValidRole,
  meetsRequirements,
  RolePermissions,
  PermissionGroups,
  type Permission,
  type Role
} from '@/lib/rbac'
import { db } from '@/lib/db'

/**
 * Check if user has permission
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const permission = searchParams.get('permission') as Permission | null
    const permissions = searchParams.get('permissions')
    const checkAny = searchParams.get('checkAny') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 500 }
      )
    }

    const role = user.role as Role

    // If checking specific permission(s)
    if (permission || permissions) {
      if (permissions) {
        // Check multiple permissions
        const permsArray = permissions.split(',').filter(Boolean) as Permission[]
        const result = checkAny
          ? hasAnyPermission(role, permsArray)
          : hasAllPermissions(role, permsArray)

        return NextResponse.json({
          userId,
          role,
          permissions: permsArray,
          checkType: checkAny ? 'any' : 'all',
          hasPermission: result
        })
      }

      if (permission) {
        // Check single permission
        return NextResponse.json({
          userId,
          role,
          permission,
          hasPermission: hasPermission(role, permission)
        })
      }
    }

    // Return all permissions for the role
    return NextResponse.json({
      userId,
      role,
      permissions: getRolePermissions(role),
      level: getRoleLevel(role)
    })

  } catch (error) {
    console.error('RBAC check error:', error)
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}

/**
 * Check requirements or update user role
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, requirements, newRole, adminUserId } = body

    if (action === 'check-requirements') {
      // Check if user meets permission requirements
      if (!userId || !requirements) {
        return NextResponse.json(
          { error: 'User ID and requirements are required' },
          { status: 400 }
        )
      }

      const user = await db.user.findUnique({
        where: { id: userId }
      })

      if (!user || !isValidRole(user.role)) {
        return NextResponse.json(
          { error: 'User not found or invalid role' },
          { status: 404 }
        )
      }

      const meets = meetsRequirements(user.role as Role, requirements)

      return NextResponse.json({
        userId,
        role: user.role,
        requirements,
        meetsRequirements: meets
      })
    }

    if (action === 'update-role') {
      // Update user role (admin only)
      if (!userId || !newRole || !adminUserId) {
        return NextResponse.json(
          { error: 'User ID, new role, and admin user ID are required' },
          { status: 400 }
        )
      }

      // Verify admin
      const admin = await db.user.findUnique({
        where: { id: adminUserId }
      })

      if (!admin || !isValidRole(admin.role) || !hasPermission(admin.role, 'user:manage_roles')) {
        return NextResponse.json(
          { error: 'Unauthorized to manage roles' },
          { status: 403 }
        )
      }

      // Validate new role
      if (!isValidRole(newRole)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        )
      }

      // Get target user
      const targetUser = await db.user.findUnique({
        where: { id: userId }
      })

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        )
      }

      // Check if admin can manage this user's role
      if (!canManageRole(admin.role as Role, targetUser.role as Role)) {
        return NextResponse.json(
          { error: 'Cannot manage this user\'s role' },
          { status: 403 }
        )
      }

      // Check if admin can assign the new role
      if (!canManageRole(admin.role as Role, newRole)) {
        return NextResponse.json(
          { error: 'Cannot assign this role' },
          { status: 403 }
        )
      }

      // Update role
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { role: newRole }
      })

      // Create audit log
      await db.actionLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_USER_ROLE',
          entityType: 'user',
          entityId: userId,
          details: JSON.stringify({
            oldRole: targetUser.role,
            newRole
          })
        }
      })

      return NextResponse.json({
        success: true,
        userId,
        oldRole: targetUser.role,
        newRole,
        permissions: getRolePermissions(newRole)
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('RBAC action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}

/**
 * Get all roles and their permissions
 */
export async function PUT() {
  try {
    const roles: Record<string, { permissions: Permission[]; level: number }> = {}

    for (const role of ['admin', 'operator', 'user'] as Role[]) {
      roles[role] = {
        permissions: getRolePermissions(role),
        level: getRoleLevel(role)
      }
    }

    return NextResponse.json({
      roles,
      permissionGroups: PermissionGroups,
      allPermissions: Object.values(PermissionGroups).flat()
    })

  } catch (error) {
    console.error('RBAC info error:', error)
    return NextResponse.json(
      { error: 'Failed to get RBAC info' },
      { status: 500 }
    )
  }
}
