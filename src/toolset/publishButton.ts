/** 发布页底部操作区（暂存离开 + 发布） */
export const PUBLISH_FOOTER_SELECTORS = [
  '.publish-page-publish-btn button.ce-btn.bg-red',
  '.publish-page-publish-btn button.bg-red',
] as const;

export const PUBLISH_BUTTON_LABELS = ['发布', '立即发布'] as const;

function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 在发布区容器内查找可点击的「发布」按钮（不扫描全页） */
export function findPublishButton(
  root: ParentNode,
  selectors: readonly string[] = PUBLISH_FOOTER_SELECTORS,
  labels: readonly string[] = PUBLISH_BUTTON_LABELS,
): HTMLButtonElement | null {
  const allowed = new Set(labels.map(normalizeLabel));
  for (const sel of selectors) {
    for (const b of Array.from(root.querySelectorAll(sel))) {
      const el = b as HTMLButtonElement;
      if (el.disabled) continue;
      if (allowed.has(normalizeLabel(el.textContent ?? ''))) {
        return el;
      }
    }
  }
  return null;
}

export function isPublishButtonReady(
  root: ParentNode,
  selectors: readonly string[] = PUBLISH_FOOTER_SELECTORS,
  labels: readonly string[] = PUBLISH_BUTTON_LABELS,
): boolean {
  return findPublishButton(root, selectors, labels) !== null;
}
