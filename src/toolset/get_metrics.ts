import { withLoggedInPage } from '../browser/index.js';
import type { Page } from 'puppeteer-core';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { checkLoginState } from './check_login_state.js';
interface TrafficSourceRow {
  name: string;
  percentage: string;
}

interface OperationDataSnapshot {
  date: string;
  totalFans: string;
  newFans: string;
  lostFans: string;
  netFansGrowth: string;
  totalLikes: string;
  totalCollects: string;
  totalComments: string;
  totalShares: string;
  publishedNotes: string;
  noteReads: string;
  noteReadRate: string;
  avgReadTime: string;
  homePageVisitors: string;
  trafficSources: TrafficSourceRow[];
  fanInterests: string[];
  tendencies: Array<{ metric: string; tendency: string; value: string }>;
}

/** 创作者首页单块指标 */
interface HomeBlockRow {
  title: string;
  number: string;
  tendency: 'up' | 'down' | 'none';
  tendencyValue: string;
}

interface FanSummary {
  totalFans: string;
  newFans: string;
  lostFans: string;
  interests: string[];
}

interface OperationDataTextCache {
  date: string;
  text: string;
}

function findMetric(source: HomeBlockRow[], keywords: string[]): string {
  for (const keyword of keywords) {
    const item = source.find((row) => row.title.includes(keyword));
    if (item) return item.number;
  }
  return '0';
}

function formatOperationSnapshot(snapshot: OperationDataSnapshot): string {
  const lines: string[] = [
    `日期: ${snapshot.date}`,
    '',
    '【概览】',
    `总粉丝: ${snapshot.totalFans}  新增: ${snapshot.newFans}  流失: ${snapshot.lostFans}  净增: ${snapshot.netFansGrowth}`,
    `点赞: ${snapshot.totalLikes}  收藏: ${snapshot.totalCollects}  评论: ${snapshot.totalComments}  分享: ${snapshot.totalShares}`,
    `笔记数: ${snapshot.publishedNotes}  阅读: ${snapshot.noteReads}  阅读率: ${snapshot.noteReadRate}  平均阅读时长: ${snapshot.avgReadTime}`,
    `主页访客: ${snapshot.homePageVisitors}`,
    '',
  ];

  if (snapshot.tendencies.length > 0) {
    lines.push('【首页指标趋势】');
    for (const t of snapshot.tendencies) {
      const dir =
        t.tendency === 'up' ? '↑' : t.tendency === 'down' ? '↓' : '—';
      lines.push(`  ${t.metric}: ${dir} ${t.value}`);
    }
    lines.push('');
  }

  if (snapshot.trafficSources.length > 0) {
    lines.push('【流量来源】');
    for (const s of snapshot.trafficSources) {
      lines.push(`  ${s.name}: ${s.percentage}`);
    }
    lines.push('');
  }

  if (snapshot.fanInterests.length > 0) {
    lines.push('【粉丝兴趣】');
    lines.push(`  ${snapshot.fanInterests.join('、')}`);
  }

  return lines.join('\n').trimEnd();
}

/** 统一的页面数据获取器 */
export class XHSOperationDataFetcher {
  constructor(private page: Page) {}

  async fetchAllData(): Promise<OperationDataSnapshot> {
    const homeData = await this.fetchHomeData();
    const fanData = await this.fetchFanData();
    const trafficSources = await this.fetchTrafficSources();
    return this.transformToSnapshot(homeData, fanData, trafficSources);
  }

  private async fetchHomeData(): Promise<HomeBlockRow[]> {
    await this.navigate('https://creator.xiaohongshu.com/new/home');
    const rows = await this.page.$$eval('.creator-block', (blocks) => {
      return blocks
        .map((block) => {
          const titleEl = block.querySelector('.title');
          const numberEl = block.querySelector('.number');
          const tendencyEl = block.querySelector('.tendency');
          if (!titleEl || !numberEl) return null;
          let tendency: 'up' | 'down' | 'none' = 'none';
          let tendencyValue = '--';
          if (tendencyEl) {
            const tendencyNumberEl = tendencyEl.querySelector('.tendency-number');
            if (tendencyNumberEl) {
              tendencyValue = (tendencyNumberEl.textContent || '').trim() || '--';
              const classList = Array.from(tendencyNumberEl.classList);
              if (classList.includes('up')) tendency = 'up';
              else if (classList.includes('down')) tendency = 'down';
            }
          }
          return {
            title: (titleEl.textContent || '').trim(),
            number: (numberEl.textContent || '').trim() || '0',
            tendency,
            tendencyValue,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });
    return rows;
  }

  private async fetchFanData(): Promise<FanSummary> {
    await this.navigate('https://creator.xiaohongshu.com/creator/fans');
    return await this.page.evaluate(() => {
      const data: FanSummary = {
        totalFans: '0',
        newFans: '0',
        lostFans: '0',
        interests: [],
      };
      document.querySelectorAll('.block-container').forEach((container) => {
        const desEl = container.querySelector('.des');
        const conEl = container.querySelector('.con');
        if (desEl && conEl) {
          const description = (desEl.textContent || '').trim();
          const value = (conEl.textContent || '').trim().replace(/,/g, '');

          if (description.includes('总粉丝数')) {
            data.totalFans = value;
          } else if (description.includes('新增粉丝数')) {
            const match = value.match(/\d+/);
            data.newFans = match ? match[0] : '0';
          } else if (description.includes('流失粉丝数')) {
            const match = value.match(/\d+/);
            data.lostFans = match ? match[0] : '0';
          }
        }
      });
      const wordCloudBox = document.querySelector('.word-cloud-box');
      if (wordCloudBox) {
        data.interests = Array.from(wordCloudBox.querySelectorAll('.row-item'))
          .map((item) => (item.textContent || '').trim())
          .filter((text) => text);
      }
      return data;
    });
  }

  private async fetchTrafficSources(): Promise<TrafficSourceRow[]> {
    await this.navigate('https://creator.xiaohongshu.com/statistics/account');
    return await this.page.evaluate(() => {
      const sources: TrafficSourceRow[] = [];
      const container = document.querySelector('#creator-account-fans-graph');
      if (!container) return sources;
      const text = container.textContent || '';
      const regex = /([^：:：\s]+)[：:：]\s*(\d+(?:\.\d+)?%)/g;
      let match: RegExpExecArray | null;
      const seen = new Set<string>();
      while ((match = regex.exec(text)) !== null) {
        const name = match[1].trim();
        const percentage = match[2].trim();
        if (name && percentage && !seen.has(name)) {
          seen.add(name);
          sources.push({ name, percentage });
        }
      }
      return sources;
    });
  }

  private async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  private transformToSnapshot(
    homeData: HomeBlockRow[],
    fanData: FanSummary,
    trafficSources: TrafficSourceRow[],
  ): OperationDataSnapshot {
    const newFansNum = parseInt(fanData.newFans, 10) || 0;
    const lostFansNum = parseInt(fanData.lostFans, 10) || 0;
    const homePageVisitors = findMetric(homeData, ['主页访客']);
    return {
      date: new Date().toISOString().split('T')[0],
      totalFans: fanData.totalFans,
      newFans: fanData.newFans,
      lostFans: fanData.lostFans,
      netFansGrowth: (newFansNum - lostFansNum).toString(),
      totalLikes: findMetric(homeData, ['点赞']),
      totalCollects: findMetric(homeData, ['收藏']),
      totalComments: findMetric(homeData, ['评论']),
      totalShares: findMetric(homeData, ['分享']),
      publishedNotes: findMetric(homeData, ['笔记']),
      noteReads: findMetric(homeData, ['阅读']),
      noteReadRate: findMetric(homeData, ['阅读率']),
      avgReadTime: findMetric(homeData, ['时长', '平均']),
      homePageVisitors,
      trafficSources,
      fanInterests: fanData.interests,
      tendencies: homeData.map((item) => ({
        metric: item.title,
        tendency: item.tendency,
        value: item.tendencyValue,
      })),
    };
  }
}

/**
 * 获取运营数据（纯文本；同日缓存命中则直接返回文本）
 */
export async function getOperationData(): Promise<string> {
  const { isLoggedIn } = await checkLoginState();
  if (!isLoggedIn) {
    throw new Error('未登录状态。请先确保已登录小红书。');
  }
  const today = new Date().toISOString().split('T')[0];
  const cacheFilename = `operation_data/${today}_text.json`;
  const cached = loadFromCache<OperationDataTextCache>(cacheFilename);
  if (cached && cached.date === today && cached.text?.trim()) {
    return cached.text;
  }

  const snapshot = await withLoggedInPage(async (page: Page) => {
    const fetcher = new XHSOperationDataFetcher(page);
    return await fetcher.fetchAllData();
  });
  const text = formatOperationSnapshot(snapshot);
  saveToCache(cacheFilename, { date: today, text });
  return text;
}
