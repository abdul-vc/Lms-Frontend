import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { Users, Plus, Pencil, Trash2, Loader2, AlertCircle, Shield, Grid, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/roles')({
  component: RolesPage,
});

interface Role {
  id: number;
  name: string;
  is_default: boolean;
  is_admin_role: boolean;
  user_count: number;

  can_view_users?: boolean;
  can_create_users?: boolean;
  can_edit_users?: boolean;
  can_delete_users?: boolean;

  can_view_roles?: boolean;
  can_create_roles?: boolean;
  can_edit_roles?: boolean;
  can_delete_roles?: boolean;

  can_view_courses?: boolean;
  can_create_courses?: boolean;
  can_edit_courses?: boolean;
  can_delete_courses?: boolean;

  can_view_certificates?: boolean;
  can_create_certificates?: boolean;
  can_edit_certificates?: boolean;
  can_delete_certificates?: boolean;

  can_view_reports?: boolean;
  can_create_reports?: boolean;
  can_edit_reports?: boolean;
  can_delete_reports?: boolean;

  can_view_module_access?: boolean;
  can_create_module_access?: boolean;
  can_edit_module_access?: boolean;
  can_delete_module_access?: boolean;

  can_view_activity_log?: boolean;
  can_create_activity_log?: boolean;
  can_edit_activity_log?: boolean;
  can_delete_activity_log?: boolean;

  can_manage_users?: boolean;
  can_manage_departments?: boolean;
  can_manage_roles?: boolean;
  can_publish_courses?: boolean;
  can_manage_module_access?: boolean;
  can_manage_certificates?: boolean;
}

const PERMISSION_GROUPS = [
  {
    title: "User Management",
    keys: [
      { key: "can_view_users", label: "View Users & Departments" },
      { key: "can_create_users", label: "Create Users & Departments" },
      { key: "can_edit_users", label: "Edit Users & Departments" },
      { key: "can_delete_users", label: "Delete Users & Departments" },
      { key: "can_view_roles", label: "View Roles & Permissions" },
      { key: "can_create_roles", label: "Create Roles" },
      { key: "can_edit_roles", label: "Edit Roles" },
      { key: "can_delete_roles", label: "Delete Roles" },
    ]
  },
  {
    title: "Course Management",
    keys: [
      { key: "can_view_courses", label: "View Courses" },
      { key: "can_create_courses", label: "Create Courses" },
      { key: "can_edit_courses", label: "Edit Courses" },
      { key: "can_delete_courses", label: "Delete Courses" },
    ]
  },
  {
    title: "Platform Configuration & Audit",
    keys: [
      { key: "can_view_module_access", label: "View Module Access" },
      { key: "can_edit_module_access", label: "Edit Module Access" },
      { key: "can_view_certificates", label: "View Certificate Templates" },
      { key: "can_create_certificates", label: "Create Certificate Templates" },
      { key: "can_edit_certificates", label: "Edit Certificate Templates" },
      { key: "can_delete_certificates", label: "Delete Certificate Templates" },
      { key: "can_view_activity_log", label: "View Audit & Activity Log" },
    ]
  },
  {
    title: "Reporting",
    keys: [
      { key: "can_view_reports", label: "View Reports" },
      { key: "can_create_reports", label: "Create Reports" },
      { key: "can_edit_reports", label: "Edit Reports" },
      { key: "can_delete_reports", label: "Delete Reports" },
    ]
  }
] as const;

// Modules for Permission Matrix (Reference Page 16)
const MATRIX_MODULES = [
  { key: "users", name: "Users & Departments", path: "/org-admin/departments" },
  { key: "roles", name: "Roles & Permissions", path: "/org-admin/roles" },
  { key: "courses", name: "Course Catalog & Authoring", path: "/org-admin/courses" },
  { key: "certificates", name: "Certificate Templates", path: "/org-admin/certificates" },
  { key: "reports", name: "Reports & Analytics", path: "/org-admin/reports" },
  { key: "module_access", name: "Module Access Control", path: "/org-admin/module-access" },
  { key: "activity", name: "Audit & Activity Log", path: "/org-admin/activity" },
];

function RolesPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Matrix state
  const [matrixState, setMatrixState] = useState<Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>({
    users: { view: false, create: false, edit: false, delete: false },
    roles: { view: false, create: false, edit: false, delete: false },
    courses: { view: false, create: false, edit: false, delete: false },
    certificates: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    module_access: { view: false, create: false, edit: false, delete: false },
    activity: { view: false, create: false, edit: false, delete: false },
  });
  const [matrixSaved, setMatrixSaved] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    can_view_users: false,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_view_roles: false,
    can_create_roles: false,
    can_edit_roles: false,
    can_delete_roles: false,
    can_view_courses: false,
    can_create_courses: false,
    can_edit_courses: false,
    can_delete_courses: false,
    can_view_certificates: false,
    can_create_certificates: false,
    can_edit_certificates: false,
    can_delete_certificates: false,
    can_view_reports: false,
    can_create_reports: false,
    can_edit_reports: false,
    can_delete_reports: false,
    can_view_module_access: false,
    can_create_module_access: false,
    can_edit_module_access: false,
    can_delete_module_access: false,
    can_view_activity_log: false,
    can_create_activity_log: false,
    can_edit_activity_log: false,
    can_delete_activity_log: false,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await authFetch(`${API_BASE}/roles/`);
      if (res.ok) {
        const allRoles = await res.json();
        const nonAdmin = allRoles.filter((r: Role) => !r.is_admin_role);
        setRoles(nonAdmin);
        if (nonAdmin.length > 0 && !selectedRoleForMatrix) {
          setSelectedRoleForMatrix(nonAdmin[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Sync matrix state whenever selected role changes or roles update
  useEffect(() => {
    if (selectedRoleForMatrix) {
      const r = roles.find((role) => role.id === selectedRoleForMatrix);
      if (r) {
        setMatrixState({
          users: {
            view: Boolean(r.can_view_users),
            create: Boolean(r.can_create_users),
            edit: Boolean(r.can_edit_users),
            delete: Boolean(r.can_delete_users),
          },
          roles: {
            view: Boolean(r.can_view_roles),
            create: Boolean(r.can_create_roles),
            edit: Boolean(r.can_edit_roles),
            delete: Boolean(r.can_delete_roles),
          },
          courses: {
            view: Boolean(r.can_view_courses),
            create: Boolean(r.can_create_courses),
            edit: Boolean(r.can_edit_courses),
            delete: Boolean(r.can_delete_courses),
          },
          certificates: {
            view: Boolean(r.can_view_certificates),
            create: Boolean(r.can_create_certificates),
            edit: Boolean(r.can_edit_certificates),
            delete: Boolean(r.can_delete_certificates),
          },
          reports: {
            view: Boolean(r.can_view_reports),
            create: Boolean(r.can_create_reports),
            edit: Boolean(r.can_edit_reports),
            delete: Boolean(r.can_delete_reports),
          },
          module_access: {
            view: Boolean(r.can_view_module_access),
            create: Boolean(r.can_create_module_access),
            edit: Boolean(r.can_edit_module_access),
            delete: Boolean(r.can_delete_module_access),
          },
          activity: {
            view: Boolean(r.can_view_activity_log),
            create: Boolean(r.can_create_activity_log),
            edit: Boolean(r.can_edit_activity_log),
            delete: Boolean(r.can_delete_activity_log),
          },
        });
      }
    }
  }, [selectedRoleForMatrix, roles]);

  const openAdd = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      can_view_users: false,
      can_create_users: false,
      can_edit_users: false,
      can_delete_users: false,
      can_view_roles: false,
      can_create_roles: false,
      can_edit_roles: false,
      can_delete_roles: false,
      can_view_courses: false,
      can_create_courses: false,
      can_edit_courses: false,
      can_delete_courses: false,
      can_view_certificates: false,
      can_create_certificates: false,
      can_edit_certificates: false,
      can_delete_certificates: false,
      can_view_reports: false,
      can_create_reports: false,
      can_edit_reports: false,
      can_delete_reports: false,
      can_view_module_access: false,
      can_create_module_access: false,
      can_edit_module_access: false,
      can_delete_module_access: false,
      can_view_activity_log: false,
      can_create_activity_log: false,
      can_edit_activity_log: false,
      can_delete_activity_log: false,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditingRole(r);
    setFormData({ ...r });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = editingRole 
        ? `${API_BASE}/roles/${editingRole.id}/` 
        : `${API_BASE}/roles/`;
      
      const payload = { ...formData };
      if (editingRole?.is_default) {
        delete payload.name;
      }

      const res = await authFetch(url, {
        method: editingRole ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }

      await fetchRoles();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (r: Role) => {
    if (r.is_default) {
      alert("Default roles cannot be deleted.");
      return;
    }
    if (r.user_count > 0) {
      alert(`Cannot delete role ${r.name}. Reassign ${r.user_count} users off this role first.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${r.name}?`)) return;
    
    try {
      const res = await authFetch(`${API_BASE}/roles/${r.id}/`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data[0] || JSON.stringify(data));
      }
      setRoles(roles.filter(role => role.id !== r.id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleMatrix = (modKey: string, field: 'view' | 'create' | 'edit' | 'delete') => {
    setMatrixState((prev) => ({
      ...prev,
      [modKey]: {
        ...prev[modKey],
        [field]: !prev[modKey][field],
      },
    }));
  };

  const handleSaveMatrix = async () => {
    if (!selectedRoleForMatrix) return;
    setMatrixSaving(true);
    try {
      const payload = {
        can_view_users: matrixState.users.view,
        can_create_users: matrixState.users.create,
        can_edit_users: matrixState.users.edit,
        can_delete_users: matrixState.users.delete,

        can_view_roles: matrixState.roles.view,
        can_create_roles: matrixState.roles.create,
        can_edit_roles: matrixState.roles.edit,
        can_delete_roles: matrixState.roles.delete,

        can_view_courses: matrixState.courses.view,
        can_create_courses: matrixState.courses.create,
        can_edit_courses: matrixState.courses.edit,
        can_delete_courses: matrixState.courses.delete,

        can_view_certificates: matrixState.certificates.view,
        can_create_certificates: matrixState.certificates.create,
        can_edit_certificates: matrixState.certificates.edit,
        can_delete_certificates: matrixState.certificates.delete,

        can_view_reports: matrixState.reports.view,
        can_create_reports: matrixState.reports.create,
        can_edit_reports: matrixState.reports.edit,
        can_delete_reports: matrixState.reports.delete,

        can_view_module_access: matrixState.module_access.view,
        can_create_module_access: matrixState.module_access.create,
        can_edit_module_access: matrixState.module_access.edit,
        can_delete_module_access: matrixState.module_access.delete,

        can_view_activity_log: matrixState.activity.view,
        can_create_activity_log: matrixState.activity.create,
        can_edit_activity_log: matrixState.activity.edit,
        can_delete_activity_log: matrixState.activity.delete,
      };

      const res = await authFetch(`${API_BASE}/roles/${selectedRoleForMatrix}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update matrix permissions.');
      }

      await fetchRoles();
      setMatrixSaved(true);
      setTimeout(() => setMatrixSaved(false), 2500);
    } catch (err: any) {
      alert(`Failed to save matrix permissions: ${err.message}`);
    } finally {
      setMatrixSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Roles & Permissions</h1>
          <p className="text-sm text-foreground font-medium">Fine-tune page access, actions, and capabilities for each organizational role.</p>
        </div>

        {/* Tab Toggle Switch */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('roles')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === 'roles' 
                ? "bg-card text-emerald-700 shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className="size-4" /> Roles List
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === 'matrix' 
                ? "bg-card text-emerald-700 shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid className="size-4" /> Role Permissions Matrix
          </button>
        </div>
      </div>

      {/* --- TAB 1: ROLES LIST --- */}
      {activeTab === 'roles' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="size-4" /> Create Role
            </button>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Role Name</th>
                  <th className="px-6 py-4">Users</th>
                  <th className="px-6 py-4">Permissions Overview</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  roles.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r) => {
                    const activePerms = Object.keys(r).filter(k => k.startsWith('can_') && (r as any)[k]).length;
                    return (
                      <tr key={r.id} className="hover:bg-muted/50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {r.name}
                            {r.is_default && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wider border border-blue-100">
                                Default
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                            <Users className="size-3" /> {r.user_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Shield className="size-4 text-emerald-600" />
                            {activePerms} active permissions
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEdit(r)} className="p-2 text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50">
                            <Pencil className="size-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(r)} 
                            disabled={r.is_default}
                            className={cn(
                              "p-2 ml-1 rounded-lg transition-colors",
                              r.is_default 
                                ? "text-foreground cursor-not-allowed" 
                                : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            )}
                            title={r.is_default ? "Default roles cannot be deleted" : "Delete role"}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {roles.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={roles.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* --- TAB 2: ROLE PERMISSIONS MATRIX (Matching Reference Page 16) --- */}
      {activeTab === 'matrix' && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border/50 pb-6">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Configuring permissions for:</label>
              <select
                value={selectedRoleForMatrix || ''}
                onChange={(e) => setSelectedRoleForMatrix(Number(e.target.value))}
                className="px-4 py-2 text-sm font-semibold border border-border rounded-xl bg-muted/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} Role</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveMatrix}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-foreground rounded-xl hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
            >
              Save Matrix Changes
            </button>
          </div>

          {matrixSaved && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-100">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Role permission matrix configuration updated!
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Module Name</th>
                  <th className="px-6 py-4 text-center">View Access</th>
                  <th className="px-6 py-4 text-center">Create Access</th>
                  <th className="px-6 py-4 text-center">Edit Access</th>
                  <th className="px-6 py-4 text-center">Delete Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {MATRIX_MODULES.map((mod) => {
                  const state = matrixState[mod.key] || { view: false, create: false, edit: false, delete: false };
                  return (
                    <tr key={mod.key} className="hover:bg-muted/50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div>
                          {mod.name}
                          <p className="text-[11px] font-mono text-muted-foreground font-normal">{mod.path}</p>
                        </div>
                      </td>
                      {(['view', 'create', 'edit', 'delete'] as const).map((field) => (
                        <td key={field} className="px-6 py-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state[field]}
                              onChange={() => handleToggleMatrix(mod.key, field)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                          </label>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT ROLE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-border/50">
            <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-muted/50/50">
              <h2 className="font-bold text-foreground text-lg">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground text-sm font-semibold">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Role Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name || ''}
                    disabled={editingRole?.is_default}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                    placeholder="e.g., Senior Developer"
                  />
                  {editingRole?.is_default && (
                    <p className="text-[11px] text-muted-foreground mt-1">Default roles cannot be renamed.</p>
                  )}
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="font-semibold text-foreground mb-4 text-sm">Capabilities & Permissions</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title} className="space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.title}
                        </h4>
                        <div className="space-y-2">
                          {group.keys.map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={(formData as any)[key] || false}
                                  onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                                />
                                <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 transition-colors" />
                                <svg
                                  className="absolute w-3 h-3 text-foreground pointer-events-none opacity-0 peer-checked:opacity-100"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                                {label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-foreground bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

