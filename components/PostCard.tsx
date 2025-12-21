import React, { useMemo } from 'react';
import { Post } from '../types';
import { Calendar, ArrowRight } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onClick: (id: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const { displaySummary, imageUrl } = useMemo(() => {
    const rawSummary = post.summary || '';
    // Match content between %...%
    const imgRegex = /%([^%]+)%/;
    const match = rawSummary.match(imgRegex);
    
    if (match) {
      return {
        imageUrl: match[1],
        displaySummary: rawSummary.replace(match[0], '').trim()
      };
    }
    
    return {
      imageUrl: null,
      displaySummary: rawSummary || post.content.substring(0, 150) + '...'
    };
  }, [post.summary, post.content]);

  return (
    <div 
      onClick={() => onClick(post.id)}
      className="group bg-white dark:bg-gray-800 block p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer break-inside-avoid mb-6"
    >
      {imageUrl && (
        <div className="mb-6 overflow-hidden rounded-lg">
           <img 
             className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500" 
             src={imageUrl} 
             alt={post.title} 
             onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
             }}
           />
        </div>
      )}
      
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

      <h5 className="mb-2 text-2xl tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-serif font-extrabold">
        {post.title}
      </h5>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        {displaySummary}
      </p>

    </div>
  );
};
