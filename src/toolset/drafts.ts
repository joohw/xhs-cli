import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DRAFTS_ROOT, ensureAppDataLayout } from '../config.js';
import {
  validateAccountSlug,
  getStoredAccountOrThrow,
  loadAccountsRegistry,
  accountDraftsDir,
} from './accountRegistry.js';
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

function legacyDraftPath(id: string): string {
  return join(DRAFTS_ROOT, `${id}.json`);
}

function draftFilePath(account: string, id: string): string {
  return join(accountDraftsDir(account.trim()), `${id}.json`);
}

function readDraftFile(path: string): DraftRecord | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as DraftRecord;
  } catch {
    return null;
  }
}

function atomicWriteJson(path: string, data: DraftRecord): void {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, path);
}

/**
 * 读取草稿：优先 `accounts/<slug>/drafts/<id>.json`；未传 `account` 时按 registry 顺序查找；最后尝试遗留全局 `drafts/`。
 */
export function loadDraft(id: string, account?: string): DraftRecord | null {
  ensureAppDataLayout();
  const opt = account?.trim();
  if (opt) {
    const scoped = readDraftFile(draftFilePath(opt, id));
    if (scoped) return scoped;
    return readDraftFile(legacyDraftPath(id));
  }
  const reg = loadAccountsRegistry();
  for (const slug of Object.keys(reg.accounts)) {
    const d = readDraftFile(draftFilePath(slug, id));
    if (d) return d;
  }
  return readDraftFile(legacyDraftPath(id));
}

export function saveDraft(draft: DraftRecord): void {
  ensureAppDataLayout();
  const slug = draft.account.trim();
  const dir = accountDraftsDir(slug);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = draftFilePath(slug, draft.id);
  atomicWriteJson(path, draft);
  const leg = legacyDraftPath(draft.id);
  if (leg !== path && existsSync(leg)) {
    try {
      unlinkSync(leg);
    } catch {
      // 忽略删除遗留文件失败
    }
  }
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

function listJsonDraftsInDir(dir: string): DraftRecord[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: DraftRecord[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const d = readDraftFile(join(dir, name));
    if (d) out.push(d);
  }
  return out;
}

export function listDrafts(filter?: DraftFilter): DraftRecord[] {
  ensureAppDataLayout();
  const candidates: DraftRecord[] = [];
  const reg = loadAccountsRegistry();

  if (filter?.account) {
    const acc = filter.account.trim();
    candidates.push(...listJsonDraftsInDir(accountDraftsDir(acc)));
    for (const d of listJsonDraftsInDir(DRAFTS_ROOT)) {
      if (d.account === acc) {
        candidates.push(d);
      }
    }
  } else {
    for (const slug of Object.keys(reg.accounts)) {
      candidates.push(...listJsonDraftsInDir(accountDraftsDir(slug)));
    }
    candidates.push(...listJsonDraftsInDir(DRAFTS_ROOT));
  }

  const seen = new Set<string>();
  const out: DraftRecord[] = [];
  for (const d of candidates) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    if (filter?.status && d.status !== filter.status) continue;
    if (filter?.account && d.account !== filter.account.trim()) continue;
    out.push(d);
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return out;
}

export function approveDraft(id: string, account?: string): DraftRecord {
  const d = loadDraft(id, account);
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
 * 若发帖成功则更新草稿并写入 published 目录归档；失败则保持原状态。
 */
export async function postDraftById(id: string, account?: string): Promise<string> {
  const d = loadDraft(id, account);
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
