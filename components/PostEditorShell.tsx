import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Bold, ChevronDown, ChevronRight, Code, Code2, Eye, Heading2, ImagePlus, Italic, Link2, List, Minus, Paperclip, Pilcrow, Plus, Quote, RotateCcw, Save, Sigma, Strikethrough, Table2 } from 'lucide-react';
import { CrepeEditor, type CrepeEditorHandle, type EditorInsertKind, type EditorSelectionState } from './CrepeEditor';
import { EditorSheet } from './EditorSheet';
import { EditorPreview } from './EditorPreview';
import { EditorSelectionTools } from './EditorSelectionTools';
import './post-editor-shell.css';

export interface PostEditorShellProps {
  title: string; summary: string; content: string; editorKey: number;
  registerContentReader?: (reader: (() => string) | null) => void;
  onTitleChange: (value: string) => void; onSummaryChange: (value: string) => void; onContentChange: (value: string) => void;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'; statusMessage?: string;
  onSave: () => void; onPublish: () => void; onDiscard: () => void; onBack: () => void; onReload?: () => void;
  isPublished: boolean; hasUnpublishedChanges: boolean; isBusy: boolean;
  draftUpdatedAt?: string; publishedAt?: string; publishedUpdatedAt?: string;
}

type Sheet = 'insert' | 'format' | 'advanced' | 'selection-link';
const insertItems = [
  { kind: 'image', label: '图片', icon: ImagePlus }, { kind: 'attachment', label: '附件', icon: Paperclip },
  { kind: 'link', label: '链接卡片', icon: Link2 }, { kind: 'heading', label: '标题', icon: Heading2 },
  { kind: 'list', label: '列表', icon: List }, { kind: 'quote', label: '引用', icon: Quote },
] as const;

export function PostEditorShell(props: PostEditorShellProps) {
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewBody, setPreviewBody] = useState(props.content);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryId = useId();
  const [mobile, setMobile] = useState(() => matchMedia('(max-width:767px)').matches);
  const [inputFocused, setInputFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [toolsFocused, setToolsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(!navigator.onLine);
  const [selection, setSelection] = useState<EditorSelectionState>({ hasSelection: false, bold: false, italic: false, strikethrough: false, inlineCode: false, inlineMath: false });
  const [href, setHref] = useState('');
  const [linkError, setLinkError] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<CrepeEditorHandle>(null);
  const viewportRef = useRef<HTMLDialogElement>(null);
  const focusFrame = useRef(0);
  const previousEditorKey = useRef(props.editorKey);
  const latestContentRef = useRef(props.content); latestContentRef.current = props.content;
  const busy = props.isBusy || uploading;
  const offline = networkOffline;
  const conflicted = props.saveStatus === 'conflict';
  const select = useCallback((next: EditorSelectionState) => setSelection(current =>
    current.hasSelection === next.hasSelection && current.bold === next.bold && current.italic === next.italic
      && current.strikethrough === next.strikethrough && current.inlineCode === next.inlineCode && current.inlineMath === next.inlineMath ? current : next), []);

  useEffect(() => {
    const dialog = viewportRef.current!;
    dialog.showModal();
    return () => { cancelAnimationFrame(focusFrame.current); dialog.close(); };
  }, []);
  useEffect(() => {
    const update = () => setNetworkOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    const query = matchMedia('(max-width:767px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (previousEditorKey.current === props.editorKey) return;
    previousEditorKey.current = props.editorKey;
    setPreview(false); setSheet(null);
  }, [props.editorKey]);
  useEffect(() => {
    props.registerContentReader?.(() => editorRef.current?.getMarkdown() ?? latestContentRef.current);
    return () => props.registerContentReader?.(null);
  }, [props.registerContentReader]);
  useEffect(() => {
    const el = titleRef.current;
    if (el && !preview) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [props.title, preview]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const el = viewportRef.current;
      if (!el) return;
      // Pinch zoom must not be interpreted as the on-screen keyboard.
      const zoomed = Math.abs(viewport.scale - 1) > .05;
      setKeyboardVisible(!zoomed && window.innerHeight - viewport.height > 120);
      el.style.setProperty('--editor-viewport-height', `${viewport.height}px`);
      el.style.setProperty('--editor-viewport-top', `${viewport.offsetTop}px`);
    };
    update(); viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); window.removeEventListener('orientationchange', update); };
  }, []);

  const syncContent = () => {
    const value = editorRef.current?.getMarkdown() ?? props.content;
    if (value !== props.content) props.onContentChange(value);
    return value;
  };
  const run = (action: () => void) => { syncContent(); action(); };
  const openSheet = (next: Sheet) => {
    editorRef.current?.rememberSelection();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setSheet(next); setLinkError('');
    setToolsFocused(false);
  };
  const focusEditor = () => requestAnimationFrame(() => editorRef.current?.focus());
  const insert = (kind: EditorInsertKind) => {
    setSheet(null); editorRef.current?.insert(kind);
    if (kind !== 'image' && kind !== 'attachment') focusEditor();
  };
  const enterPreview = () => {
    setPreviewBody(syncContent());
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setPreview(true); setBodyFocused(false); setToolsFocused(false); setInputFocused(false);
  };
  const error = offline ? '网络不可用' : conflicted ? '草稿版本冲突' : props.saveStatus === 'error' ? '保存失败'
    : props.statusMessage && !/成功|已放弃/.test(props.statusMessage) ? props.statusMessage : '';
  const publishDisabled = busy || offline || conflicted || !props.title.trim() || !previewBody.trim()
    || (props.isPublished && !props.hasUnpublishedChanges && props.saveStatus !== 'dirty');

  return <dialog ref={viewportRef} className="post-editor-shell" aria-label="文章编辑器" data-input-active={inputFocused || keyboardVisible}
    {...{ closedby: 'closerequest' }} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); if (preview) setPreview(false); else if (!busy) run(props.onBack); }}
    onFocusCapture={event => { if ((event.target as HTMLElement).matches('textarea,input,[contenteditable="true"]')) setInputFocused(true); }}
    onBlurCapture={() => { cancelAnimationFrame(focusFrame.current); focusFrame.current = requestAnimationFrame(() => {
      setInputFocused(!!document.activeElement?.matches('textarea,input,[contenteditable="true"]'));
    }); }}>
    <header className="post-editor-topbar">
      <button type="button" className="post-editor-icon" aria-label={preview ? '返回编辑' : '返回文章列表'} disabled={busy}
        onClick={() => preview ? setPreview(false) : run(props.onBack)}><ArrowLeft size={20} aria-hidden="true" /></button>
    </header>
    {error && <div className="post-editor-notice" role="alert"><span>{error}</span>
      {!offline && props.saveStatus === 'error' && <button type="button" disabled={busy} onClick={() => run(props.onSave)}><Save size={16} aria-hidden="true" />重试保存</button>}
      {conflicted && props.onReload && <button type="button" disabled={busy} onClick={props.onReload}>载入服务器草稿</button>}
    </div>}
    <div className="post-editor-scroll" hidden={preview}>
      <div className="post-editor-document">
        <textarea ref={titleRef} rows={1} aria-label="文章标题" placeholder="文章标题" disabled={props.isBusy} value={props.title}
          onChange={event => props.onTitleChange(event.target.value)} className="post-editor-title" />
        <section className="post-editor-summary">
          <button type="button" aria-expanded={summaryOpen} aria-controls={summaryId} disabled={props.isBusy} onClick={() => setSummaryOpen(open => !open)}>
            {summaryOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}摘要
          </button>
          {summaryOpen && <textarea id={summaryId} rows={3} aria-label="文章摘要" placeholder="摘要" disabled={props.isBusy} value={props.summary} onChange={event => props.onSummaryChange(event.target.value)} />}
        </section>
        <div inert={props.isBusy}><CrepeEditor ref={editorRef} key={props.editorKey} value={props.content} onChange={props.onContentChange}
          onBusyChange={setUploading} onFocusChange={setBodyFocused} onSelectionChange={select} onReadyChange={setReady} /></div>
      </div>
    </div>
    {preview && <div className="post-editor-scroll"><article className="post-editor-document post-editor-preview prose dark:prose-invert">
      <h1>{props.title}</h1><EditorPreview content={previewBody} />
    </article></div>}
    {mobile && !preview && !sheet && (bodyFocused || toolsFocused) && selection.hasSelection && !busy && <EditorSelectionTools selection={selection}
      onFormat={kind => editorRef.current?.format(kind)} onLink={() => { setHref(''); openSheet('selection-link'); }} onFocusChange={setToolsFocused} />}
    {preview
      ? <footer className="post-editor-actions">
        <button type="button" className="post-editor-discard" disabled={busy || conflicted || !props.hasUnpublishedChanges} onClick={props.onDiscard}><RotateCcw size={17} aria-hidden="true" />放弃修改</button>
        <button type="button" className="post-editor-publish" disabled={publishDisabled} onClick={() => run(props.onPublish)}>{props.isPublished ? '更新发布' : '发布'}</button>
      </footer>
      : <footer className="post-editor-actions post-editor-edit-actions" hidden={mobile && selection.hasSelection && (bodyFocused || toolsFocused)}>
        <button type="button" className="post-editor-mobile-action" disabled={busy || !ready} onClick={() => openSheet('insert')}><Plus size={19} aria-hidden="true" />插入</button>
        <button type="button" className="post-editor-mobile-action" disabled={busy || !ready} onClick={() => openSheet('format')}>Aa 格式</button>
        <button type="button" className="post-editor-publish" disabled={busy || !ready} onClick={enterPreview}><Eye size={18} aria-hidden="true" />预览</button>
      </footer>}
    {sheet && <EditorSheet key={sheet} label={{ insert: '插入内容', format: '文字格式', advanced: '更多内容', 'selection-link': '选区链接' }[sheet]} onClose={() => setSheet(null)}>
      {sheet === 'insert' && <div className="editor-sheet-grid">{insertItems.map(item => <button key={item.kind} type="button" disabled={busy} onClick={() => insert(item.kind)}><item.icon size={23} aria-hidden="true" /><span>{item.label}</span></button>)}</div>}
      {sheet === 'advanced' && <div className="editor-sheet-grid">
        <button type="button" onClick={() => insert('code')}><Code2 size={23} aria-hidden="true" />代码块</button>
        <button type="button" onClick={() => insert('table')}><Table2 size={23} aria-hidden="true" />表格</button>
        <button type="button" onClick={() => insert('math')}><Sigma size={23} aria-hidden="true" />公式</button>
        <button type="button" onClick={() => insert('divider')}><Minus size={23} aria-hidden="true" />分割线</button>
      </div>}
      {sheet === 'format' && <div className="editor-sheet-grid">
        <button type="button" onClick={() => insert('paragraph')}><Pilcrow size={22} aria-hidden="true" />正文</button>
        {insertItems.filter(item => ['heading', 'list', 'quote'].includes(item.kind)).map(item => <button key={item.kind} type="button" onClick={() => insert(item.kind)}><item.icon size={22} aria-hidden="true" />{item.label}</button>)}
        <button type="button" aria-pressed={selection.bold} onClick={() => { setSheet(null); editorRef.current?.format('bold'); focusEditor(); }}><Bold size={22} aria-hidden="true" />粗体</button>
        <button type="button" aria-pressed={selection.italic} onClick={() => { setSheet(null); editorRef.current?.format('italic'); focusEditor(); }}><Italic size={22} aria-hidden="true" />斜体</button>
        <button type="button" aria-pressed={selection.strikethrough} onClick={() => { setSheet(null); editorRef.current?.format('strikethrough'); focusEditor(); }}><Strikethrough size={22} aria-hidden="true" />删除线</button>
        <button type="button" aria-pressed={selection.inlineCode} onClick={() => { setSheet(null); editorRef.current?.format('inlineCode'); focusEditor(); }}><Code size={22} aria-hidden="true" />行内代码</button>
        <button type="button" aria-pressed={selection.inlineMath} onClick={() => { setSheet(null); editorRef.current?.format('inlineMath'); focusEditor(); }}><Sigma size={22} aria-hidden="true" />行内公式</button>
      </div>}
      {(sheet === 'insert' || sheet === 'format') && <button type="button" className="editor-sheet-more" onClick={() => setSheet('advanced')}>更多<ChevronRight size={18} aria-hidden="true" /></button>}
      {sheet === 'selection-link' && <form className="editor-sheet-link" onSubmit={event => {
        event.preventDefault();
        let safe = false; try { safe = ['https:', 'http:'].includes(new URL(href).protocol); } catch { /* invalid URL */ }
        if (!safe) { setLinkError('请输入有效的 http 或 https 链接'); return; }
        setSheet(null); editorRef.current?.format('link', href); focusEditor();
      }}><label className="editor-sheet-field">链接地址<input type="url" inputMode="url" required aria-label="链接地址" placeholder="https://" value={href} onChange={event => setHref(event.target.value)} /></label>
        {linkError && <p role="alert">{linkError}</p>}<button className="editor-sheet-primary" type="submit">添加链接</button></form>}
    </EditorSheet>}
  </dialog>;
}
