export default function Hero() {
  return (
    <section className="pt-40 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-300 text-xs">开源 · GPL-3.0 · Node.js 20+</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          小红书运营
          <br />
          <span className="text-rose-500">命令行工具</span>
        </h1>

        <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-xl">
          xhs-cli 是面向小红书创作者与运营团队的开源 CLI。管理多账号会话、查询运营与笔记数据，并将图文素材填入创作后台；发布前默认由你确认。
        </p>

        <div className="flex flex-wrap gap-3 mb-12">
          <a
            href="https://www.npmjs.com/package/xhs-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold rounded-md text-sm transition-colors"
          >
            npm install
          </a>
          <a
            href="https://github.com/joohw/xhs-cli#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md text-sm font-medium transition-colors"
          >
            查看文档
          </a>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-lg">
          <p className="text-slate-300 text-xs uppercase tracking-widest mb-4">快速开始</p>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400 select-none">$ </span>
              <span className="text-rose-400">npm install -g xhs-cli</span>
            </div>
            <div>
              <span className="text-slate-400 select-none">$ </span>
              <span className="text-rose-400">xhs help</span>
            </div>
          </div>
          <p className="text-slate-300 text-xs mt-4">需要 Node.js 20+ 和本机 Chrome/Chromium</p>
        </div>
      </div>
    </section>
  )
}
