const features = [
  {
    title: '多账号会话',
    description: '每个账号使用独立的 browser-data 目录保存浏览器会话，可设置当前账号，也可通过参数临时切换。'
  },
  {
    title: '创作者运营指标',
    description: '通过 xhs metrics 查询粉丝、互动、阅读和流量来源等创作者后台指标，并在本地保留缓存。'
  },
  {
    title: '笔记数据查询',
    description: '使用 recent、detail 与 posted 查看最近笔记、单篇详情和本地发帖归档。'
  },
  {
    title: '图文发帖填表',
    description: '将标题、正文和 1～18 张本地图片填入创作后台。默认停留在页面供人工检查，--publish 可按需尝试点击发布。'
  },
  {
    title: '外部 Agent 集成',
    description: '宿主应用可注册同名 impl* 并复用 CLI 业务实现；会话型操作使用 ResolvedSession，发帖传入对应账号的 browserUserDataDir。'
  },
  {
    title: '二次开发友好',
    description: '核心业务能力集中在 TypeScript toolset 中，便于在自有脚本或运营系统中复用。'
  }
]

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-2">核心功能</h2>
        <p className="text-slate-400 mb-12">为小红书运营和代运营团队精心打造。</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {features.map((f, i) => (
            <div key={i} className="bg-slate-950 p-6 hover:bg-slate-900 transition-colors">
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
