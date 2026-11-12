import React, { useState, useEffect, useRef, useId } from 'react';
import { Setting, User } from '../types';
import { Button } from '../components/ui/Button';
import { Images, Save, X, Settings as SettingsIcon, Users as UsersIcon, Shield as ShieldIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { motion, useReducedMotion } from 'framer-motion';
import { Users } from './Users';
import { RoleManagement } from '../components/RoleManagement';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const id = useId();
  const reducedMotion = useReducedMotion();
  const mounted = useRef(false);
  const settingsRequest = useRef(0);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
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
    mounted.current = true;
    let active = true;
    const checkAuth = async () => {
      try {
        const user = await api.auth.me();
        if (!active) return;
        
        // Check if user is admin
        const isAdmin = user.roles.includes('admin');
        if (!isAdmin) {
          navigate('/'); // Redirect non-admins
          return;
        }
        
        setCurrentUser(user);
        void fetchSettings();
      } catch (e) {
        if (active) navigate('/login');
      }
    };
    void checkAuth();
    return () => { active = false; mounted.current = false; settingsRequest.current++; };
  }, [navigate]);

  const fetchSettings = async () => {
    if (!mounted.current) return;
    const current = ++settingsRequest.current;
    try {
      setIsLoading(true);
      const res = await api.settings.getAll();
      if (!mounted.current || current !== settingsRequest.current) return;
      setError('');
      setSettings(res.items || []);
    } catch (e) {
      if (mounted.current && current === settingsRequest.current) setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      if (mounted.current && current === settingsRequest.current) setIsLoading(false);
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
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      setIsSaving(true);
      await api.settings.update(key, {
        value: editValue,
        description: editDescription
      });
      await fetchSettings();
      setEditingKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update setting');
    } finally {
      savingRef.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  if (!currentUser) return <p role="status" className="py-10 text-center">Loading settings…</p>;

  return (
    <div className="min-w-0 max-w-6xl mx-auto py-4">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8" />
          System Settings
        </h1>
        <Link to="/settings/images" className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
          <Images className="mr-2 h-4 w-4" />
          图片管理
        </Link>
      </div>

      <div className="bg-surface dark:bg-gray-800 shadow rounded-lg overflow-hidden min-h-[600px]">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="-mb-px flex overflow-x-auto" role="tablist" aria-label="Settings sections"
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
              const current = tabs.indexOf(event.target as HTMLButtonElement);
              if (current < 0) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              tabs[next].focus(); tabs[next].click();
            }}>
            <button
              type="button"
              role="tab"
              id={`${id}-general-tab`}
              aria-controls={`${id}-general-panel`}
              aria-selected={activeTab === 'general'}
              tabIndex={activeTab === 'general' ? 0 : -1}
              onClick={() => setActiveTab('general')}
              className={`${
                activeTab === 'general'
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } flex-1 min-w-max py-4 px-3 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              General
            </button>
            <button
              type="button"
              role="tab"
              id={`${id}-users-tab`}
              aria-controls={`${id}-users-panel`}
              aria-selected={activeTab === 'users'}
              tabIndex={activeTab === 'users' ? 0 : -1}
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } flex-1 min-w-max py-4 px-3 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              Users
            </button>
            <button
              type="button"
              role="tab"
              id={`${id}-roles-tab`}
              aria-controls={`${id}-roles-panel`}
              aria-selected={activeTab === 'roles'}
              tabIndex={activeTab === 'roles' ? 0 : -1}
              onClick={() => setActiveTab('roles')}
              className={`${
                activeTab === 'roles'
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } flex-1 min-w-max py-4 px-3 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
            >
              <ShieldIcon className="w-4 h-4 mr-2" />
              Roles & Permissions
            </button>
          </div>
        </div>

        <div className="min-w-0 p-3 sm:p-6">
          {error && <p role="alert" className="mb-4 text-red-600 dark:text-red-400">{error}</p>}
          <div role="tabpanel" id={`${id}-general-panel`} aria-labelledby={`${id}-general-tab`} hidden={activeTab !== 'general'}>
          {activeTab === 'general' && (
            <>
              {isLoading ? (
                <div role="status" className="flex justify-center py-12">
                  <span className="sr-only">Loading settings…</span>
                  <div aria-hidden="true" className="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {settings.map((setting) => (
                    <motion.li 
                      key={setting.key}
                      initial={reducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors rounded-md px-2"
                    >
                      {editingKey === setting.key ? (
                        <form aria-label={`Edit ${setting.key}`} onSubmit={event => { event.preventDefault(); void handleSave(setting.key); }} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-accent-600 dark:text-accent-400">
                              {setting.key}
                            </h3>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost"
                                aria-label="Cancel setting changes"
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                aria-label="Save setting changes"
                                type="submit"
                                disabled={isSaving}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`${id}-setting-value`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                            <input
                              id={`${id}-setting-value`}
                              name="setting-value"
                              disabled={isSaving}
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor={`${id}-setting-description`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <input
                              id={`${id}-setting-description`}
                              name="setting-description"
                              disabled={isSaving}
                              type="text"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-base p-2 border"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-accent-600 dark:text-accent-400 truncate">
                              {setting.key}
                            </p>
                            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono break-all bg-gray-100 dark:bg-gray-900 inline-block px-2 py-0.5 rounded">
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
                              className="text-accent-600 hover:text-accent-900 dark:text-accent-400 dark:hover:text-accent-300"
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

          </div>
          <div role="tabpanel" id={`${id}-users-panel`} aria-labelledby={`${id}-users-tab`} hidden={activeTab !== 'users'}>
            {activeTab === 'users' && <Users />}
          </div>
          <div role="tabpanel" id={`${id}-roles-panel`} aria-labelledby={`${id}-roles-tab`} hidden={activeTab !== 'roles'}>
            {activeTab === 'roles' && <RoleManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};
