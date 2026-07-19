const examples = [
  {
    title: '添加并登录账号',
    lines: [
      { prompt: true, text: 'xhs account add brand-a' },
      { prompt: true, text: 'xhs account use brand-a' },
      { prompt: true, text: 'xhs login' },
      { prompt: false, text: '登录成功', highlight: true },
    ]
  },
  {
    title: '获取运营指标',
    lines: [
      { prompt: true, text: 'xhs metrics' },
      { prompt: false, text: '总粉丝: 10.2K  净增: 128' },
      { prompt: false, text: '点赞: 245.6K  收藏: 86.3K' },
    ]
  },
  {
    title: '查看最近笔记',
    lines: [
      { prompt: true, text: 'xhs recent --limit 20' },
      { prompt: false, text: 'ID: 64f...' },
      { prompt: false, text: '浏览: 2.1K  点赞: 326', highlight: true },
    ]
  },
  {
    title: '发布新笔记',
    lines: [
      { prompt: true, text: 'xhs post --title "标题" --content "内容" --image ./cover.jpg' },
      { prompt: false, text: '已填入标题与正文' },
      { prompt: false, text: '请在页面中确认后发布', highlight: true },
    ]
  }
]

export default function Demo() {
  return (
    <section id="examples" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-2">使用示例</h2>
        <p className="text-slate-400 mb-12">简单直观的命令，强大的自动化能力。</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {examples.map((ex, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-700"></span>
                  <span className="w-3 h-3 rounded-full bg-slate-700"></span>
                  <span className="w-3 h-3 rounded-full bg-slate-700"></span>
                </div>
                <span className="text-slate-300 text-xs ml-2">{ex.title}</span>
              </div>
              <div className="p-4 font-mono text-sm space-y-1.5">
                {ex.lines.map((line, j) => (
                  <div key={j} className="flex gap-2">
                    {line.prompt
                      ? <span className="text-rose-500 shrink-0">$</span>
                      : <span className="w-3 shrink-0"></span>
                    }
                    <span className={
                      line.prompt
                        ? 'text-white'
                        : (line as { highlight?: boolean }).highlight
                          ? 'text-rose-400'
                          : 'text-slate-300'
                    }>
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
