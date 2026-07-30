import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';
import { Users, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/org-admin/users')({
  component: UsersPage,
});

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  full_name: string;
  job_title: string;
  department: number | null;
  role: { id: number; name: string } | null;
}

interface Department {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    role: '',
    password: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, dRes, rRes] = await Promise.all([
        authFetch('http://127.0.0.1:8000/api/users/'),
        authFetch('http://127.0.0.1:8000/api/departments/'),
        authFetch('http://127.0.0.1:8000/api/roles/')
      ]);

      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
      if (rRes.ok) setRoles(await rRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      job_title: '',
      department: '',
      role: '',
      password: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      username: u.username || '',
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      job_title: u.job_title || '',
      department: u.department?.id?.toString() || (typeof u.department === 'number' ? u.department.toString() : ''),
      role: u.role?.id?.toString() || (typeof u.role === 'number' ? u.role.toString() : ''),
      password: '' // empty means don't change
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = editingUser 
        ? `http://127.0.0.1:8000/api/users/${editingUser.id}/` 
        : 'http://127.0.0.1:8000/api/users/';
      
      const payload: Record<string, any> = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        job_title: formData.job_title,
        department: formData.department ? parseInt(formData.department) : null,
        role: formData.role ? parseInt(formData.role) : null,
      };

      if (!editingUser) {
        if (!formData.password) throw new Error("Password is required for new users.");
        payload.password = formData.password;
      } else if (formData.password) {
        payload.password = formData.password;
      }

      const res = await authFetch(url, {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || Object.values(data)[0] || JSON.stringify(data));
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Are you sure you want to delete user ${u.full_name || u.username}?`)) return;
    
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/users/${u.id}/`, {
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Users</h1>
          <p className="text-sm text-foreground font-medium">Manage learners and administrators.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          <Plus className="size-4" /> Add User
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-6 py-4">Name / Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{u.full_name || u.username}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                      {u.role?.name || "None"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {u.department ? departments.find(d => d.id === u.department)?.name : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(u)} className="p-2 text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 ml-1">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl my-8">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-muted/50/50 rounded-t-2xl">
              <h2 className="font-semibold text-lg">{editingUser ? 'Edit User' : 'Add User'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Username *</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Password {editingUser && "(Leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="">None</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="">None</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
