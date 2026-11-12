import React, { useEffect, useState, useRef, useId } from 'react';
import { api } from '../services/api';
import { User, RegisterRequest, UpdateUserRequest, Role } from '../types';
import { Trash2, Edit, UserPlus, X } from 'lucide-react';


const UserDialog: React.FC<{ titleId: string; onClose: () => void; busy: boolean; children: React.ReactNode }> = ({ titleId, onClose, busy, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} aria-labelledby={titleId} onClose={event => { if (!event.currentTarget.open) onClose(); }}
    onCancel={event => { if (busy) event.preventDefault(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-lg bg-surface p-6 text-foreground dark:bg-gray-800 backdrop:bg-black/50 [&::backdrop]:overflow-hidden [&::backdrop]:overscroll-contain">
    {children}
    {busy && <p role="status" className="mt-3 text-sm">Saving changes…</p>}
  </dialog>;
};

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const id = useId();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mounted = useRef(false);
  const request = useRef(0);

  // Form states
  const [formData, setFormData] = useState<RegisterRequest>({ username: '', email: '', password: '' });
  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({});
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const fetchData = async () => {
    if (!mounted.current) return;
    const current = ++request.current;
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.users.list({ limit: 100 }),
        api.roles.list({ limit: 100 })
      ]);
      if (!mounted.current || current !== request.current) return;
      setError('');
      setUsers(usersRes.items);
      setAvailableRoles(rolesRes.items);
    } catch (err) {
      if (mounted.current && current === request.current) setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      if (mounted.current && current === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void fetchData();
    return () => { mounted.current = false; request.current++; };
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.users.delete(id);
      if (!mounted.current) return;
      setUsers(current => current.filter(u => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      await api.users.createAdmin(formData);
      if (!mounted.current) return;
      setShowCreateAdminModal(false);
      setFormData({ username: '', email: '', password: '' });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create admin');
    } finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      // Update info
      if (Object.keys(editFormData).length > 0) {
        const { password, ...profile } = editFormData;
        await api.users.update(editingUser.id, { ...profile, ...(password ? { password } : {}) });
      }
      // Update roles
      await api.users.setRoles(editingUser.id, selectedRoleIds);
      if (!mounted.current) return;
      
      setEditingUser(null);
      setEditFormData({});
      setSelectedRoleIds([]);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    } finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({ username: user.username, email: user.email });
    
    // Map role names to IDs
    const currentRoleIds = user.roles
      .map(roleName => availableRoles.find(r => r.name === roleName)?.id)
      .filter((id): id is number => id !== undefined);
      
    setSelectedRoleIds(currentRoleIds);
  };

  if (loading) return <div role="status" className="text-center py-10">Loading users...</div>;
  if (error) return <div role="alert" className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h2>
        <button
          onClick={() => setShowCreateAdminModal(true)}
          className="flex items-center px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Admin
        </button>
      </div>

      <div className="bg-surface dark:bg-gray-800 shadow overflow-x-auto sm:rounded-lg" role="region" aria-label="用户列表" tabIndex={0}>
        <table aria-label="Users" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roles</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created At</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.roles?.map(role => (
                    <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-1">
                      {role}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button type="button" aria-label={`Edit ${user.username}`} onClick={() => startEdit(user)} className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 mr-1 p-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button type="button" aria-label={`Delete ${user.username}`} onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-4">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <UserDialog titleId={`${id}-create-title`} busy={saving} onClose={() => setShowCreateAdminModal(false)}>
            <div className="flex justify-between items-center mb-4">
              <h2 id={`${id}-create-title`} className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Admin User</h2>
              <button type="button" disabled={saving} aria-label="Close create user dialog" onClick={() => setShowCreateAdminModal(false)} className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label htmlFor={`${id}-create-username`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input
                  id={`${id}-create-username`}
                  name="username"
                  disabled={saving}
                  autoComplete="username"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  ref={node => { if (node) node.autofocus = true; }}
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-create-email`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  id={`${id}-create-email`}
                  name="email"
                  disabled={saving}
                  autoComplete="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-create-password`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  id={`${id}-create-password`}
                  name="password"
                  disabled={saving}
                  autoComplete="new-password"
                  aria-describedby={`${id}-create-password-help`}
                  type="password"
                  required
                  minLength={12}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <p id={`${id}-create-password-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">Minimum 12 characters.</p>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowCreateAdminModal(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-600 border border-transparent rounded-md hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                >
                  Create
                </button>
              </div>
            </form>
        </UserDialog>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserDialog titleId={`${id}-edit-title`} busy={saving} onClose={() => setEditingUser(null)}>
            <div className="flex justify-between items-center mb-4">
              <h2 id={`${id}-edit-title`} className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit User: {editingUser.username}</h2>
              <button type="button" disabled={saving} aria-label="Close edit user dialog" onClick={() => setEditingUser(null)} className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label htmlFor={`${id}-edit-username`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input
                  id={`${id}-edit-username`}
                  name="username"
                  disabled={saving}
                  autoComplete="username"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  ref={node => { if (node) node.autofocus = true; }}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={editFormData.username || ''}
                  onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-edit-email`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  id={`${id}-edit-email`}
                  name="email"
                  disabled={saving}
                  autoComplete="email"
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={editFormData.email || ''}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${id}-edit-password`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password (Leave blank to keep)</label>
                <input
                  id={`${id}-edit-password`}
                  name="password"
                  disabled={saving}
                  autoComplete="new-password"
                  aria-describedby={`${id}-edit-password-help`}
                  type="password"
                  minLength={12}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={editFormData.password || ''}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                />
                <p id={`${id}-edit-password-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">Minimum 12 characters for a new password.</p>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</p>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 dark:border-gray-600">
                  {availableRoles.map(role => (
                    <div key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        disabled={saving}
                        name="roles"
                        id={`${id}-role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoleIds([...selectedRoleIds, role.id]);
                          } else {
                            setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                          }
                        }}
                        className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`${id}-role-${role.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        {role.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingUser(null)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-600 border border-transparent rounded-md hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
        </UserDialog>
      )}
    </div>
  );
};
