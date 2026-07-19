import React, { useEffect, useMemo, useState } from 'react';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

// 与 Tailwind 断点 (md: 768, lg: 1024) 保持一致的列数
const getColumnCount = () => {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia('(min-width: 1024px)').matches) return 3;
  if (window.matchMedia('(min-width: 768px)').matches) return 2;
  return 1;
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [columnCount, setColumnCount] = useState(getColumnCount);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.posts.getAll();
        setPosts(response.items || []);
      } catch (err) {
        console.error("无法获取文章", err);
        setError("你今天运气不好！破站挂壁了~");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const onResize = () => setColumnCount(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 轮询分配：第 1 篇进第 1 列、第 2 篇进第 2 列……
  // 这样视觉上是先从左到右、再从上到下，同时保持瀑布流的错落高度
  const columns = useMemo(() => {
    const cols: Post[][] = Array.from({ length: columnCount }, () => []);
    posts.forEach((post, index) => {
      cols[index % columnCount].push(post);
    });
    return cols;
  }, [posts, columnCount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">


      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {columns.map((columnPosts, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-6">
            {columnPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onClick={(id) => navigate(`/post/${id}`)}
              />
            ))}
          </div>
        ))}
      </div>

      {!isLoading && posts.length === 0 && !error && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">尚无文章</h3>
          <p className="text-gray-500 mt-1">快更新！</p>
        </div>
      )}
    </div>
  );
};
