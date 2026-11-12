import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Eye, Images, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { imageLibrary, imageMarkdown, imageSize, imageOriginalURL, type ImageReferences } from '../services/imageLibrary';
import { encodeImageVariants } from '../services/imageVariants';
import { PostImageViewer } from '../components/PostImageViewer';
import type { Image } from '../types';
import './image-management.css';

const PAGE_SIZE=24;
export function ImageManagement() {
  const navigate=useNavigate();
  const [allowed,setAllowed]=useState(false);
  const [items,setItems]=useState<Image[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [preview,setPreview]=useState<Image|null>(null);
  const [candidate,setCandidate]=useState<Image|null>(null);
  const [references,setReferences]=useState<ImageReferences|null>(null);
  const [checking,setChecking]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  const loadId=useRef(0);
  const liveRef=useRef(false);
  const uploadBusyRef=useRef(false);
  const deleteHeadingId=useId();
  const checkId=useRef(0);
  useEffect(()=>{ let live=true;liveRef.current=true; void api.auth.me().then(user=>{if(!live)return;if(!user.roles.includes('admin')){navigate('/');return;}setAllowed(true);}).catch(()=>{if(live)navigate('/login');});return()=>{live=false;liveRef.current=false;loadId.current++;checkId.current++;}; },[navigate]);
  const load=useCallback(async()=>{
    const id=++loadId.current;setLoading(true);setError('');
    try { const data=await api.images.list({limit:PAGE_SIZE,offset:page*PAGE_SIZE});if(id!==loadId.current)return;setItems(data.items);setTotal(data.total);if(page>0&&!data.items.length)setPage(p=>p-1); }
    catch(error){if(id===loadId.current)setError(error instanceof Error?error.message:'图片列表加载失败');}
    finally{if(id===loadId.current)setLoading(false);}
  },[page]);
  useEffect(()=>{if(allowed)void load();},[allowed,load]);
  useEffect(()=>{
    if(!candidate || !dialogRef.current)return;
    const dialog=dialogRef.current;
    if(cancelRef.current)cancelRef.current.autofocus=true;
    if(!dialog.open)dialog.showModal();
    return()=>dialog.close();
  },[candidate]);
  const closeDelete=()=>{if(deleting)return;checkId.current++;dialogRef.current?.close();setCandidate(null);setReferences(null);};
  const checkDelete=async(image:Image)=>{
    const id=++checkId.current;setCandidate(image);setReferences(null);setChecking(true);setError('');
    try{const refs=await imageLibrary.references(image.id);if(id===checkId.current)setReferences(refs);}
    catch(error){if(id===checkId.current)setError(error instanceof Error?error.message:'无法检查引用，暂不能删除');}
    finally{if(id===checkId.current)setChecking(false);}
  };
  const remove=async()=>{
    if(!candidate||!references||references.total>0||checking||deleting)return;
    setDeleting(true);setError('');
    try{await imageLibrary.remove(candidate.id);if(!liveRef.current)return;setNotice(`已删除 ${candidate.originalName}`);dialogRef.current?.close();setCandidate(null);setReferences(null);await load();}
    catch(error){if(!liveRef.current)return;setReferences(null);setError(error instanceof Error?error.message:'删除失败；图片可能已被引用，请重新检查。');}
    finally{if(liveRef.current)setDeleting(false);}
  };
  const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setNotice('已复制');}catch{setError('浏览器不允许复制，请检查剪贴板权限后重试。');}};
  const upload=async(files:File[])=>{
    if(uploadBusyRef.current||!files.length)return;uploadBusyRef.current=true;setUploading(true);setError('');setNotice('');const failures:string[]=[];let done=0;
    for(let i=0;i<files.length;i++){
      if(!liveRef.current){uploadBusyRef.current=false;return;}
      setProgress(`上传 ${i+1} / ${files.length}`);
      try{const variants=await encodeImageVariants(files[i]);if(!liveRef.current){uploadBusyRef.current=false;return;}await api.images.upload(files[i],files[i].name,variants);done++;}
      catch(error){failures.push(`${files[i].name}：${error instanceof Error?error.message:'上传失败'}`);}
    }
    uploadBusyRef.current=false;if(!liveRef.current)return;setUploading(false);setProgress('');setNotice(`已上传 ${done} 张图片`);if(failures.length)setError(failures.join('；'));if(page===0)await load();else setPage(0);
  };
  if(!allowed)return <p className="image-library-loading" role="status">正在验证权限…</p>;
  return <div className="image-library">
    <Link to="/admin" className="image-library-back"><ArrowLeft size={17}/>返回管理后台</Link>
    <header className="image-library-header"><div><h1><Images size={28}/>图片管理</h1><p>共 {total} 张图片 · 查看、复制和管理已上传图片</p></div><div className="image-library-header-actions"><button type="button" disabled={loading||uploading} onClick={()=>void load()}><RefreshCw size={17}/>刷新</button><button type="button" className="image-library-primary" disabled={uploading} onClick={()=>inputRef.current?.click()}>{uploading?<Loader2 size={17} className="motion-safe:animate-spin"/>:<Upload size={17}/>} {uploading?progress:'上传图片'}</button></div></header>
    <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void upload(files);}}/>
    {notice&&<p className="image-library-notice" role="status">{notice}</p>}
    {error&&!candidate&&<p className="image-library-error" role="alert">{error}</p>}
    {loading?<div className="image-library-loading" role="status"><Loader2 className="motion-safe:animate-spin"/>正在加载图片…</div>:items.length===0?<div className="image-library-empty">还没有上传图片。</div>:<div className="image-library-grid">{items.map(image=><article className="image-library-item" key={image.id}>
      <button type="button" className="image-library-thumbnail" aria-label={`预览 ${image.originalName}`} onClick={()=>setPreview(image)}><img src={image.webp600Url||imageOriginalURL(image)} alt={image.alt||image.originalName} loading="lazy" decoding="async" onError={event=>{if(!event.currentTarget.dataset.fallback){event.currentTarget.dataset.fallback='true';event.currentTarget.src=imageOriginalURL(image);}}}/><span><Eye size={17}/>预览</span></button>
      <div className="image-library-info"><h2 title={image.originalName}>{image.originalName}</h2><p>{image.width} × {image.height} · 原图 {imageSize(image.size)}</p><p>{image.mimeType} · {new Date(image.createdAt).toLocaleDateString('zh-CN')}</p><div className="image-library-item-actions"><button type="button" onClick={()=>void copy(imageOriginalURL(image))} aria-label={`复制 ${image.originalName} 的URL`}><Copy size={15}/>URL</button><button type="button" onClick={()=>void copy(imageMarkdown(image.alt||image.originalName,imageOriginalURL(image)))}>Markdown</button><button type="button" className="image-library-delete" onClick={()=>void checkDelete(image)} disabled={uploading} aria-label={`检查并删除 ${image.originalName}`}><Trash2 size={16}/></button></div></div>
    </article>)}</div>}
    {total>PAGE_SIZE&&<nav className="image-library-pagination" aria-label="图片分页"><button type="button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/>上一页</button><span>{page+1} / {Math.max(1,Math.ceil(total/PAGE_SIZE))}</span><button type="button" disabled={(page+1)*PAGE_SIZE>=total||loading} onClick={()=>setPage(p=>p+1)}>下一页<ChevronRight size={18}/></button></nav>}
    {preview&&<PostImageViewer previewSrc={preview.webpFullUrl||preview.webp1200Url||imageOriginalURL(preview)} originalSrc={imageOriginalURL(preview)} alt={preview.alt||preview.originalName} onClose={()=>setPreview(null)}/>}
    <dialog ref={dialogRef} aria-labelledby={deleteHeadingId} className="image-library-dialog" onCancel={event=>{event.preventDefault();closeDelete();}}><div className="image-library-dialog-heading"><h2 id={deleteHeadingId}>删除图片</h2><button type="button" aria-label="关闭删除确认" onClick={closeDelete} disabled={deleting}><X size={20}/></button></div><p className="image-library-name">{candidate?.originalName}</p>{checking?<p role="status">正在核实文章及草稿引用…</p>:references?.total?<><p>这张图片被 {references.total} 处文章或草稿引用，不能删除。请先移除引用。</p><ul>{references.items.map((reference,index)=><li key={`${reference.postId}-${index}`}><span>{reference.title||`文章 #${reference.postId}`}</span><small>{reference.location==='draft'?'编辑草稿':'已发布内容'}</small></li>)}</ul></>:references?<p>未发现文章或草稿引用。删除后原图及其变体无法恢复，请确认已留有需要的副本。</p>:null}{error&&<p className="image-library-error" role="alert">{error}</p>}<div className="image-library-dialog-actions">{error&&candidate&&<button type="button" disabled={checking||deleting} onClick={()=>void checkDelete(candidate)}>重新检查引用</button>}<button ref={cancelRef} type="button" onClick={closeDelete} disabled={deleting}>取消</button><button type="button" className="image-library-danger" disabled={checking||deleting||!references||references.total>0} onClick={()=>void remove()}>{deleting?'正在删除…':'确认删除'}</button></div></dialog>
  </div>;
}
