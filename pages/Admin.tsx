import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Post, PostDraft, DraftContent, User } from '../types';
import { Button } from '../components/ui/Button';
import { Trash2, Globe, FileText, Plus, Settings, Images } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api, APIError } from '../services/api';
import { PublicationTimes } from '../components/PublicationTimes';
import { PostEditorShell } from '../components/PostEditorShell';
import { DraftSaveCoordinator, draftContent, sameContent, type SaveState } from '../services/draftSaveCoordinator';

const EMPTY: DraftContent = { title: '', summary: '', body: '' };
const cacheKey = (id: number | null) => `admin_post_cache_${id ?? 'new'}`;
const readCache = (id: number | null): any => { try { return JSON.parse(localStorage.getItem(cacheKey(id)) || 'null'); } catch { return null; } };
const requestId = () => crypto.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const errorMessage = (error: unknown) => (error as APIError)?.data?.error === 'refresh_required'
  ? '编辑器版本已更新，本地内容已保留。请先备份当前内容，再重新打开管理页恢复草稿。'
  : (error as { status?: number })?.status === 409
  ? '服务器已有更新的草稿。本地内容已保留，请载入服务器草稿后再编辑。'
  : '草稿保存失败，内容已保留在本机；将重试，也可以点击立即保存。';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const editorReaderRef = useRef<(() => string) | null>(null);
  const registerContentReader = useCallback((reader: (() => string) | null) => { editorReaderRef.current = reader; }, []);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [doc, setDoc] = useState<DraftContent>(EMPTY);
  const [editorSeed, setEditorSeed] = useState(0);
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sessionRef = useRef<DraftSaveCoordinator | null>(null);
  const activeRef = useRef(false);
  const actionRef = useRef(false);

  const persist = (state: SaveState) => {
    try {
      if (!state.dirty) { localStorage.removeItem(cacheKey(state.id)); return; }
      localStorage.setItem(cacheKey(state.id), JSON.stringify({ title: state.content.title, summary: state.content.summary, content: state.content.body,
        timestamp: Date.now(), version: state.version, requestId: state.requestId, dirty: state.dirty }));
      if (state.id !== null) localStorage.removeItem(cacheKey(null));
    } catch { setMessage('浏览器本地存储不可用，请留意服务器保存状态。'); }
  };
  const fetchPosts = async () => {
    setIsLoading(true);
    try { setPosts((await api.posts.getManage()).items || []); }
    catch { setMessage('文章列表读取失败，请稍后重试。'); }
    finally { setIsLoading(false); }
  };
  useEffect(() => {
    let alive = true;
    void api.auth.me().then(user => {
      if (!alive) return;
      if (!user.roles.includes('editor') && !user.roles.includes('admin')) { navigate('/'); return; }
      setCurrentUser(user); void fetchPosts();
    }).catch(() => { if (alive) navigate('/login'); });
    return () => { alive = false; activeRef.current = false; sessionRef.current?.dispose(); };
  }, [navigate]);

  const installSession = (draft: PostDraft | null, cache: any = null) => {
    sessionRef.current?.dispose(); activeRef.current = true;
    const initial = draft ? draftContent(draft) : EMPTY;
    const coordinator = new DraftSaveCoordinator({
      create: async (content, key) => {
        const post = await api.posts.create({ ...content, status: 'draft', clientRequestId: key });
        return api.posts.getDraft(post.id);
      },
      save: (id, content, version) => api.posts.saveDraft(id, content, version),
    }, initial, draft, cache?.requestId || requestId(), state => {
      if (sessionRef.current !== coordinator || !activeRef.current) return;
      persist(state); setSaveState(state);
      if (state.error) setMessage(errorMessage(state.error));
    });
    sessionRef.current = coordinator; setDoc(initial); setSaveState(coordinator.state); setMessage('');
    if (cache && !sameContent({ title: cache.title || '', summary: cache.summary || '', body: cache.content || '' }, initial) && window.confirm(cache.version == null ? '发现旧版编辑器保留的本地草稿，是否恢复？恢复只修改草稿，不会直接更新线上文章。' : '发现尚未同步的本地草稿，是否恢复？')) {
      // Preserve the source before converting a legacy cache to a versioned draft.
      try { localStorage.setItem(`admin_post_backup_${draft?.postId ?? 'new'}_${Date.now()}`, JSON.stringify(cache)); } catch {}
      const local = { title: cache.title || '', summary: cache.summary || '', body: cache.content || '' };
      coordinator.update(local); setDoc(local);
      if (draft && cache.version != null && Number(cache.version) !== draft.version) coordinator.blockForConflict(new APIError('draft_conflict', 409));
    }
    setEditorSeed(seed => seed + 1); setView('editor');
  };
  const handleCreateNew = () => installSession(null, readCache(null));
  const handleEdit = async (post: Post) => {
    setIsLoading(true);
    try { installSession(await api.posts.getDraft(post.id), readCache(post.id)); }
    catch { setMessage('无法读取编辑草稿，请重试。'); }
    finally { setIsLoading(false); }
  };
  const change = (patch: Partial<DraftContent>) => {
    if (actionRef.current) return;
    const session = sessionRef.current; if (!session) return;
    const next = { ...session.state.content, ...patch };
    // Crepe blur/initialization can report the same Markdown. It is not an edit.
    if (sameContent(next, session.state.content)) return;
    session.update(next); setDoc(next); setMessage('');
  };
  const saveNow = async () => {
    const session = sessionRef.current; if (!session) return null;
    if (!session.state.id && !session.state.dirty) return null;
    return session.flush();
  };
  useEffect(() => {
    if (view !== 'editor' || !saveState?.dirty || busy || saveState.status === 'saving' || saveState.status === 'conflict') return;
    const session = sessionRef.current;
    const timeout = setTimeout(() => { void session?.flush().catch(() => {}); }, saveState.status === 'error' ? 5000 : 1500);
    return () => clearTimeout(timeout);
  }, [view, saveState, busy]);
  useEffect(() => {
    if (view !== 'editor') return;
    const onHidden = () => {
      const body = editorReaderRef.current?.(); if (body !== undefined) change({ body });
      const session = sessionRef.current; if (!session) return;
      persist(session.state);
      if (document.visibilityState === 'hidden' && session.state.dirty && session.state.status !== 'conflict') void session.flush().catch(() => {});
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      const body = editorReaderRef.current?.(); if (body !== undefined) change({ body });
      const session = sessionRef.current; if (!session?.state.dirty) return;
      persist(session.state); event.preventDefault(); event.returnValue = '';
    };
    document.addEventListener('visibilitychange', onHidden); window.addEventListener('pagehide', onHidden); window.addEventListener('beforeunload', onUnload);
    return () => { document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', onHidden); window.removeEventListener('beforeunload', onUnload); };
  }, [view]);

  const runAction = async (action: () => Promise<void>) => {
    if (actionRef.current) return; actionRef.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) {
      if ((error as { status?: number })?.status === 409) { backupLocal(); sessionRef.current?.blockForConflict(error); }
      setMessage(errorMessage(error));
    }
    finally { actionRef.current = false; setBusy(false); }
  };
  const handleSave = () => void runAction(async () => { const draft = await saveNow(); if (!draft) setMessage('请先输入文章内容。'); });
  const handleEditorPublish = () => void runAction(async () => {
    const session = sessionRef.current!;
    const saved = await saveNow();
    if (!saved || !session.state.content.title.trim() || !session.state.content.body.trim()) { setMessage('发布前请填写标题和正文。'); return; }
    const published = await api.posts.publish(saved.postId, saved.version);
    session.reset(published); setDoc(draftContent(published)); setMessage('发布成功。'); void fetchPosts();
  });
  const closeEditor = () => {
    activeRef.current = false; sessionRef.current?.dispose(); sessionRef.current = null; setView('list'); void fetchPosts();
  };
  const handleBack = () => void runAction(async () => {
    try { await saveNow(); closeEditor(); }
    catch (error) {
      const state = sessionRef.current?.state; if (state) persist(state);
      if (window.confirm('草稿尚未同步，内容已保留在本机。仍要返回吗？')) closeEditor();
      else throw error;
    }
  });
  const backupLocal = () => {
    const state = sessionRef.current?.state; if (!state) return;
    try { localStorage.setItem(`admin_post_backup_${state.id ?? 'new'}_${Date.now()}`, JSON.stringify({ ...state.content, requestId: state.requestId, version: state.version })); } catch {}
  };
  const handleReload = () => void runAction(async () => {
    const session = sessionRef.current; if (!session?.state.id) return;
    if (!window.confirm('载入服务器草稿？当前本地内容会另存浏览器备份。')) return;
    backupLocal(); const draft = await api.posts.getDraft(session.state.id); installSession(draft);
  });
  const handleDiscard = () => void runAction(async () => {
    const session = sessionRef.current; if (!session) return;
    if (session.state.status === 'conflict') { setMessage('请先载入服务器草稿，避免丢弃其他窗口的新内容。'); return; }
    if (!window.confirm(session.state.draft?.status === 'published' ? '放弃未发布的修改，恢复线上版本？' : '清空当前草稿内容？')) return;
    backupLocal();
    if (!session.state.id) { localStorage.removeItem(cacheKey(null)); installSession(null); return; }
    await session.flush();
    const reset = await api.posts.discardDraft(session.state.id, session.state.version);
    session.reset(reset); setDoc(draftContent(reset)); setEditorSeed(seed => seed + 1); setMessage('已放弃未发布的修改。');
  });
  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除这篇文章？')) return;
    try { await api.posts.delete(id); await fetchPosts(); } catch { setMessage('删除失败，请重试。'); }
  };
  const handlePublish = async (id?: number) => {
    if (!id) return;
    try { const draft = await api.posts.getDraft(id); await api.posts.publish(id, draft.version); await fetchPosts(); }
    catch (error) { setMessage(errorMessage(error)); }
  };
  const handleLogout = () => { api.auth.logout(); navigate('/login'); };
  if (!currentUser) return null;
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            {currentUser.roles.includes('admin') && (
              <>
                <Link to="/settings/images">
                  <Button variant="outline" className="flex items-center">
                    <Images className="w-4 h-4 mr-2" />
                    图片管理
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

        {message && <p role="alert" className="mb-4 text-sm text-red-600">{message}</p>}
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
                      {post.status === 'published' ? post.hasUnpublishedChanges ? '已发布 · 有未发布修改' : '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <PublicationTimes post={post} compact />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {(post.status === 'draft' || post.hasUnpublishedChanges) && typeof post.id === 'number' && (
                      <button onClick={() => handlePublish(post.id)} className="inline-flex h-11 w-11 items-center justify-center text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="发布最新草稿">
                        <Globe className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(post)} className="inline-flex h-11 w-11 items-center justify-center text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="编辑">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="inline-flex h-11 w-11 items-center justify-center text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="删除">
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

  return <PostEditorShell registerContentReader={registerContentReader}
    title={doc.title} summary={doc.summary} content={doc.body} editorKey={editorSeed}
    onTitleChange={title => change({ title })} onSummaryChange={summary => change({ summary })} onContentChange={body => change({ body })}
    saveStatus={saveState?.status || 'idle'} statusMessage={message || undefined}
    onSave={handleSave} onPublish={handleEditorPublish} onDiscard={handleDiscard} onBack={handleBack} onDone={handleBack} onReload={handleReload}
    isPublished={saveState?.draft?.status === 'published'} hasUnpublishedChanges={!!saveState?.dirty || !!saveState?.draft?.hasUnpublishedChanges}
    isBusy={busy} draftUpdatedAt={saveState?.draft?.updatedAt || undefined}
    publishedAt={saveState?.draft?.publishedAt || undefined} publishedUpdatedAt={saveState?.draft?.publishedUpdatedAt || undefined}
  />;
};
