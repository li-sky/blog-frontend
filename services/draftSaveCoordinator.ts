import type { DraftContent, PostDraft } from '../types';

export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
export interface SaveState {
  id: number | null;
  version: number;
  content: DraftContent;
  dirty: boolean;
  status: DraftSaveStatus;
  error: unknown;
  draft: PostDraft | null;
  requestId: string;
}
export interface DraftTransport {
  create(content: DraftContent, requestId: string): Promise<PostDraft>;
  save(id: number, content: DraftContent, version: number): Promise<PostDraft>;
}
export const sameContent = (a: DraftContent, b: DraftContent) => a.title === b.title && a.summary === b.summary && a.body === b.body;
export const draftContent = (draft: DraftContent): DraftContent => ({ title: draft.title, summary: draft.summary, body: draft.body });

// One writer per editor session. A response acknowledges only the snapshot it sent.
export class DraftSaveCoordinator {
  private current: DraftContent;
  private generation = 0;
  private savedGeneration = 0;
  private running: Promise<PostDraft | null> | null = null;
  private disposed = false;
  private currentStatus: DraftSaveStatus = 'idle';
  private lastError: unknown = null;
  private currentDraft: PostDraft | null;
  private currentId: number | null;
  private currentVersion: number;
  constructor(private transport: DraftTransport, initial: DraftContent, draft: PostDraft | null, public readonly requestId: string, private notify: (state: SaveState) => void = () => {}) {
    this.current = draftContent(initial);
    this.currentDraft = draft; this.currentId = draft?.postId ?? null; this.currentVersion = draft?.version ?? 0;
  }
  get state(): SaveState {
    return { id: this.currentId, version: this.currentVersion, content: draftContent(this.current), dirty: this.generation !== this.savedGeneration,
      status: this.currentStatus, error: this.lastError, draft: this.currentDraft, requestId: this.requestId };
  }
  private emit() { if (!this.disposed) this.notify(this.state); }
  update(next: DraftContent) {
    if (this.disposed || sameContent(next, this.current)) return;
    this.current = draftContent(next); this.generation++;
    if (!this.running && this.currentStatus !== 'conflict') this.currentStatus = 'dirty';
    this.emit();
  }
  flush(): Promise<PostDraft | null> {
    if (this.disposed) return Promise.reject(new Error('Editor session closed'));
    if (this.currentStatus === 'conflict') return Promise.reject(this.lastError);
    if (this.running) return this.running;
    if (this.generation === this.savedGeneration) return Promise.resolve(this.currentDraft);
    this.currentStatus = 'saving'; this.lastError = null; this.emit();
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain(): Promise<PostDraft | null> {
    try {
      while (this.generation !== this.savedGeneration) {
        const generation = this.generation;
        const snapshot = draftContent(this.current);
        const created = this.currentId === null;
        const draft = created
          ? await this.transport.create(snapshot, this.requestId)
          : await this.transport.save(this.currentId!, snapshot, this.currentVersion);
        this.currentId = draft.postId; this.currentVersion = draft.version; this.currentDraft = draft;
        if (created && draft.version > 1 && !sameContent(snapshot, draftContent(draft))) {
          throw Object.assign(new Error('Idempotent draft was modified in another editor'), { status: 409 });
        }
        // An idempotent create retry can return an older snapshot. Save the latest next.
        if (!created || sameContent(snapshot, draftContent(draft))) {
          this.savedGeneration = generation;
        }
        this.emit();
      }
      this.currentStatus = 'saved'; this.emit(); return this.currentDraft;
    } catch (error) {
      this.lastError = error;
      this.currentStatus = (error as { status?: number })?.status === 409 ? 'conflict' : 'error';
      this.emit(); throw error;
    }
  }
  blockForConflict(error: unknown) { this.lastError = error; this.currentStatus = 'conflict'; this.emit(); }
  reset(draft: PostDraft) {
    if (this.running) throw new Error('Cannot replace a draft while saving');
    this.currentDraft = draft; this.currentId = draft.postId; this.currentVersion = draft.version;
    this.current = draftContent(draft);
    this.generation = 0; this.savedGeneration = 0; this.lastError = null; this.currentStatus = 'saved'; this.emit();
  }
  dispose() { this.disposed = true; }
}
