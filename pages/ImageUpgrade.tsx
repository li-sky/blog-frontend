import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Image as ImageIcon, Loader2, Play, RefreshCw, SkipForward, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { encodeImageVariants, isAnimatedImage } from '../services/imageVariants';
import { Image } from '../types';

type ConversionStatus = 'ready' | 'downloading' | 'encoding' | 'uploading' | 'done' | 'skipped' | 'error';

interface ConversionItem {
  image: Image;
  status: ConversionStatus;
  message?: string;
}

const statusLabel: Record<ConversionStatus, string> = {
  ready: '待转换',
  downloading: '下载原图',
  encoding: 'WASM 编码',
  uploading: '上传变体',
  done: '已完成',
  skipped: '无需转换',
  error: '转换失败',
};

const CONVERSION_CONCURRENCY = 4;

const getOriginalImageUrl = (image: Image): string => {
  const storedUrl = typeof image.url === 'string' ? image.url.trim() : '';
  if (storedUrl && storedUrl !== 'undefined' && !storedUrl.includes('/undefined')) {
    return storedUrl;
  }

  const storedPath = typeof image.storagePath === 'string'
    ? image.storagePath.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/^uploads\//, '')
    : '';
  const filename = typeof image.filename === 'string' ? image.filename.trim() : '';
  const relativePath = storedPath || filename;
  if (!relativePath || relativePath === 'undefined') {
    throw new Error('原图地址缺失，且无法从存储路径恢复。');
  }

  return `/images/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
};

export const ImageUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const stopRequested = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await api.auth.me();
        if (!user.roles.includes('admin')) {
          navigate('/');
          return;
        }

        const images: Image[] = [];
        let offset = 0;
        const limit = 100;
        while (true) {
          const page = await api.images.list({ limit, offset });
          images.push(...page.items);
          offset += page.items.length;
          if (offset >= page.total || page.items.length === 0) break;
        }

        setItems(images.map((image) => ({
          image,
          status: image.variantsComplete ? 'skipped' : 'ready',
          message: image.variantsComplete ? '已有完整变体，或为动画 GIF。' : undefined,
        })));
      } catch (error) {
        console.error('Failed to load images', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [navigate]);

  const updateItem = (id: number, patch: Partial<ConversionItem>) => {
    setItems((current) => current.map((item) =>
      item.image.id === id ? { ...item, ...patch } : item,
    ));
  };

  const convertOne = async (item: ConversionItem) => {
    const { image } = item;
    if (image.variantsComplete || isAnimatedImage(image.mimeType, image.filename)) {
      updateItem(image.id, {
        status: 'skipped',
        message: '已有完整变体，或为动画 GIF。',
      });
      return;
    }

    try {
      updateItem(image.id, { status: 'downloading', message: undefined });
      const response = await fetch(getOriginalImageUrl(image), { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`下载原图失败（HTTP ${response.status}）`);
      }

      const source = await response.blob();
      updateItem(image.id, { status: 'encoding' });
      const variants = await encodeImageVariants(
        source.type ? source : new Blob([source], { type: image.mimeType }),
      );
      if (variants.length === 0) {
        updateItem(image.id, { status: 'skipped', message: '动画图片保留原图。' });
        return;
      }

      updateItem(image.id, { status: 'uploading' });
      const updated = await api.images.uploadVariants(image.id, variants);
      updateItem(image.id, {
        image: updated,
        status: 'done',
        message: '600px、1200px 与原始分辨率 WebP 已写入。',
      });
    } catch (error) {
      updateItem(image.id, {
        status: 'error',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const run = async (onlyFailed = false) => {
    if (isRunning) return;
    setIsRunning(true);
    stopRequested.current = false;
    const queue = items.filter((item) =>
      onlyFailed ? item.status === 'error' : item.status === 'ready' || item.status === 'error',
    );

    let nextIndex = 0;
    const worker = async () => {
      while (!stopRequested.current) {
        const item = queue[nextIndex];
        nextIndex += 1;
        if (!item) return;
        await convertOne(item);
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(CONVERSION_CONCURRENCY, queue.length) },
        () => worker(),
      ),
    );
    setIsRunning(false);
  };

  const counts = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.status === 'ready').length,
    done: items.filter((item) => item.status === 'done' || item.status === 'skipped').length,
    failed: items.filter((item) => item.status === 'error').length,
  }), [items]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/settings" className="mb-3 inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回系统设置
          </Link>
          <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-white">
            <ImageIcon className="mr-3 h-8 w-8 text-indigo-500" />
            历史图片升级
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            页面只读取图片清单；开始升级后最多同时处理 4 张原图，在本机通过
            WebAssembly 编码 600px、1200px 和原始分辨率 WebP，再上传到服务器。
          </p>
        </div>
        <div className="flex gap-2">
          {counts.failed > 0 && (
            <Button variant="outline" disabled={isRunning} onClick={() => run(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试失败项
            </Button>
          )}
          <Button
            disabled={isLoading || isRunning || (counts.pending === 0 && counts.failed === 0)}
            onClick={() => run(false)}
          >
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {isRunning ? '转换中' : '开始升级'}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['图片总数', counts.total],
          ['等待处理', counts.pending],
          ['完成/跳过', counts.done],
          ['失败', counts.failed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {isRunning && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" onClick={() => { stopRequested.current = true; }}>
            处理完当前任务后停止
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在读取图片列表…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-500">没有需要检查的图片。</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <li key={item.image.id} className="flex items-center gap-4 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.image.originalName}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.image.width} × {item.image.height}
                    {item.message && <span className="ml-2">· {item.message}</span>}
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  {(['downloading', 'encoding', 'uploading'] as ConversionStatus[]).includes(item.status) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
                  )}
                  {item.status === 'done' && <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />}
                  {item.status === 'skipped' && <SkipForward className="mr-2 h-4 w-4 text-gray-400" />}
                  {item.status === 'error' && <XCircle className="mr-2 h-4 w-4 text-red-500" />}
                  <span className={item.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}>
                    {statusLabel[item.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
