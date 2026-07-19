import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 px-6 py-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div>
          <Link href="/" aria-label="xhs-cli 首页" className="mb-3 inline-block">
            <span className="text-rose-500 font-bold text-base">xhs</span>
            <span className="text-white font-bold text-base">-cli</span>
          </Link>
          <p className="text-slate-300 text-xs">小红书创作者命令行工具 · 开源 · GPL-3.0</p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">博客</Link>
          <Link href="/security" className="text-slate-300 hover:text-white transition-colors">安全与数据</Link>
          <a href="https://github.com/joohw/xhs-cli" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">GitHub</a>
          <a href="https://www.npmjs.com/package/xhs-cli" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">NPM</a>
          <a href="https://github.com/joohw/xhs-cli/issues" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Issues</a>
          <a href="https://github.com/joohw/xhs-cli/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">许可证</a>
        </div>
      </div>
    </footer>
  )
}
