import React, { useEffect, useRef, useState } from 'react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import { insert } from '@milkdown/utils';
import { api } from '../services/api';
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
  const [isReady, setIsReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const escapeMarkdownAlt = (text: string) => text.replace(/[\[\]()]/g, '\\$&');

  useEffect(() => {
    if (!containerRef.current) return;

    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue: value || '',
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {
          onUpload: async (file: File) => {
            const image = await api.images.upload(file);
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
      if (!imageFiles.length) return;

      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords)?.pos;
        if (pos !== undefined && pos !== null) {
          const selection = TextSelection.create(view.state.doc, pos);
          view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
        }
      });

      setIsUploading(true);
      setUploadProgress(0);
      let completed = 0;

      const markdownChunks: string[] = [];
      for (const file of imageFiles) {
        const image = await api.images.upload(file, file.name);
        completed += 1;
        setUploadProgress(Math.round((completed / imageFiles.length) * 100));
        const alt = escapeMarkdownAlt(file.name);
        markdownChunks.push(`![${alt}](${image.url})`);
      }

      editor.action(insert(markdownChunks.join('\n\n')));
      setIsUploading(false);
    };

    const container = containerRef.current;
    container?.addEventListener('dragover', handleDragOver);
    container?.addEventListener('drop', handleDrop);

    return () => {
      container?.removeEventListener('dragover', handleDragOver);
      container?.removeEventListener('drop', handleDrop);
      crepe.destroy();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array: only run on mount

  return (
    <div className="relative min-h-[500px]">
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/70 text-sm text-indigo-500">
          Initializing editor…
        </div>
      )}
      {isUploading && (
        <div className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-indigo-200 bg-white/90 px-3 py-2 text-xs text-indigo-600 shadow">
          <div className="mb-1 flex items-center justify-between">
            <span>Uploading images…</span>
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
