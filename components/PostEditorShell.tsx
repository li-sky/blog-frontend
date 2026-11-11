import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Cloud, Save, Send, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { CrepeEditor, type CrepeEditorHandle } from './CrepeEditor';
import './post-editor-shell.css';

export interface PostEditorShellProps {
  title: string; summary: string; content: string; editorKey: number;
  registerContentReader?: (reader: (() => string) | null) => void;
  onTitleChange: (value: string) => void; onSummaryChange: (value: string) => void; onContentChange: (value: string) => void;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'; statusMessage?: string;
  onSave: () => void; onPublish: () => void; onDiscard: () => void; onBack: () => void; onDone?: () => void; onReload?: () => void;
  isPublished: boolean; hasUnpublishedChanges: boolean; isBusy: boolean;
  draftUpdatedAt?: string; publishedAt?: string; publishedUpdatedAt?: string;
}

export function PostEditorShell(props: PostEditorShellProps) {
  const [uploading,setUploading] = useState(false);
  const busy=props.isBusy || uploading;
  const [summaryOpen,setSummaryOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<CrepeEditorHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const conflicted = props.saveStatus === 'conflict';
  useEffect(() => { if (conflicted) noticeRef.current?.scrollIntoView({ block: 'start' }); }, [conflicted]);
  const latestContentRef = useRef(props.content); latestContentRef.current = props.content;
  useEffect(() => {
    props.registerContentReader?.(() => editorRef.current?.getMarkdown() ?? latestContentRef.current);
    return () => props.registerContentReader?.(null);
  }, [props.registerContentReader]);
  useEffect(() => { const el=titleRef.current; if (el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; } }, [props.title]);
  useEffect(() => {
    const viewport=window.visualViewport;
    if (!viewport) return;
    const update=()=> { const el=viewportRef.current; if (el) { el.style.setProperty('--editor-viewport-height',`${viewport.height}px`); el.style.setProperty('--editor-viewport-top',`${viewport.offsetTop}px`); } };
    update(); viewport.addEventListener('resize',update); viewport.addEventListener('scroll',update);
    return ()=> { viewport.removeEventListener('resize',update); viewport.removeEventListener('scroll',update); };
  },[]);
  const run = (action: () => void) => {
    const value=editorRef.current?.getMarkdown();
    if (value !== undefined && value !== props.content) props.onContentChange(value);
    action();
  };
  const label = props.statusMessage || ({ idle:'尚未修改',dirty:'有未保存修改',saving:'正在保存草稿…',saved:'草稿已保存',error:'保存失败，内容保留在本机',conflict:'草稿已在其他位置修改' })[props.saveStatus];
  return <div ref={viewportRef} className="post-editor-shell" role="region" aria-label="文章编辑器">
    <header className="post-editor-topbar">
      <button type="button" onClick={()=>run(props.onBack)} className="post-editor-back" aria-label="返回文章列表" disabled={busy}><ArrowLeft size={20}/><span>返回</span></button>
      <span className={`post-editor-save-state state-${props.saveStatus}`} role="status" aria-live="polite">{props.saveStatus==='saved'?<Check size={15}/>:<Cloud size={15}/>}<span>{label}</span></span>
      <button type="button" className="post-editor-done" onClick={()=>run(props.onDone || props.onBack)} disabled={busy}>完成</button>
    </header>
    <main className="post-editor-scroll">
      {(props.saveStatus==='error' || props.saveStatus==='conflict') && <div ref={noticeRef} className="post-editor-notice" role="alert"><p>{label}</p>{props.saveStatus==='conflict' && props.onReload && <button type="button" onClick={props.onReload}>载入服务器草稿</button>}</div>}
      <div className="post-editor-document">
        <textarea ref={titleRef} rows={1} aria-label="文章标题" placeholder="文章标题" disabled={props.isBusy} value={props.title} onChange={event=>props.onTitleChange(event.target.value)} className="post-editor-title" />
        <section className="post-editor-summary">
          <button type="button" aria-expanded={summaryOpen} onClick={()=>setSummaryOpen(open=>!open)}>{summaryOpen?<ChevronDown size={16}/>:<ChevronRight size={16}/>}摘要<span className="post-editor-summary-hint">{props.summary ? '已填写' : '可选'}</span></button>
          {summaryOpen && <textarea rows={3} aria-label="文章摘要" placeholder="简要介绍文章内容（可选）" disabled={props.isBusy} value={props.summary} onChange={event=>props.onSummaryChange(event.target.value)}/>}
        </section>
        <div inert={props.isBusy}><CrepeEditor onBusyChange={setUploading} ref={editorRef} key={props.editorKey} value={props.content} onChange={props.onContentChange}/></div>
      </div>
    </main>
    <footer className="post-editor-actions">
      <button type="button" className="post-editor-discard" onClick={props.onDiscard} disabled={busy || conflicted || !props.hasUnpublishedChanges}><RotateCcw size={17}/><span>放弃修改</span></button>
      <button type="button" onClick={()=>run(props.onSave)} disabled={busy || conflicted || props.saveStatus==='saving'}><Save size={17}/><span>保存草稿</span></button>
      <button type="button" className="post-editor-publish" onClick={()=>run(props.onPublish)} disabled={busy || conflicted || (props.isPublished && !props.hasUnpublishedChanges && props.saveStatus!=='dirty')}><Send size={17}/><span>{props.isPublished?'更新发布':'发布'}</span></button>
    </footer>
  </div>;
}
