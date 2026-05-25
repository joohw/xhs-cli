import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const siteUrl = SITE_URL
const title = 'xhs-cli — 小红书自动化运营工具'
const description =
  '专为小红书运营和代运营团队打造的开源命令行工具。自动化账户管理、数据分析、批量发布笔记，大幅提升运营效率。支持多账号、Agent 集成，一行命令搞定重复操作。'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | xhs-cli',
  },
  description,
  keywords: [
    '小红书运营',
    '小红书代运营',
    '小红书自动化运营',
    '小红书批量发布',
    '小红书运营工具',
    '小红书内容运营',
    '小红书数据分析',
    '小红书多账号管理',
    'xhs-cli',
    '小红书命令行工具',
    '小红书自动化',
    '开源运营工具',
  ],
  authors: [{ name: 'Joo', url: 'https://github.com/joohw' }],
  creator: 'Joo',
  publisher: 'xhs-cli',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'xhs-cli',
    title,
    description,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary',
    title,
    description,
    creator: '@joohw',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
