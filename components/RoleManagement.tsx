import React, { useEffect, useState, useRef, useId } from 'react';
import { api } from '../services/api';
import { Role, Permission } from '../types';
import { Trash2, Edit, Plus, X } from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!showModal || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [showModal]);

  // Form states
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newPermName, setNewPermName] = useState('');
  const [newPermDesc, setNewPermDesc] = useState('');

  const fetchRoles = async () => {
    if (!mounted.current) return;
    const current = ++request.current;
    try {
      setLoading(true);
      const response = await api.roles.list({ limit: 100 });
      if (!mounted.current || current !== request.current) return;
      setError('');
      setRoles(response.items);
    } catch (err) {
      if (mounted.current && current === request.current) setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      if (mounted.current && current === request.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void fetchRoles();
    return () => { mounted.current = false; request.current++; };
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.roles.delete(id);
      if (!mounted.current) return;
      setRoles(current => current.filter(r => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      const payload = {
        name: roleName,
        permissions: permissions
      };

      if (editingRole) {
        await api.roles.update(editingRole.id, payload);
      } else {
        await api.roles.create(payload);
      }

      if (!mounted.current) return;
      setShowModal(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save role');
    } finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };

  const resetForm = () => {
    setRoleName('');
    setPermissions([]);
    setNewPermName('');
    setNewPermDesc('');
    setEditingRole(null);
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setPermissions([...(role.permissions || [])]);
    setShowModal(true);
  };

  const startCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const addPermission = () => {
    if (!newPermName) return;
    setPermissions([...permissions, { name: newPermName, description: newPermDesc }]);
    setNewPermName('');
    setNewPermDesc('');
  };

  const removePermission = (index: number) => {
    const newPerms = [...permissions];
    newPerms.splice(index, 1);
    setPermissions(newPerms);
  };

  if (loading) return <div role="status" className="text-center py-10">Loading roles...</div>;
  if (error) return <div role="alert" className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Role Management</h2>
        <button
          onClick={startCreate}
          className="flex items-center px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      <div className="bg-surface dark:bg-gray-800 shadow overflow-x-auto sm:rounded-lg" role="region" aria-label="角色列表" tabIndex={0}>
        <table aria-label="Roles" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Permissions</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-surface dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{role.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.map((perm, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" title={perm.description}>
                        {perm.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button type="button" aria-label={`Edit role ${role.name}`} onClick={() => startEdit(role)} className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300 mr-1 p-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button type="button" aria-label={`Delete role ${role.name}`} onClick={() => handleDelete(role.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-4">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Role Modal */}
      {showModal && (
        <dialog ref={dialogRef} aria-labelledby={`${id}-role-title`} onClose={event => { if (!event.currentTarget.open) setShowModal(false); }}
          onCancel={event => { if (saving) event.preventDefault(); }}
          className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto overscroll-contain rounded-lg bg-surface p-6 text-foreground dark:bg-gray-800 backdrop:bg-black/50 [&::backdrop]:overflow-hidden [&::backdrop]:overscroll-contain">
            <div className="flex justify-between items-center mb-4">
              <h2 id={`${id}-role-title`} className="text-xl font-bold text-gray-900 dark:text-gray-100">{editingRole ? 'Edit Role' : 'Create Role'}</h2>
              <button type="button" disabled={saving} aria-label="Close role dialog" onClick={() => setShowModal(false)} className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label htmlFor={`${id}-role-name`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name</label>
                <input
                  id={`${id}-role-name`}
                  name="role-name"
                  ref={node => { if (node) node.autofocus = true; }}
                  disabled={saving}
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</p>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-2">
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <div className="min-w-0 flex-1"><label htmlFor={`${id}-permission-name`} className="block text-sm font-medium mb-1">Permission name</label>
                    <input
                      id={`${id}-permission-name`}
                      name="permission-name"
                      disabled={saving}
                      type="text"
                      placeholder="Permission Name (e.g. post.manage)"
                      className="w-full min-w-0 rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 text-base p-2 border"
                      value={newPermName}
                      onChange={e => setNewPermName(e.target.value)}
                    />
                    </div>
                    <div className="min-w-0 flex-1"><label htmlFor={`${id}-permission-description`} className="block text-sm font-medium mb-1">Description</label>
                    <input
                      id={`${id}-permission-description`}
                      name="permission-description"
                      disabled={saving}
                      type="text"
                      placeholder="Description"
                      className="w-full min-w-0 rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 text-base p-2 border"
                      value={newPermDesc}
                      onChange={e => setNewPermDesc(e.target.value)}
                    />
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={addPermission}
                      className="px-3 py-2 bg-green-700 text-white rounded-md hover:bg-green-800"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {permissions.map((perm, idx) => (
                      <div key={idx} className="flex gap-2 justify-between items-center break-all bg-surface dark:bg-gray-600 p-2 rounded border border-gray-200 dark:border-gray-500">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{perm.name}</span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-300">({perm.description})</span>
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          aria-label={`Remove permission ${perm.name}`}
                          onClick={() => removePermission(idx)}
                          className="text-red-500 hover:text-red-700 p-3"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {permissions.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No permissions added yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-600 border border-transparent rounded-md hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                >
                  Save Role
                </button>
              </div>
            </form>
          {saving && <p role="status" className="mt-3 text-sm">Saving changes…</p>}
        </dialog>
      )}
    </div>
  );
};
