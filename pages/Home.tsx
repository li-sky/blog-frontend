import React, { useEffect, useState } from 'react';
import { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {posts.map(post => (
          <PostCard 
            key={post.id} 
            post={post} 
            onClick={(id) => navigate(`/post/${id}`)} 
          />
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
