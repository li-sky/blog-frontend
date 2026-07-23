import React, { useState, useEffect } from 'react';
import { Post, PostPayload, User } from '../types';
import { Button } from '../components/ui/Button';
import { Save, Trash2, Globe, FileText, Plus, ArrowLeft, ChevronDown, ChevronRight, Settings, Images } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CrepeEditor } from '../components/CrepeEditor';
import { AnimatePresence, motion } from 'framer-motion';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Editor State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState(0);

  // Auto-save states
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Auto-save and caching
  useEffect(() => {
    if (view !== 'editor') return;

    const cacheKey = editingId ? `admin_post_cache_${editingId}` : `admin_post_cache_new`;
    const cacheData = {
      title,
      summary,
      content,
      timestamp: Date.now()
    };
    // Always store changes to local cache
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // Only auto-save to server if dirty and not totally empty
    if (!isDirty || (!title && !content && !summary)) return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const postData: PostPayload = {
          title: title || '无标题草稿',
          body: content,
          summary: summary || content.substring(0, 100),
          status: 'draft' as const
        };

        if (editingId) {
          await api.posts.update(editingId, postData);
          setSaveStatus('saved');
        } else {
          const newPost = await api.posts.create(postData);
          setEditingId(newPost.id);
          localStorage.removeItem('admin_post_cache_new');
          setSaveStatus('saved');
        }
        setIsDirty(false);
      } catch (err) {
        setSaveStatus('error');
        setToastMessage('自动保存失败，将于 5 秒后自动重试...');
        setTimeout(() => setToastMessage(null), 4000);
        setTimeout(() => setRetryTrigger(prev => prev + 1), 5000); // 5秒后重试
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, summary, content, editingId, isDirty, view, retryTrigger]);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.auth.me();
        setCurrentUser(user);
        
        // Check if user has editor role (or admin)
        const isEditor = user.roles.includes('editor') || user.roles.includes('admin');
        if (!isEditor) {
          navigate('/'); // Redirect non-editors
          return;
        }
        
        fetchPosts();
      } catch (e) {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const res = await api.posts.getManage();
      setPosts(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    const cacheKey = `admin_post_cache_new`;
    const cachedStr = localStorage.getItem(cacheKey);
    let useCache = false;
    
    if (cachedStr) {
       const cachedData = JSON.parse(cachedStr);
       useCache = window.confirm(`发现时间为 ${new Date(cachedData.timestamp).toLocaleString()} 的未保存草稿。\n您要恢复这些未保存的更改吗？`);
    }

    setEditingId(null);
    if (useCache) {
      const cachedData = JSON.parse(cachedStr!);
      setTitle(cachedData.title || '');
      setSummary(cachedData.summary || '');
      setContent(cachedData.content || '');
      setIsSummaryOpen(!!cachedData.summary);
      setIsDirty(true);
    } else {
      setTitle('');
      setSummary('');
      setContent('');
      setIsSummaryOpen(true);
      setIsDirty(false);
    }
    setSaveStatus('idle');
    setEditorSeed((prev) => prev + 1);
    setView('editor');
  };

  const handleEdit = async (post: Post) => {
    try {
      setIsLoading(true);
      const fullPost = await api.posts.getOne(post.id);
      
      const cacheKey = `admin_post_cache_${post.id}`;
      const cachedStr = localStorage.getItem(cacheKey);
      
      let useCache = false;
      if (cachedStr) {
        const cachedData = JSON.parse(cachedStr);
        const serverTime = new Date(fullPost.updatedAt || fullPost.createdAt).getTime();
        if (cachedData.timestamp > serverTime) {
          useCache = window.confirm(`发现更新的本地草稿 (时间: ${new Date(cachedData.timestamp).toLocaleString()})，晚于服务器上的保存时间。\n您要恢复本地的更改吗？`);
        }
      }

      setEditingId(fullPost.id);
      if (useCache) {
        const cachedData = JSON.parse(cachedStr!);
        setTitle(cachedData.title || '');
        setSummary(cachedData.summary || '');
        setContent(cachedData.content || '');
        setIsSummaryOpen(!!cachedData.summary);
        setIsDirty(true);
      } else {
        setTitle(fullPost.title);
        setSummary(fullPost.summary || '');
        setContent(fullPost.content);
        setIsSummaryOpen(!!fullPost.summary);
        setIsDirty(false);
      }
      setSaveStatus('idle');
      setEditorSeed((prev) => prev + 1);
      setView('editor');
    } catch (e) {
      console.error("Failed to fetch post details", e);
      alert("Failed to load post content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.posts.delete(id);
      fetchPosts();
    } catch (e) {
      alert('Failed to delete post');
    }
  };

  const handlePublish = async (id?: number) => {
    if (typeof id !== 'number' || Number.isNaN(id)) {
      alert('Cannot publish because the post identifier is missing.');
      return;
    }

    try {
      await api.posts.publish(id);
      fetchPosts();
    } catch (e) {
      alert('Failed to publish post');
    }
  };

  /* handleSave removed as it's auto-saving now */

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  if (!currentUser) return null;

  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex gap-4">
            {currentUser.roles.includes('admin') && (
              <>
                <Link to="/settings/images">
                  <Button variant="outline" className="flex items-center">
                    <Images className="w-4 h-4 mr-2" />
                    Upgrade Images
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="outline" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </>
            )}
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
            <Button onClick={handleCreateNew} icon={<Plus className="w-4 h-4"/>}>New Post</Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {posts.map((post, index) => (
                <tr key={post.id ?? `post-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{post.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      post.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {post.status === 'draft' && typeof post.id === 'number' && (
                      <button onClick={() => handlePublish(post.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Publish">
                        <Globe className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(post)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Edit">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && !isLoading && (
                <tr key="no-posts">
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">No posts found. Create one!</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    );
  }

  // Editor View
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col animate-slide-up-fade transition-colors duration-300">
      {/* Top Bar */}
      <div className="flex items-center h-16 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 transition-colors duration-300">
        <button 
          onClick={() => {
             setView('list');
             fetchPosts();
          }} 
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回仪表盘
        </button>
        <div className="ml-auto text-sm text-gray-500 flex items-center">
          {saveStatus === 'saving' && <span>正在保存...</span>}
          {saveStatus === 'saved' && <span className="text-green-500">已自动保存草稿</span>}
          {saveStatus === 'error' && <span className="text-red-500">保存失败</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-none mx-auto py-12 px-8">
          <div className="space-y-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                  placeholder="Post Title"
                  className="w-full text-4xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 outline-none bg-transparent"
                />
                <div className="h-px bg-gray-100 dark:bg-gray-800 mt-6" />
              </div>

              {/* Summary Input */}
              <div>
                <button 
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
                >
                  {isSummaryOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                  <span className="text-sm font-medium">Summary</span>
                </button>
                
                {isSummaryOpen && (
                  <textarea
                    value={summary}
                    onChange={(e) => { setSummary(e.target.value); setIsDirty(true); }}
                    rows={3}
                    placeholder="Write a summary..."
                    className="w-full text-lg text-gray-600 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 resize-none outline-none bg-transparent"
                  />
                )}
                <div className="h-px bg-gray-100 dark:bg-gray-800 mt-2" />
              </div>
            </div>

            {/* Editor */}
            <div className="min-h-[500px] max-w-7xl mx-auto">
              <CrepeEditor
                key={editorSeed}
                value={content}
                onChange={(v) => { setContent(v); setIsDirty(true); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button - removed in favor of auto-save */}

      {/* Warning Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-red-600 text-white px-6 py-3 rounded-md shadow-lg flex items-center gap-3 z-50"
          >
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
