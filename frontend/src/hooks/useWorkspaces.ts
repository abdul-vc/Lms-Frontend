import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

export interface NavItem { 
  key: string; 
  label: string; 
  icon: string; 
  route: string; 
  order: number; 
}
export interface WorkspaceWidget { 
  key: string; 
  label: string; 
  component_key: string; 
  order: number; 
}
export interface WorkspaceData {
  workspace_key: string; 
  workspace_label: string; 
  workspace_icon: string;
  nav_items: NavItem[]; 
  widgets?: WorkspaceWidget[];
}
export interface MyWorkspacesResponse {
  user_display_name: string; 
  user_email: string; 
  organization_name: string | null;
  workspaces: WorkspaceData[];
}

export function useWorkspaces() {
  const [data, setData] = useState<MyWorkspacesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('http://127.0.0.1:8000/api/me/workspaces/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch workspaces');
        return res.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
