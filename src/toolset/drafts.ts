import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DRAFTS_ROOT, ensureAppDataLayout } from '../config.js';
import { validateAccountSlug, getStoredAccountOrThrow } from './accountRegistry.js';
import { postNote } from './post.js';
import { appendPublishedRecord } from './publishedRecords.js';

export type DraftStatus = 'draft' | 'approved' | 'published';

export type DraftRecord = {
  id: string;
  account: string;
  title: string;
  content: string;
  images: string[];
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
};

function draftPath(id: string): string {
  return join(DRAFTS_ROOT, `${id}.json`);
}

function atomicWriteJson(path: string, data: DraftRecord): void {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, path);
}

export function loadDraft(id: string): DraftRecord | null {
  ensureAppDataLayout();
  const p = draftPath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as DraftRecord;
  } catch {
    return null;
  }
}

export function saveDraft(draft: DraftRecord): void {
  ensureAppDataLayout();
  if (!existsSync(DRAFTS_ROOT)) {
    mkdirSync(DRAFTS_ROOT, { recursive: true });
  }
  atomicWriteJson(draftPath(draft.id), draft);
}

export function createDraft(opts: {
  account: string;
  title: string;
  content: string;
  imagePaths?: string[];
}): DraftRecord {
  validateAccountSlug(opts.account);
  getStoredAccountOrThrow(opts.account.trim());
  const now = new Date().toISOString();
  const d: DraftRecord = {
    id: randomUUID(),
    account: opts.account.trim(),
    title: opts.title.trim(),
    content: opts.content,
    images: opts.imagePaths ? [...opts.imagePaths] : [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  saveDraft(d);
  return d;
}

export type DraftFilter = {
  account?: string;
  status?: DraftStatus;
};

export function listDrafts(filter?: DraftFilter): DraftRecord[] {
  ensureAppDataLayout();
  if (!existsSync(DRAFTS_ROOT)) {
    return [];
  }
  const out: DraftRecord[] = [];
  for (const name of readdirSync(DRAFTS_ROOT)) {
    if (!name.endsWith('.json')) continue;
    const p = join(DRAFTS_ROOT, name);
    try {
      const d = JSON.parse(readFileSync(p, 'utf-8')) as DraftRecord;
      if (filter?.account && d.account !== filter.account) continue;
      if (filter?.status && d.status !== filter.status) continue;
      out.push(d);
    } catch {
      continue;
    }
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return out;
}

export function approveDraft(id: string): DraftRecord {
  const d = loadDraft(id);
  if (!d) {
    throw new Error(`未找到草稿: ${id}`);
  }
  if (d.status === 'published') {
    throw new Error('已发布的草稿不能再次审批');
  }
  const now = new Date().toISOString();
  const next: DraftRecord = {
    ...d,
    status: 'approved',
    updatedAt: now,
    approvedAt: now,
  };
  saveDraft(next);
  return next;
}

/**
 * 若发帖成功则更新草稿并写入 published 记录；失败则保持原状态。
 */
export async function publishDraftById(id: string): Promise<string> {
  const d = loadDraft(id);
  if (!d) {
    return `❌ 未找到草稿: ${id}`;
  }
  if (d.status !== 'approved') {
    return `❌ 请先执行 xhs draft approve ${id}（当前状态: ${d.status}）`;
  }
  if (d.images.length === 0) {
    return '❌ 草稿无图片路径，发帖至少需要一张 --image';
  }

  validateAccountSlug(d.account);
  const accRow = getStoredAccountOrThrow(d.account);

  try {
    const result = await postNote({
      title: d.title,
      content: d.content,
      imagePaths: d.images,
      publish: true,
      browserUserDataDir: accRow.browserDataDir,
    });
    if (!result.success) {
      return `❌ ${result.message}`;
    }
    const now = new Date().toISOString();
    const published: DraftRecord = {
      ...d,
      status: 'published',
      updatedAt: now,
      publishedAt: now,
    };
    saveDraft(published);
    appendPublishedRecord({
      account: d.account,
      sourceDraftId: d.id,
      title: d.title,
      content: d.content,
      images: d.images,
      publishedAt: now,
    });
    return `✅ 已发布并归档（本地记录）: ${result.message}`;
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function formatDraftListItems(items: DraftRecord[]): string {
  if (items.length === 0) {
    return '暂无草稿。';
  }
  return items
    .map(
      (d) =>
        `${d.id}\t${d.account}\t${d.status}\t${d.title.replace(/\s+/g, ' ').slice(0, 40)}`,
    )
    .join('\n');
}

export function formatDraftShow(d: DraftRecord): string {
  return [
    `id: ${d.id}`,
    `account: ${d.account}`,
    `status: ${d.status}`,
    `title: ${d.title}`,
    `createdAt: ${d.createdAt}`,
    `updatedAt: ${d.updatedAt}`,
    d.approvedAt ? `approvedAt: ${d.approvedAt}` : '',
    d.publishedAt ? `publishedAt: ${d.publishedAt}` : '',
    `images (${d.images.length}):`,
    ...d.images.map((p) => `  - ${p}`),
    '',
    'content:',
    d.content,
  ]
    .filter(Boolean)
    .join('\n');
}
