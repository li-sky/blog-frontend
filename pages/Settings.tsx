import React, { useState, useEffect } from 'react';
import { Setting } from '../types';
import { Button } from '../components/ui/Button';
import { Save, X, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { motion } from 'framer-motion';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSettings();
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8" />
          设置
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {settings.map((setting) => (
              <motion.li 
                key={setting.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
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
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                        <Button 
                          onClick={() => handleSave(setting.key)}
                          isLoading={isSaving}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        值
                      </label>
                      <textarea
                        rows={3}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        描述
                      </label>
                      <input
                        type="text"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {setting.key}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {setting.description}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-900 dark:text-gray-100 break-all">
                          {setting.value}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleEdit(setting)}
                      >
                        编辑
                      </Button>
                    </div>
                  </div>
                )}
              </motion.li>
            ))}
            {settings.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                暂无设置项
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
