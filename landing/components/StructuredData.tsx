type StructuredDataProps = {
  data: Record<string, unknown>
}

export default function StructuredData({ data }: StructuredDataProps) {
  const script = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: script }} />
}
