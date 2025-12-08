import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, Comment } from '../types';
import { ArrowLeft, Calendar, Loader2, MessageSquare, Trash2, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeReact from 'rehype-react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import 'katex/dist/katex.min.css';

export const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (!post?.content) return;

    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeReact, { Fragment, jsx, jsxs } as any)
      .process(post.content)
      .then((file) => {
        setContent(file.result);
      })
      .catch((err) => {
        console.error('Markdown processing failed:', err);
      });
  }, [post?.content]);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const data = await api.posts.getOne(id);
        setPost(data);
      } catch (error) {
        console.error("Failed to load post", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchComments = async () => {
      try {
        const data = await api.comments.list(id);
        setComments(data.items);
      } catch (error) {
        console.error("Failed to load comments", error);
      }
    };
    fetchComments();
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || !id) return;
    setIsSubmittingComment(true);
    try {
      const newComment = await api.comments.create(id, commentBody);
      // Optimistically add the comment or re-fetch. 
      // Since the API returns the created comment, we can just add it.
      // However, we might need to enrich it with user info if the API doesn't return it fully populated.
      // Assuming API returns what we need or we can display basic info.
      // For now, let's just prepend it.
      setComments(prev => [newComment, ...prev]);
      setCommentBody('');
    } catch (error) {
      console.error("Failed to post comment", error);
      alert("Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!id || !window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await api.comments.delete(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment", error);
      alert("Failed to delete comment");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">未找到文章</h2>
        <Button onClick={() => navigate('/')} className="mt-4" variant="secondary">
          回家
        </Button>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/')} 
        className="mb-6 -ml-4 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        回到文章列表
      </Button>

      <header className="mb-10">
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-1.5" />
            {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          {post.status === 'draft' && (
            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 rounded text-xs font-medium">Draft</span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          {post.title}
        </h1>
      </header>

      {/* 
        Using 'prose' class from Tailwind Typography plugin. 
        It automatically styles standard HTML elements (h1, p, ul, etc.) generated by remark/rehype.
      */}
      <div className="prose prose-indigo prose-lg max-w-none text-gray-800 dark:text-gray-200 dark:prose-invert serif">
         {content}
      </div>

      <hr className="my-12 border-gray-200 dark:border-gray-700" />

      <section className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <MessageSquare className="w-6 h-6 mr-2" />
          锐评 ({comments.length})
        </h3>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-10 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                留下你的锐评
              </label>
              <textarea
                id="comment"
                rows={4}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                placeholder="分享你的想法..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingComment} icon={<Send className="w-4 h-4" />}>
                {isSubmittingComment ? '发布中...' : '发布锐评'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 mb-10 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">请登录以发表评论。</p>
            <Button onClick={() => navigate('/login')} variant="secondary">
              登录
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic text-center py-8">还没人锐评。成为第一个分享你想法的人吧！</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md dark:hover:shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold mr-3">
                      {(comment.user?.username || comment.userId.toString()).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.user?.username || `User #${comment.userId}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {user && (user.id === comment.userId || user.roles?.includes('admin')) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
};