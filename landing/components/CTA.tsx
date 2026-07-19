export default function CTA() {
  return (
    <section className="py-24 px-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">立即开始使用</h2>
          <p className="text-slate-400 mb-8 max-w-lg">
            一行命令安装，在本机浏览器中使用。无论是个人创作者还是运营团队，都可以把重复的数据查询与图文填表交给 CLI，同时保留发布前的人工检查。完全开源免费。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.npmjs.com/package/xhs-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold rounded-md transition-colors"
            >
              npm install -g xhs-cli
            </a>
            <a
              href="https://github.com/joohw/xhs-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-sm font-medium rounded-md transition-colors"
            >
              在 GitHub 查看源码
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
