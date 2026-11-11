import { markdownLink } from './ResourceLink';
import React, { useEffect, useRef, useState } from 'react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import { insert } from '@milkdown/utils';
import { api } from '../services/api';
import { encodeImageVariants } from '../services/imageVariants';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './crepe-theme.css';

interface CrepeEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export const CrepeEditor: React.FC<CrepeEditorProps> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const escapeMarkdownAlt = (text: string) => text.replace(/[\[\]()]/g, '\\$&');

  const uploadImage = async (file: File, alt?: string) => {
    const variants = await encodeImageVariants(file);
    return api.images.upload(file, alt, variants);
  };

  const uploadAttachments = async (files: File[]) => {
    const editor = crepeRef.current?.editor;
    if (!editor || busyRef.current) return;
    busyRef.current = true;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      for (let index = 0; index < files.length; index++) {
        const file = await api.files.upload(files[index]);
        editor.action(insert('\n\n' + markdownLink(file.name, file.url, `attachment:${file.size}`) + '\n\n'));
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '文件上传失败');
    } finally { busyRef.current = false; setIsUploading(false); }
  };

  const insertLinkCard = () => {
    const url = window.prompt('链接地址（http 或 https）');
    if (!url) return;
    let parsed: URL;
    try { parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
    catch { window.alert('请输入有效的 http/https 地址'); return; }
    const name = window.prompt('卡片标题', parsed.hostname);
    if (name === null) return;
    crepeRef.current?.editor.action(insert('\n\n' + markdownLink(name || parsed.hostname, parsed.href, 'link-card') + '\n\n'));
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue: value || '',
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {
          onUpload: async (file: File) => {
            const image = await uploadImage(file);
            return image.url;
          },
        },
      },
    });

    crepeRef.current = crepe;

    crepe.on((listener) =>
      listener.markdownUpdated((_, markdown) => {
        onChange(markdown);
      })
    );

    crepe
      .create()
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize Crepe editor', err);
      });

    const handleDragOver = (event: DragEvent) => {
      if (event.dataTransfer) {
        event.preventDefault();
      }
    };

    const handleDrop = async (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      event.stopPropagation();

      const editor = crepeRef.current?.editor;
      if (!editor) return;

      const imageFiles = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      const attachmentFiles = Array.from(event.dataTransfer.files).filter(file => !file.type.startsWith('image/'));
      if (!imageFiles.length && !attachmentFiles.length) return;
      if (busyRef.current) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords)?.pos;
        if (pos !== undefined && pos !== null) {
          const selection = TextSelection.create(view.state.doc, pos);
          view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
        }
      });

      if (attachmentFiles.length) await uploadAttachments(attachmentFiles);
      if (!imageFiles.length) return;
      busyRef.current = true;
      setIsUploading(true);
      setUploadProgress(0);
      let completed = 0;

      const markdownChunks: string[] = [];
      try {
        for (const file of imageFiles) {
          const image = await uploadImage(file, file.name);
          completed += 1;
          setUploadProgress(Math.round((completed / imageFiles.length) * 100));
          const alt = escapeMarkdownAlt(file.name);
          markdownChunks.push(`![${alt}](${image.url})`);
        }

        editor.action(insert(markdownChunks.join('\n\n')));
      } catch (error) {
        console.error('Image encoding or upload failed', error);
        window.alert(error instanceof Error ? error.message : 'Image upload failed.');
      } finally {
        busyRef.current = false;
        setIsUploading(false);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('dragover', handleDragOver);
    container?.addEventListener('drop', handleDrop, true);

    return () => {
      container?.removeEventListener('dragover', handleDragOver);
      container?.removeEventListener('drop', handleDrop, true);
      crepe.destroy();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array: only run on mount

  return (
    <div className="relative min-h-[500px]">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 mb-3 text-sm dark:border-slate-700">
        <button type="button" disabled={!isReady || isUploading} onClick={() => fileInputRef.current?.click()} className="rounded-lg border px-3 py-2 disabled:opacity-50">上传附件</button>
        <button type="button" disabled={!isReady || isUploading} onClick={insertLinkCard} className="rounded-lg border px-3 py-2 disabled:opacity-50">插入链接卡片</button>
        <span className="text-xs text-slate-500">支持拖入文件 · 单个附件最大 100 MB</span>
        <input ref={fileInputRef} type="file" multiple hidden onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void uploadAttachments(files); }} />
      </div>
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/70 text-sm text-indigo-500">
          Initializing editor…
        </div>
      )}
      {isUploading && (
        <div className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-indigo-200 bg-white/90 px-3 py-2 text-xs text-indigo-600 shadow">
          <div className="mb-1 flex items-center justify-between">
            <span>正在上传文件…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-indigo-100">
            <div
              className="h-full rounded bg-indigo-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      <div ref={containerRef} className="crepe-editor" data-ready={isReady} />
    </div>
  );
};
