/** 会话与缓存前缀：由当前账号 registry 得出 */

export type ResolvedSession = {
  /** 本次使用的账号 slug */
  account: string;
  /** Puppeteer Chrome userDataDir */
  browserUserDataDir: string;
  /**
   * 业务缓存文件相对 CACHE_DIR 的前缀；
   * 遗留单账号会话为 `''`；多账号为 `accounts/<slug>/`
   */
  cachePathPrefix: string;
};
