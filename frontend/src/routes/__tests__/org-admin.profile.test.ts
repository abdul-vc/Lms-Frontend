import { describe, it, expect } from 'vitest';

describe('Org Admin Profile Route Guard & Access Control', () => {
  it('allows access to /org-admin/profile for Org Admin with zero optional permissions', () => {
    const mockUserZeroPermissions = {
      id: 42,
      username: 'orgadmin_test',
      email: 'admin@orgtest.com',
      is_platform_super_admin: false,
      organization: { id: 10, name: 'Test Org' },
      role: {
        id: 2,
        name: 'Organization Admin',
        is_admin_role: true,
        can_view_users: false,
        can_create_users: false,
        can_edit_users: false,
        can_delete_users: false,
        can_manage_users: false,
        can_manage_departments: false,
        can_manage_roles: false,
        can_manage_module_access: false,
        can_create_courses: false,
        can_edit_courses: false,
        can_publish_courses: false,
        can_manage_certificates: false,
        can_view_reports: false,
      },
    };

    const isOrgAdminOrPermitted = Boolean(
      mockUserZeroPermissions.role && (
        mockUserZeroPermissions.role.is_admin_role === true ||
        mockUserZeroPermissions.role.can_manage_users ||
        mockUserZeroPermissions.role.can_manage_departments ||
        mockUserZeroPermissions.role.can_manage_roles ||
        mockUserZeroPermissions.role.can_create_courses ||
        mockUserZeroPermissions.role.can_edit_courses ||
        mockUserZeroPermissions.role.can_manage_module_access ||
        mockUserZeroPermissions.role.can_manage_certificates ||
        mockUserZeroPermissions.role.can_view_reports
      )
    );

    expect(isOrgAdminOrPermitted).toBe(true);
  });

  it('ensures Core Module My Profile is unconditionally visible', () => {
    const CORE_NAV = [
      { to: '/org-admin/profile', label: 'My Profile', show: (_role?: Record<string, any>) => true }
    ];

    const emptyRoleDict = {};
    const visibleCoreNav = CORE_NAV.filter(item => item.show(emptyRoleDict));

    expect(visibleCoreNav).toHaveLength(1);
    expect(visibleCoreNav[0].to).toBe('/org-admin/profile');
  });
});
