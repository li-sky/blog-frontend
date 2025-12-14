import React, { useState, useEffect } from 'react';
import { Post, PostPayload } from '../types';
import { Button } from '../components/ui/Button';
import { Save, Trash2, Globe, FileText, Plus, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CrepeEditor } from '../components/CrepeEditor';
import { AnimatePresence, motion } from 'framer-motion';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Editor State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState(0);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPosts();
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
    setEditingId(null);
    setTitle('');
    setSummary('');
    setContent('');
    setIsSummaryOpen(true);
    setEditorSeed((prev) => prev + 1);
    setView('editor');
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSummary(post.summary);
    setContent(post.content);
    setIsSummaryOpen(!!post.summary);
    setEditorSeed((prev) => prev + 1);
    setView('editor');
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

  const handleSave = async () => {
    const postData: PostPayload = {
      title,
      body: content,
      summary: summary || content.substring(0, 100),
      status: 'draft' as const
    };

    try {
      if (editingId) {
        await api.posts.update(editingId, postData);
      } else {
        await api.posts.create(postData);
      }
      setView('list');
      fetchPosts();
    } catch (e) {
      alert('Failed to save');
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex gap-4">
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
          onClick={() => setView('list')} 
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
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
                  onChange={(e) => setTitle(e.target.value)}
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
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    placeholder="Write a summary..."
                    className="w-full text-lg text-gray-600 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 resize-none outline-none bg-transparent"
                  />
                )}
                <div className="h-px bg-gray-100 dark:bg-gray-800 mt-2" />
              </div>
            </div>

            {/* Editor */}
            <div className="min-h-[500px] pb-24 max-w-7xl mx-auto">
              <CrepeEditor
                key={editorSeed}
                value={content}
                onChange={setContent}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleSave}
        className="fixed bottom-28 right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-50"
        title={editingId ? 'Update Post' : 'Save Draft'}
      >
        <Save className="w-6 h-6" />
      </button>
    </div>
  );
};