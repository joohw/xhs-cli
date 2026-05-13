import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PUBLISHED_ROOT, ensureAppDataLayout } from '../config.js';

export type PublishedRecord = {
  id: string;
  account: string;
  sourceDraftId?: string | null;
  title: string;
  content: string;
  images: string[];
  publishedAt: string;
};

function recordPath(id: string): string {
  return join(PUBLISHED_ROOT, `${id}.json`);
}

function atomicWrite(path: string, data: PublishedRecord): void {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, path);
}

export function appendPublishedRecord(
  row: Omit<PublishedRecord, 'id'> & { id?: string },
): PublishedRecord {
  ensureAppDataLayout();
  if (!existsSync(PUBLISHED_ROOT)) {
    mkdirSync(PUBLISHED_ROOT, { recursive: true });
  }
  const rec: PublishedRecord = {
    id: row.id ?? randomUUID(),
    account: row.account,
    sourceDraftId: row.sourceDraftId ?? null,
    title: row.title,
    content: row.content,
    images: [...row.images],
    publishedAt: row.publishedAt,
  };
  atomicWrite(recordPath(rec.id), rec);
  return rec;
}

export function listPublished(accountFilter?: string): PublishedRecord[] {
  ensureAppDataLayout();
  if (!existsSync(PUBLISHED_ROOT)) {
    return [];
  }
  const out: PublishedRecord[] = [];
  for (const name of readdirSync(PUBLISHED_ROOT)) {
    if (!name.endsWith('.json')) continue;
    try {
      const rec = JSON.parse(
        readFileSync(join(PUBLISHED_ROOT, name), 'utf-8'),
      ) as PublishedRecord;
      if (accountFilter && rec.account !== accountFilter) continue;
      out.push(rec);
    } catch {
      continue;
    }
  }
  out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return out;
}

export function formatPublishedList(items: PublishedRecord[]): string {
  if (items.length === 0) {
    return '暂无已发布的本地归档记录。';
  }
  return items
    .map(
      (r) =>
        `${r.id}\t${r.account}\t${r.publishedAt}\t${r.title.replace(/\s+/g, ' ').slice(0, 36)}`,
    )
    .join('\n');
}
