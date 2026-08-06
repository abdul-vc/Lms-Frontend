import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, useAuth, API_BASE } from '@/lib/auth';
import { Users, Building2, Plus, Pencil, Trash2, Loader2, AlertCircle, Search, Mail, Lock, User as UserIcon, Shield, Briefcase, Eye, EyeOff } from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/departments')({
  component: UsersAndDepartmentsPage,
});

interface Department {
  id: number;
  name: string;
  parent: number | null;
  user_count: number;
}

interface RoleItem {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_initials: string;
  is_active: boolean;
  job_title: string;
  organization: any;
  department: Department | null;
  role: RoleItem | null;
}

function UsersAndDepartmentsPage() {
  const { user } = useAuth();
  const isSuperOrAdmin = Boolean(user?.is_platform_super_admin || user?.role?.is_admin_role);
  const canCreate = isSuperOrAdmin || Boolean(user?.role?.can_create_users || user?.role?.can_manage_users);
  const canEdit = isSuperOrAdmin || Boolean(user?.role?.can_edit_users || user?.role?.can_manage_users);
  const canDelete = isSuperOrAdmin || Boolean(user?.role?.can_delete_users || user?.role?.can_manage_users);
  const [activeTab, setActiveTab] = useState<'users' | 'departments'>('users');
  
  // Data state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Users
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(10);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = useState({ name: '', parent: '' });
  const [deptError, setDeptError] = useState<string | null>(null);
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    role: '',
    is_active: true,
  });
  const [userError, setUserError] = useState<string | null>(null);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [userRes, deptRes, roleRes] = await Promise.all([
        authFetch(`${API_BASE}/users/`),
        authFetch(`${API_BASE}/departments/`),
        authFetch(`${API_BASE}/roles/`)
      ]);

      if (userRes.ok) setUsers(await userRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setRoles(Array.isArray(roleData) ? roleData : roleData.results || []);
      }
    } catch (e) {
      console.error('Error fetching users/departments/roles:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- DEPARTMENT CRUD ---
  const openAddDept = () => {
    setEditingDept(null);
    setDeptFormData({ name: '', parent: '' });
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const openEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptFormData({ name: d.name, parent: d.parent ? d.parent.toString() : '' });
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError(null);
    setIsDeptSubmitting(true);

    const payload = {
      name: deptFormData.name,
      parent: deptFormData.parent ? parseInt(deptFormData.parent) : null
    };

    try {
      const url = editingDept 
        ? `${API_BASE}/departments/${editingDept.id}/` 
        : `${API_BASE}/departments/`;
      
      const res = await authFetch(url, {
        method: editingDept ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }

      await fetchAllData();
      setIsDeptModalOpen(false);
    } catch (err: any) {
      setDeptError(err.message);
    } finally {
      setIsDeptSubmitting(false);
    }
  };

  const handleDeptDelete = async (d: Department) => {
    if (!window.confirm(`Are you sure you want to delete department "${d.name}"?`)) return;
    
    try {
      const res = await authFetch(`${API_BASE}/departments/${d.id}/`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }
      setDepartments(departments.filter(dept => dept.id !== d.id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // --- USER CRUD ---
  const openAddUser = () => {
    setEditingUser(null);
    setShowPassword(false);
    setUserFormData({
      email: '',
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      job_title: '',
      department: '',
      role: '',
      is_active: true,
    });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const openEditUser = (u: UserItem) => {
    setEditingUser(u);
    setShowPassword(false);
    setUserFormData({
      email: u.email || '',
      username: u.username || '',
      password: '', // blank unless changing
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      job_title: u.job_title || '',
      department: u.department ? u.department.id.toString() : '',
      role: u.role ? u.role.id.toString() : '',
      is_active: u.is_active ?? true,
    });
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setIsUserSubmitting(true);

    const payload: any = {
      email: userFormData.email.trim(),
      username: userFormData.username.trim() || userFormData.email.trim(),
      first_name: userFormData.first_name.trim(),
      last_name: userFormData.last_name.trim(),
      job_title: userFormData.job_title.trim(),
      department: userFormData.department ? parseInt(userFormData.department) : null,
      role: userFormData.role ? parseInt(userFormData.role) : null,
      is_active: userFormData.is_active,
    };

    if (userFormData.password) {
      payload.password = userFormData.password;
    }

    try {
      const url = editingUser 
        ? `${API_BASE}/users/${editingUser.id}/` 
        : `${API_BASE}/users/`;
      
      const res = await authFetch(url, {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }

      await fetchAllData();
      setIsUserModalOpen(false);

      if (!editingUser) {
        alert(`User registered! Welcome email with username, password, and login portal link sent via Gmail SMTP to ${userFormData.email}.`);
      }
    } catch (err: any) {
      setUserError(err.message);
    } finally {
      setIsUserSubmitting(false);
    }
  };

  const handleUserDelete = async (u: UserItem) => {
    if (!window.confirm(`Are you sure you want to delete user "${u.full_name || u.username}"?`)) return;
    
    try {
      const res = await authFetch(`${API_BASE}/users/${u.id}/`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }
      setUsers(users.filter(user => user.id !== u.id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const queryMatch =
      !searchQuery ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const deptMatch =
      !selectedDeptFilter ||
      (u.department && u.department.id.toString() === selectedDeptFilter);

    const roleMatch =
      !selectedRoleFilter ||
      (u.role && u.role.id.toString() === selectedRoleFilter);

    return queryMatch && deptMatch && roleMatch;
  });

  const paginatedUsers = filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize);
  const paginatedDepts = departments.slice((deptPage - 1) * deptPageSize, deptPage * deptPageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Users & Departments</h1>
          <p className="text-foreground text-sm font-medium">Manage your organization's members, roles, and department hierarchy.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border self-start md:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-card text-emerald-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="size-4" /> Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'departments'
                ? 'bg-card text-emerald-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="size-4" /> Departments ({departments.length})
          </button>
        </div>
      </div>

      {/* --- TAB 1: USERS --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users by name, email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-foreground"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => {
                  setSelectedDeptFilter(e.target.value);
                  setUserPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-foreground"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id.toString()}>{d.name}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={selectedRoleFilter}
                onChange={(e) => {
                  setSelectedRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-foreground"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id.toString()}>{r.name}</option>
                ))}
              </select>
            </div>

            {canCreate && (
              <button
                onClick={openAddUser}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0"
              >
                <Plus className="size-4" /> Add User
              </button>
            )}
          </div>

          {/* User Table */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email / Username</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50/50">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center font-bold text-xs shrink-0">
                            {u.avatar_initials || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{u.full_name || u.username}</div>
                            {u.job_title && <div className="text-xs text-muted-foreground">{u.job_title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{u.email}</div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {u.department ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            <Building2 className="size-3" /> {u.department.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {u.role ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                            <Shield className="size-3" /> {u.role.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button onClick={() => openEditUser(u)} className="p-2 text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50" title="Edit User">
                            <Pencil className="size-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleUserDelete(u)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 ml-1" title="Delete User">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredUsers.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <PaginationControls
                  currentPage={userPage}
                  pageSize={userPageSize}
                  totalItems={filteredUsers.length}
                  onPageChange={setUserPage}
                  onPageSizeChange={setUserPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: DEPARTMENTS --- */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h2 className="font-semibold text-foreground">Department Hierarchy</h2>
              <p className="text-xs text-muted-foreground">Organize your company structures and teams.</p>
            </div>
            {canCreate && (
              <button
                onClick={openAddDept}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Plus className="size-4" /> Add Department
              </button>
            )}
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Department Name</th>
                  <th className="px-6 py-4">Parent</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  paginatedDepts.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/50/50">
                      <td className="px-6 py-4 font-bold text-foreground capitalize text-base">{d.name}</td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {d.parent ? departments.find(x => x.id === d.parent)?.name || `ID: ${d.parent}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          <Users className="size-3" /> {d.user_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button onClick={() => openEditDept(d)} className="p-2 text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50" title="Edit Department">
                            <Pencil className="size-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeptDelete(d)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 ml-1" title="Delete Department">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {departments.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <PaginationControls
                  currentPage={deptPage}
                  pageSize={deptPageSize}
                  totalItems={departments.length}
                  onPageChange={setDeptPage}
                  onPageSizeChange={setDeptPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ADD / EDIT USER MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-muted/50/50">
              <h2 className="font-semibold text-lg">{editingUser ? 'Edit User' : 'Add New User'}</h2>
            </div>
            
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4" autoComplete="off">
              {/* Hidden decoy fields to block aggressive browser autofill */}
              <input type="text" name="fake_username_autofill" id="fake_username_autofill" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" name="fake_password_autofill" id="fake_password_autofill" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

              {userError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <p>{userError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={userFormData.first_name}
                    onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={userFormData.last_name}
                    onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    autoComplete="off"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Username *</label>
                  <input
                    required
                    type="text"
                    autoComplete="off"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Password {editingUser ? '(Leave blank to keep unchanged)' : '*'}
                </label>
                <div className="relative">
                  <input
                    required={!editingUser}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Password'}
                    className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-background text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                  <select
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-card"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id.toString()}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-card"
                  >
                    <option value="">No Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id.toString()}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={userFormData.job_title}
                  onChange={(e) => setUserFormData({ ...userFormData, job_title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  className="size-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="is_active_checkbox" className="text-sm font-medium text-muted-foreground">Active User</label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUserSubmitting}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isUserSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT DEPARTMENT MODAL --- */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-muted/50/50">
              <h2 className="font-semibold text-lg">{editingDept ? 'Edit Department' : 'Add Department'}</h2>
            </div>
            
            <form onSubmit={handleDeptSubmit} className="p-6 space-y-4">
              {deptError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <p>{deptError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Department Name *</label>
                <input
                  required
                  type="text"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Parent Department</label>
                <select
                  value={deptFormData.parent}
                  onChange={(e) => setDeptFormData({ ...deptFormData, parent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-card"
                >
                  <option value="">None (Top level)</option>
                  {departments
                    .filter(d => !editingDept || d.id !== editingDept.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeptSubmitting}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeptSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

