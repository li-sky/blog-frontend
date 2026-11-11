import { expect, test } from 'bun:test';
import { DraftSaveCoordinator } from './draftSaveCoordinator';
const content = body => ({ title:'标题', summary:'', body });
const dto = (body, version=0, postId=1) => ({...content(body),postId,version,updatedAt:null,status:'published',publishedAt:'2026-11-01T00:00:00Z',publishedUpdatedAt:null,hasUnpublishedChanges:true});
const deferred = () => { let resolve,reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}; };

test('unchanged blur is not dirty and sends no request', async()=>{
 let calls=0; const saved=dto('original');const session=new DraftSaveCoordinator({create:async()=>{calls++;return saved},save:async()=>{calls++;return saved}},content('original'),saved,'key');
 session.update(content('original'));await session.flush();expect(calls).toBe(0);expect(session.state.dirty).toBe(false);
});

test('an old response cannot acknowledge newer text; writes are serialized with returned version',async()=>{
 const first=deferred();const calls=[];let active=0,max=0;
 const session=new DraftSaveCoordinator({create:async()=>{throw Error('not new')},save:async(id,value,version)=>{
  calls.push({id,value,version});active++;max=Math.max(max,active);const result=calls.length===1?await first.promise:dto(value.body,version+1);active--;return result;
 }},content('initial'),dto('initial',7),'key');
 session.update(content('first'));const flushing=session.flush();session.update(content('latest'));expect(session.flush()).toBe(flushing);
 first.resolve(dto('first',8));await flushing;
 expect(calls.map(call=>[call.value.body,call.version])).toEqual([['first',7],['latest',8]]);expect(max).toBe(1);expect(session.state.dirty).toBe(false);expect(session.state.content.body).toBe('latest');
});

test('new post creates once while typing, then saves newer edits to the returned ID',async()=>{
 const creating=deferred();let creates=0;const writes=[];
 const session=new DraftSaveCoordinator({create:async(value,key)=>{creates++;expect(key).toBe('stable-create');return creating.promise},save:async(id,value,version)=>{writes.push([id,value.body,version]);return dto(value.body,version+1,id)}},content(''),null,'stable-create');
 session.update(content('first'));const saving=session.flush();session.update(content('second'));creating.resolve(dto('first',1,42));await saving;
 expect(creates).toBe(1);expect(writes).toEqual([[42,'second',1]]);expect(session.state.id).toBe(42);
});

test('lost create response retries the same idempotency key and reconciles older server content',async()=>{
 let calls=0;const keys=[];const saves=[];
 const session=new DraftSaveCoordinator({create:async(value,key)=>{keys.push(key);if(++calls===1)throw Error('network lost after server commit');return dto('first',1,77)},save:async(id,value,version)=>{saves.push(value.body);return dto(value.body,version+1,id)}},content(''),null,'idempotent');
 session.update(content('first'));await expect(session.flush()).rejects.toThrow('network');session.update(content('second'));await session.flush();
 expect(keys).toEqual(['idempotent','idempotent']);expect(saves).toEqual(['second']);expect(session.state.id).toBe(77);expect(session.state.dirty).toBe(false);
});

test('409 preserves local text and version and stops automatic retries',async()=>{
 let calls=0;const conflict=Object.assign(Error('conflict'),{status:409});
 const session=new DraftSaveCoordinator({create:async()=>{throw Error('not new')},save:async()=>{calls++;throw conflict}},content('server'),dto('server',3),'key');
 session.update(content('mine'));await expect(session.flush()).rejects.toThrow('conflict');session.update(content('still mine'));await expect(session.flush()).rejects.toThrow('conflict');
 expect(calls).toBe(1);expect(session.state.status).toBe('conflict');expect(session.state.version).toBe(3);expect(session.state.content.body).toBe('still mine');expect(session.state.dirty).toBe(true);
});

test('publish barrier waits for the last queued snapshot; reset uses the published version',async()=>{
 const network=deferred();const session=new DraftSaveCoordinator({create:async()=>{throw Error()},save:async(id,value,version)=>value.body==='a'?network.promise:dto(value.body,version+1)},content('base'),dto('base',1),'key');
 session.update(content('a'));const autosave=session.flush();session.update(content('last-character'));const barrier=session.flush();network.resolve(dto('a',2));const saved=await barrier;
 expect(saved.body).toBe('last-character');expect(saved.version).toBe(3);expect(session.state.dirty).toBe(false);await autosave;
 session.reset({...saved,version:4,hasUnpublishedChanges:false});expect(session.state.version).toBe(4);expect(session.state.dirty).toBe(false);
});

test('idempotent create replay cannot overwrite a draft another editor advanced',async()=>{
 let writes=0;
 const session=new DraftSaveCoordinator({create:async()=>dto('other editor',3,88),save:async()=>{writes++;throw Error('must not write')}},content(''),null,'shared-key');
 session.update(content('my local copy'));await expect(session.flush()).rejects.toThrow('another editor');
 expect(writes).toBe(0);expect(session.state.status).toBe('conflict');expect(session.state.content.body).toBe('my local copy');expect(session.state.id).toBe(88);expect(session.state.dirty).toBe(true);
});
