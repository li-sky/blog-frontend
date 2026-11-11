import { resourceCardPlugins, insertResourceCard } from './resourceCardPlugin';
import { commandsCtx } from '@milkdown/core';
import { clearTextInCurrentBlockCommand } from '@milkdown/preset-commonmark';
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
        editor.action(ctx => insertResourceCard(ctx, { kind: 'file', name: file.name, url: file.url, size: file.size }));
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '文件上传失败');
    } finally { busyRef.current = false; setIsUploading(false); }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue: value || '',
      featureConfigs: {
        [Crepe.Feature.BlockEdit]: {
          buildMenu: (builder) => {
            const resources = builder.addGroup('resources', '文件与链接');
            resources.addItem('attachment', {
              label: '上传附件 / Upload file',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/></svg>',
              onRun: (ctx) => {
                if (busyRef.current) return;
                ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key);
                fileInputRef.current?.click();
              },
            });
            resources.addItem('link-card', {
              label: '链接卡片 / Link card',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h10M7 14h6"/></svg>',
              onRun: (ctx) => {
                ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key);
                insertResourceCard(ctx, { kind: 'link' });
                // The menu restores focus when closing; focus the inline form after it closes.
                setTimeout(() => containerRef.current?.querySelector<HTMLTextAreaElement>('.editor-resource-card-title')?.focus(), 0);
              },
            });
          },
        },
        [Crepe.Feature.ImageBlock]: {
          onUpload: async (file: File) => {
            const image = await uploadImage(file);
            return image.url;
          },
        },
      },
    });

    crepe.editor.use(resourceCardPlugins);
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
    <div className="relative min-h-[500px]" onBlur={() => {
      // Flush serialized content before a nearby Save button can use stale listener state.
      if (isReady && crepeRef.current) onChange(crepeRef.current.getMarkdown());
    }}>
      <input ref={fileInputRef} type="file" multiple hidden onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void uploadAttachments(files); }} />
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
