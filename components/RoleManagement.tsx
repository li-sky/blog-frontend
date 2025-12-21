import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '../types';
import { Trash2, Edit, Plus, X, Shield } from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form states
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newPermName, setNewPermName] = useState('');
  const [newPermDesc, setNewPermDesc] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await api.roles.list({ limit: 100 });
      setRoles(response.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.roles.delete(id);
      setRoles(roles.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setShowModal(false);
      resetForm();
      fetchRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to save role');
    }
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

  if (loading) return <div className="text-center py-10">Loading roles...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h2>
        <button
          onClick={startCreate}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Permissions</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{role.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{role.name}</td>
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
                  <button onClick={() => startEdit(role)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(role.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingRole ? 'Edit Role' : 'Create Role'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-2">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Permission Name (e.g. post.manage)"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white sm:text-sm p-2 border"
                      value={newPermName}
                      onChange={e => setNewPermName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white sm:text-sm p-2 border"
                      value={newPermDesc}
                      onChange={e => setNewPermDesc(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={addPermission}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {permissions.map((perm, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-600 p-2 rounded border border-gray-200 dark:border-gray-500">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{perm.name}</span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-300">({perm.description})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePermission(idx)}
                          className="text-red-500 hover:text-red-700"
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
                  onClick={() => setShowModal(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
