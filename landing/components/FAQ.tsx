const faqs = [
  {
    q: '什么是 xhs-cli？',
    a: 'xhs-cli 是一个面向小红书创作者的开源命令行工具，提供多账号会话、运营指标、笔记查询和图文发帖填表能力。'
  },
  {
    q: '如何安装？',
    a: '确保已安装 Node.js 20+，然后运行 npm install -g xhs-cli。安装完成后执行 xhs help 查看所有命令。'
  },
  {
    q: '数据安全吗？',
    a: '代码完全开源可审查。账号浏览器会话与业务缓存保存在本机 ~/.xhs-cli/.cache/ 目录；工具通过本机浏览器访问小红书创作者后台，不经过 xhs-cli 自建服务器。请妥善保护该目录。'
  },
  {
    q: '可以集成到我的 AI Agent 中吗？',
    a: '可以。外部 Agent 宿主可注册工具，并直接调用 src/toolset 中对应的 impl* 实现。登录和数据查询等会话型操作传入 ResolvedSession，发帖传入目标账号的 browserUserDataDir。xhs-cli 本身不内置 Agent 或 MCP 服务。'
  },
  {
    q: '会自动发布笔记吗？',
    a: '默认不会。xhs post 会把标题、正文和图片填入创作后台，并保留浏览器窗口供你检查。只有显式传入 --publish 时，工具才会尝试点击页面中的「发布」按钮，结果仍以页面实际状态为准。'
  },
  {
    q: '如何贡献代码或反馈问题？',
    a: '欢迎通过 GitHub Issues 提交 Bug 或功能建议，也欢迎直接提交 Pull Request 参与贡献。'
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="py-24 px-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-2">常见问题</h2>
        <p className="text-slate-400 mb-12">
          更多问题可在{' '}
          <a
            href="https://github.com/joohw/xhs-cli/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-400 hover:text-rose-300 transition-colors"
          >
            GitHub Issues
          </a>{' '}
          提出。
        </p>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {faqs.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-left hover:bg-slate-900 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="text-white text-sm font-medium">{item.q}</span>
                <span aria-hidden className="text-slate-300 text-xs ml-4 shrink-0 group-open:hidden">+</span>
                <span aria-hidden className="hidden text-slate-300 text-xs ml-4 shrink-0 group-open:inline">−</span>
              </summary>
              <div className="px-6 py-4 bg-slate-900/50 text-slate-300 text-sm leading-relaxed border-t border-slate-800">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
