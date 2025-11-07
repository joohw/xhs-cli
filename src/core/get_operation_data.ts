// src/cli/get_overall_data.ts
import { withLoggedInPage } from '../browser/browser.js';
import type { Page } from 'puppeteer-core';
import { UserRecentOperationData } from '../types/operationData.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { checkLoginState } from './check_login_state.js';


// 统一的页面数据获取器
export class XHSOperationDataFetcher {

  constructor(private page: Page) { }


  async fetchAllData(): Promise<UserRecentOperationData> {
    const homeData = await this.fetchHomeData();
    const fanData = await this.fetchFanData();
    const trafficSources = await this.fetchTrafficSources();
    return this.transformToOperationData(homeData, fanData, trafficSources);
  }


  private async fetchHomeData() {
    await this.navigate('https://creator.xiaohongshu.com/new/home');
    return await this.page.$$eval('.creator-block', (blocks) => {
      return blocks.map((block) => {
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
          tendencyValue
        };
      }).filter(item => item !== null);
    });
  }




  private async fetchFanData() {
    await this.navigate('https://creator.xiaohongshu.com/creator/fans');
    return await this.page.evaluate(() => {
      const data = { totalFans: '0', newFans: '0', lostFans: '0', interests: [] as string[] };
      // 粉丝数量数据
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
      // 兴趣数据
      const wordCloudBox = document.querySelector('.word-cloud-box');
      if (wordCloudBox) {
        data.interests = Array.from(wordCloudBox.querySelectorAll('.row-item'))
          .map(item => (item.textContent || '').trim())
          .filter(text => text) as string[];
      }
      return data;
    });
  }


  private async fetchTrafficSources() {
    await this.navigate('https://creator.xiaohongshu.com/statistics/account');
    return await this.page.evaluate(() => {
      const sources: Array<{ name: string; percentage: string }> = [];
      const container = document.querySelector('#creator-account-fans-graph');
      if (!container) return sources;
      const text = container.textContent || '';
      const regex = /([^：:：\s]+)[：:：]\s*(\d+(?:\.\d+)?%)/g;
      let match;
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

  
  private async navigate(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }


  // 在 transformToOperationData 函数中修改
  private transformToOperationData(
    homeData: any[],
    fanData: any,
    trafficSources: any[]
  ): UserRecentOperationData {
    const findMetric = (source: any[], keywords: string[]) => {
      for (const keyword of keywords) {
        const item = source.find((item: any) => item.title.includes(keyword));
        if (item) return item.number;
      }
      return '0';
    };
    const newFansNum = parseInt(fanData.newFans) || 0;
    const lostFansNum = parseInt(fanData.lostFans) || 0;
    // 提取主页访客的具体数值
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
      // 添加主页访客数据
      homePageVisitors: homePageVisitors,
      trafficSources,
      fanInterests: fanData.interests,
      tendencies: homeData.map((item: any) => ({
        metric: item.title,
        tendency: item.tendency,
        value: item.tendencyValue
      }))
    };
  }
}


// 核心函数：获取运营数据（返回原始数据）
export async function getOperationData(): Promise<UserRecentOperationData> {
  const { isLoggedIn } = await checkLoginState();
  if (!isLoggedIn) {
    throw new Error('未登录状态。请先确保已登录小红书。');
  }
  const today = new Date().toISOString().split('T')[0];
  const cacheFilename = `operation_data/${today}.json`;
  const cachedData = loadFromCache<UserRecentOperationData>(cacheFilename);
  if (cachedData && cachedData.date === today) {
    return cachedData;
  }
  const operationData = await withLoggedInPage(async (page) => {
    const fetcher = new XHSOperationDataFetcher(page);
    return await fetcher.fetchAllData();
  });
  saveToCache(cacheFilename, operationData);
  return operationData;
}

