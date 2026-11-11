import type { Image } from '../types';
import { APIError } from './api';
export interface ImageReference { postId: number; title: string; status: string; location?: string; }
export interface ImageReferences { items: ImageReference[]; total: number; }
const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
async function request(path: string, method = 'GET', body?: object) {
  const token=localStorage.getItem('token');
  const response=await fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  if (!response.ok) { const data=await response.json().catch(()=>({})); throw new APIError(response.status===409?'图片已被文章或草稿引用，不能删除，请重新检查引用。':response.status===403?'当前账号没有管理这张图片的权限。':data.error || `请求失败（HTTP ${response.status}）`,response.status); }
  return response.status===204?null:response.json();
}
export const imageLibrary = {
  references: async (id: number): Promise<ImageReferences> => {
    const result=await request(`/images/${id}/references`);
    if (!Array.isArray(result?.items) || !Number.isInteger(result?.total) || result.total<0) throw Error('无法核实图片引用，暂不能删除');
    return result;
  },
  remove: (id: number) => request(`/images/${id}`,'DELETE'),
};
export const imageSize = (bytes: number) => bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(1)} MB`;
export const imageMarkdown = (name: string,url: string) => `![${name.replace(/[\\\[\]]/g,'\\$&').replace(/[\r\n]/g,' ')}](<${url.replace(/</g,'%3C').replace(/>/g,'%3E')}>)`;

export function imageOriginalURL(image: Image) {
  const url=typeof image.url==='string'?image.url.trim():'';
  if ((/^https?:\/\//i.test(url)||/^\/(?!\/)/.test(url)) && !url.includes('/undefined')) return url;
  const path=(image.storagePath||image.filename||'').replaceAll('\\','/').replace(/^\/+/, '').replace(/^uploads\//,'');
  return path && path!=='undefined'?`/images/${path.split('/').map(encodeURIComponent).join('/')}`:'';
}
