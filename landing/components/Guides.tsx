import Link from 'next/link'

const guides = [
  {
    href: '/blog/xhs-content-publishing-workflow',
    title: '图文发布工作流',
    description: '正文文件、多图参数、人工确认与发布结果检查。',
  },
  {
    href: '/blog/xiaohongshu-multi-account-cli',
    title: '多账号会话管理',
    description: 'currentAccount、独立 browser-data 与临时账号切换。',
  },
  {
    href: '/blog/xiaohongshu-creator-data-cli',
    title: '创作者数据查询',
    description: 'metrics、recent、detail 与 posted 的数据来源和用途。',
  },
  {
    href: '/blog/xhs-cli-agent-integration',
    title: '外部 Agent 集成',
    description: '在 Node.js 宿主中复用 impl* 与 ResolvedSession。',
  },
]

export default function Guides() {
  return (
    <section className="py-24 px-6 border-t border-slate-800" aria-labelledby="guides-title">
      <div className="max-w-6xl mx-auto">
        <h2 id="guides-title" className="text-3xl font-bold text-white mb-2">实用指南</h2>
        <p className="text-slate-300 mb-12">所有命令和安全边界均按当前仓库实现编写。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="rounded-lg border border-slate-800 p-6 transition-colors hover:border-slate-600 hover:bg-slate-900/60"
            >
              <h3 className="text-lg font-semibold text-white">{guide.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{guide.description}</p>
            </Link>
          ))}
        </div>
        <Link href="/blog" className="mt-8 inline-block text-sm font-medium text-rose-300 hover:text-rose-200">
          查看全部教程 →
        </Link>
      </div>
    </section>
  )
}
