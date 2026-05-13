/** 会话与缓存前缀：由 CLI 解析 `--account` 与 registry 得出 */

export type ResolvedSession = {
  /** Puppeteer Chrome userDataDir */
  browserUserDataDir: string;
  /**
   * 业务缓存文件相对 CACHE_DIR 的前缀；
   * 遗留单账号会话为 `''`；多账号为 `accounts/<slug>/`
   */
  cachePathPrefix: string;
};
