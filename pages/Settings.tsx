import React, { useState, useEffect } from 'react';
import { Setting, User } from '../types';
import { Button } from '../components/ui/Button';
import { Save, X, Settings as SettingsIcon, Users as UsersIcon, Shield as ShieldIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Users } from './Users';
import { RoleManagement } from '../components/RoleManagement';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'roles'>('general');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // General Settings State
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.auth.me();
        setCurrentUser(user);
        
        // Check if user is admin
        const isAdmin = user.roles.includes('admin');
        if (!isAdmin) {
          navigate('/'); // Redirect non-admins
          return;
        }
        
        fetchSettings();
      } catch (e) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.settings.getAll();
      setSettings(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
    setEditDescription(setting.description || '');
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
    setEditDescription('');
  };

  const handleSave = async (key: string) => {
    try {
      setIsSaving(true);
      await api.settings.update(key, {
        value: editValue,
        description: editDescription
      });
      await fetchSettings();
      setEditingKey(null);
    } catch (e) {
      alert('Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8" />
          System Settings
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden min-h-[600px]">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              General
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`${
                activeTab === 'roles'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <ShieldIcon className="w-4 h-4 mr-2" />
              Roles & Permissions
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {settings.map((setting) => (
                    <motion.li 
                      key={setting.key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-md px-2"
                    >
                      {editingKey === setting.key ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                              {setting.key}
                            </h3>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                onClick={handleCancel}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                onClick={() => handleSave(setting.key)}
                                disabled={isSaving}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <input
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                              {setting.key}
                            </p>
                            <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-900 inline-block px-2 py-0.5 rounded">
                              {setting.value}
                            </p>
                            {setting.description && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {setting.description}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Button
                              variant="ghost"
                              onClick={() => handleEdit(setting)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </ul>
              )}
            </>
          )}

          {activeTab === 'users' && <Users />}
          
          {activeTab === 'roles' && <RoleManagement />}
        </div>
      </div>
    </div>
  );
};
