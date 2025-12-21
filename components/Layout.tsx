import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PenTool, User, Sparkles, Sun, Moon, Monitor, Settings, Users } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  // Simple check for UI update, actual protection is in Admin page
  const isLoggedIn = !!localStorage.getItem('token');

  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const systemDark = mediaQuery.matches;
      const isDark = theme === 'dark' || (theme === 'system' && systemDark);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (prev === 'system') {
        return systemDark ? 'light' : 'dark';
      }
      
      if (prev === 'light') {
        return systemDark ? 'dark' : 'system';
      }
      
      // prev === 'dark'
      return systemDark ? 'system' : 'light';
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-6 h-6" />;
      case 'dark': return <Moon className="w-6 h-6" />;
      case 'system': return <Monitor className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Skyli的小站</span>
              </Link>
            </div>

            <nav className="flex items-center space-x-3">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                家
              </Link>
              {isLoggedIn ? (
                <>
                <Link 
                  to="/admin" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    isActive('/admin') 
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`}
                >
                  <PenTool className="w-4 h-4 mr-1.5" />
                  汽车仪表
                </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/login') 
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    马润登陆
                  </Link>
                  <Link 
                    to="/register" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/register') 
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    登记簿
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">
              © {new Date().getFullYear()} Skyli的小站，从前端到后端骄傲地全流程摆大烂。
            </p>
          </div>
        </div>
      </footer>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-10 right-10 w-14 h-14 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-[60]"
        title={`Current theme: ${theme}`}
      >
        {getThemeIcon()}
      </button>
    </div>
  );
};
