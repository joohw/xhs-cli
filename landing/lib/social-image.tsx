import { ImageResponse } from 'next/og'

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
}

export function createSocialImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#020617',
          color: '#f8fafc',
          padding: '72px 84px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              borderRadius: 999,
            background: '#be123c',
            }}
          />
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            <span style={{ color: '#fb7185' }}>xhs</span>
            <span>-cli</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 70, fontWeight: 700, letterSpacing: -3 }}>
            Xiaohongshu creator CLI
          </div>
          <div style={{ display: 'flex', color: '#94a3b8', fontSize: 31 }}>
            Accounts · Metrics · Notes · Human-reviewed posting
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 23 }}>
          <span>Open source · Node.js 20+</span>
          <span>xhs-cli.com</span>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE,
  )
}
