import React, { lazy, Suspense } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home } from '../pages/Home';
import { Settings } from '../pages/Settings';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { ImageManagement } from '../pages/ImageManagement';

const PostDetail = lazy(async () => {
  const { PostDetail } = await import('../pages/PostDetail');
  return { default: PostDetail };
});

const Admin = lazy(async () => {
  const { Admin } = await import('../pages/Admin');
  return { default: Admin };
});

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/post/:id" element={
          <PageTransition>
            <Suspense fallback={<p role="status" className="py-12 text-center text-gray-500 dark:text-gray-400">正在加载文章…</p>}>
              <PostDetail key={location.pathname} />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/admin" element={
          <PageTransition>
            <Suspense fallback={<p role="status" className="py-12 text-center text-gray-500 dark:text-gray-400">正在加载管理后台…</p>}>
              <Admin />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/settings/images" element={<PageTransition><ImageManagement /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="*" element={
          <div className="py-20 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">页面不存在</h1>
            <Link to="/" className="mt-4 inline-block text-accent-600 underline dark:text-accent-400">返回首页</Link>
          </div>
        } />
      </Routes>
    </AnimatePresence>
  );
};
