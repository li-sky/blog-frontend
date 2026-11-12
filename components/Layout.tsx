import React, { useState, useEffect, useRef, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PenTool, User, Sparkles, LogOut } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { ThemeControls } from './ThemeControls';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
  const dropdownId = useId();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': '首页', '/login': '登录', '/register': '注册', '/admin': '管理后台',
      '/settings': '设置', '/settings/images': '图片管理',
    };
    document.title = `${titles[location.pathname] || (location.pathname.startsWith('/post/') ? '文章' : '页面不存在')} · Skyli的小站`;
  }, [location.pathname]);
  
  // Simple check for UI update, actual protection is in Admin page
  const isLoggedIn = !!localStorage.getItem('token');

  const [user, setUser] = useState<UserType | null>(() => {
    const str = localStorage.getItem('user');
    try {
      return str ? JSON.parse(str) as UserType : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let alive = true;
    const fetchUser = async () => {
      if (!isLoggedIn) {
        setUser(null);
        return;
      }

      // Try to sync with localStorage first (e.g. after login)
      const localStr = localStorage.getItem('user');
      if (localStr) {
        try {
          const localUser = JSON.parse(localStr);
          setUser(localUser);
        } catch {}
      }

      try {
        const userData = await api.auth.me();
        
        // Calculate SHA256 for Gravatar if missing
        if (userData.email && !userData.emailSha256 && crypto.subtle) {
          const msgBuffer = new TextEncoder().encode(userData.email.trim().toLowerCase());
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          userData.emailSha256 = hashHex;
        }

        if (!alive) return;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchUser();
    return () => { alive = false; };
  }, [location.pathname, isLoggedIn]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const closeDropdown = () => {
    if (supportsPopover) dropdownPanelRef.current?.hidePopover();
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (supportsPopover || !isDropdownOpen) return;
    const handleClickOutside = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [supportsPopover, isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <a href="#main-content" className="skip-link">跳到正文</a>
      {/* Header */}
      <header className="bg-surface dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Skyli的小站</span>
              </Link>
            </div>

            <nav className="flex items-center space-x-3" aria-label="主导航">
              {isLoggedIn && user ? (
                <div className="relative" ref={dropdownRef}
                  onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeDropdown(); }}
                  onKeyDown={event => { if (!supportsPopover && event.key === 'Escape' && isDropdownOpen) { event.preventDefault(); closeDropdown(); dropdownButtonRef.current?.focus(); } }}>
                  <button
                    ref={dropdownButtonRef}
                    type="button"
                    aria-label="账户选项"
                    aria-expanded={isDropdownOpen}
                    aria-controls={dropdownId}
                    popoverTarget={supportsPopover ? dropdownId : undefined}
                    onClick={supportsPopover ? undefined : () => setIsDropdownOpen(open => !open)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <img
                      src={`https://www.gravatar.com/avatar/${user.emailSha256 || ''}?d=identicon`}
                      alt={user.username || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                    />
                  </button>

                    <div id={dropdownId} ref={dropdownPanelRef} popover={supportsPopover ? 'auto' : undefined}
                      hidden={!supportsPopover && !isDropdownOpen}
                      onToggle={event => { if (supportsPopover) setIsDropdownOpen(event.newState === 'open'); }}
                      className="account-options w-48 text-gray-900 dark:text-gray-100 bg-surface dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.username || user.email || 'User'}</p>
                        {user.email && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>}
                      </div>
                      
                      {user.roles?.includes('admin') && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          aria-current={isActive('/admin') ? 'page' : undefined}
                          onClick={closeDropdown}
                        >
                          <PenTool className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      )}
                      
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                </div>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    aria-current={isActive('/login') ? 'page' : undefined}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/login') 
                        ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    马润登陆
                  </Link>
                  <Link 
                    to="/register" 
                    aria-current={isActive('/register') ? 'page' : undefined}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/register') 
                        ? 'bg-accent-50 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300'
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
      <main id="main-content" tabIndex={-1} className="flex-grow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">
              © {new Date().getFullYear()} Skyli的小站，从前端到后端骄傲地全流程摆大烂。
            </p>
          </div>
        </div>
      </footer>

      <ThemeControls />
    </div>
  );
};
