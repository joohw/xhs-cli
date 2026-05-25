import { Marked, Renderer, type Tokens } from 'marked'

const baseRenderer = new Renderer()

const marked = new Marked({
  gfm: true,
  breaks: true,
})

marked.use({
  renderer: {
    link(this: Renderer, token: Tokens.Link) {
      const html = baseRenderer.link.call(this, token)
      const href = token.href.trim()
      if (!/^https?:\/\//i.test(href)) {
        return html
      }
      return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ')
    },
  },
})

export async function renderMarkdown(markdown: string): Promise<string> {
  return marked.parse(markdown)
}
