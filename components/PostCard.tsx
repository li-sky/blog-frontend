import React from 'react';
import { Post } from '../types';
import { Calendar, ArrowRight } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onClick: (id: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  return (
    <div 
      onClick={() => onClick(post.id)}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
    >
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3 space-x-3">
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
          {post.status === 'draft' && (
            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full">
              草稿
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          {post.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-grow line-clamp-3">
          {post.summary ?? `${post.content.substring(0, 150)}...`}
        </p>

        <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium mt-auto group-hover:translate-x-1 transition-transform">
          读 <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </div>
  );
};
