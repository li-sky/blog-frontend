import { resourceCardPlugins, insertResourceCard } from './resourceCardPlugin';
import { commandsCtx } from '@milkdown/core';
import { clearTextInCurrentBlockCommand, toggleStrongCommand, wrapInBulletListCommand, wrapInHeadingCommand } from '@milkdown/preset-commonmark';
import { useEffect, useId, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/prose/state';
import { insert } from '@milkdown/utils';
import { api } from '../services/api';
import { encodeImageVariants } from '../services/imageVariants';
import { editorPalette } from '../services/editorPalette';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './crepe-theme.css';

interface CrepeEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

export interface CrepeEditorHandle { getMarkdown: () => string; focus: () => void; }
export const CrepeEditor = forwardRef<CrepeEditorHandle, CrepeEditorProps>(({ value, onChange, onBusyChange }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);
  const readyRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const lastMarkdownRef = useRef(value);
  const initialSourceRef = useRef(value);
  const initialCanonicalRef = useRef<string | null>(null);
  const sourceOutput = (markdown: string) => markdown === initialCanonicalRef.current ? initialSourceRef.current : markdown;
  const [moreOpen,setMoreOpen] = useState(false);
  const moreId = useId();
  const toolsRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [initializationError, setInitializationError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { onBusyChange?.(isUploading); return () => onBusyChange?.(false); }, [isUploading,onBusyChange]);
  useEffect(() => {
    if (!moreOpen) return;
    const closeOutside = (event: PointerEvent) => { if (event.target instanceof Node && !toolsRef.current?.contains(event.target)) setMoreOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [moreOpen]);
  useImperativeHandle(ref, () => ({ getMarkdown: () => readyRef.current && crepeRef.current ? sourceOutput(crepeRef.current.getMarkdown()) : lastMarkdownRef.current, focus: () => readyRef.current && crepeRef.current?.editor.action(ctx => ctx.get(editorViewCtx).focus()) }), []);
  const emit = (raw: string) => { const markdown = sourceOutput(raw); if (markdown !== lastMarkdownRef.current) { lastMarkdownRef.current = markdown; changeRef.current(markdown); } };
  const uploadPictures = async (files: File[]) => {
    const editor = crepeRef.current?.editor; if (!editor || busyRef.current || !files.length) return;
    busyRef.current = true; setIsUploading(true); setUploadProgress(0);
    try {
      for (let index=0; index<files.length; index++) {
        const result=await uploadImage(files[index],files[index].name);
        if (crepeRef.current?.editor !== editor) return;
        editor.action(insert(`![${escapeMarkdownAlt(files[index].name)}](${result.url})`));
        setUploadProgress(Math.round((index+1)/files.length*100));
      }
    } catch(error) { if (crepeRef.current?.editor === editor) window.alert(error instanceof Error ? error.message : '图片上传失败'); }
    finally { if (crepeRef.current?.editor === editor) { busyRef.current=false; setIsUploading(false); } }
  };
  const runMobile = (kind: 'link'|'bold'|'heading'|'list') => {
    crepeRef.current?.editor.action(ctx => {
      const commands=ctx.get(commandsCtx);
      if (kind==='link') insertResourceCard(ctx,{kind:'link'});
      if (kind==='bold') commands.call(toggleStrongCommand.key);
      if (kind==='heading') commands.call(wrapInHeadingCommand.key,2);
      if (kind==='list') commands.call(wrapInBulletListCommand.key);
      ctx.get(editorViewCtx).focus();
    }); setMoreOpen(false);
  };
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
        if (crepeRef.current?.editor !== editor) return;
        editor.action(ctx => insertResourceCard(ctx, { kind: 'file', name: file.name, url: file.url, size: file.size }));
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }
    } catch (error) {
      if (crepeRef.current?.editor === editor) window.alert(error instanceof Error ? error.message : '文件上传失败');
    } finally { if (crepeRef.current?.editor === editor) { busyRef.current = false; setIsUploading(false); } }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed=false;
    // StrictMode can start a second effect before the first asynchronous create
    // finishes. Give each instance its own host so a late create stays detached.
    const host = document.createElement('div');
    containerRef.current.append(host);

    const crepe = new Crepe({
      root: host,
      defaultValue: value || '',
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: { theme: editorPalette },
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
              },
            });
          },
        },
        [Crepe.Feature.ImageBlock]: {
          onUpload: async (file: File) => {
            busyRef.current=true; setIsUploading(true);
            try { return (await uploadImage(file)).url; }
            finally { if (!disposed) { busyRef.current=false; setIsUploading(false); } }
          },
        },
      },
    });

    crepe.editor.use(resourceCardPlugins);
    crepeRef.current = crepe;

    crepe.on((listener) =>
      listener.markdownUpdated((_, markdown) => {
        if (!disposed) emit(markdown);
      })
    );

    crepe
      .create()
      .then(() => {
        if (disposed) return;
        crepe.editor.action(ctx => {
          const dom = ctx.get(editorViewCtx).dom;
          dom.setAttribute('role', 'textbox');
          dom.setAttribute('aria-label', '文章正文');
          dom.setAttribute('aria-multiline', 'true');
        });
        readyRef.current=true;
        initialCanonicalRef.current=crepe.getMarkdown();
        lastMarkdownRef.current=initialSourceRef.current;
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize Crepe editor', err);
        if (!disposed) setInitializationError(true);
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
      if (!imageFiles.length || disposed) return;
      busyRef.current = true;
      setIsUploading(true);
      setUploadProgress(0);
      let completed = 0;

      const markdownChunks: string[] = [];
      try {
        for (const file of imageFiles) {
          const image = await uploadImage(file, file.name);
          if (disposed) return;
          completed += 1;
          setUploadProgress(Math.round((completed / imageFiles.length) * 100));
          const alt = escapeMarkdownAlt(file.name);
          markdownChunks.push(`![${alt}](${image.url})`);
        }

        if (crepeRef.current?.editor !== editor) return;
        editor.action(insert(markdownChunks.join('\n\n')));
      } catch (error) {
        console.error('Image encoding or upload failed', error);
        if (!disposed) window.alert(error instanceof Error ? error.message : 'Image upload failed.');
      } finally {
        if (!disposed) { busyRef.current = false; setIsUploading(false); }
      }
    };

    const container = containerRef.current;
    container?.addEventListener('dragover', handleDragOver);
    container?.addEventListener('drop', handleDrop, true);

    return () => {
      container?.removeEventListener('dragover', handleDragOver);
      container?.removeEventListener('drop', handleDrop, true);
      disposed=true; readyRef.current=false;
      crepeRef.current=null;
      host.remove();
      void crepe.destroy().catch(error => console.error('Failed to destroy Crepe editor', error));
    };
  }, []); // Empty dependency array: only run on mount

  return (
    <div className="crepe-editor-wrap relative min-h-[320px]" onBlur={() => {
      // Flush serialized content before a nearby Save button can use stale listener state.
      if (isReady && crepeRef.current) emit(crepeRef.current.getMarkdown());
    }}>
      <input ref={fileInputRef} type="file" multiple hidden onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void uploadAttachments(files); }} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={event=>{const files=Array.from(event.target.files || []);event.target.value='';void uploadPictures(files);}} />
      <div ref={toolsRef} className="crepe-mobile-tools" role="group" aria-label="正文插入工具" onMouseDown={event=>event.preventDefault()} onKeyDown={event=>{if(event.key==='Escape' && moreOpen){event.preventDefault();event.stopPropagation();setMoreOpen(false);moreButtonRef.current?.focus();}}}>
        <button type="button" disabled={!isReady || isUploading} onClick={()=>imageInputRef.current?.click()}>图片</button>
        <button type="button" disabled={!isReady || isUploading} onClick={()=>fileInputRef.current?.click()}>附件</button>
        <button type="button" disabled={!isReady || isUploading} onClick={()=>runMobile('link')}>链接卡片</button>
        <button ref={moreButtonRef} type="button" aria-expanded={moreOpen} aria-controls={moreId} disabled={!isReady || isUploading} onClick={()=>setMoreOpen(open=>!open)}>更多</button>
        {moreOpen && <div id={moreId} className="crepe-mobile-more"><button type="button" disabled={isUploading} onClick={()=>runMobile('bold')}>粗体</button><button type="button" disabled={isUploading} onClick={()=>runMobile('heading')}>二级标题</button><button type="button" disabled={isUploading} onClick={()=>runMobile('list')}>列表</button></div>}
      </div>
      {!isReady && (
        <div role={initializationError ? 'alert' : 'status'} className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-dashed border-accent-200 bg-surface/70 text-sm text-accent-500">
          {initializationError ? '编辑器初始化失败，请返回文章列表后重试。' : 'Initializing editor…'}
        </div>
      )}
      {isUploading && (
        <div role="status" className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-accent-200 bg-surface/90 px-3 py-2 text-xs text-accent-600 shadow">
          <div className="mb-1 flex items-center justify-between">
            <span>正在上传文件…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-accent-100">
            <div
              className="h-full rounded bg-accent-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      <div ref={containerRef} className="crepe-editor" data-ready={isReady} />
    </div>
  );
});
