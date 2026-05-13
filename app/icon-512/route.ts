import { ImageResponse } from 'next/og'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#151918',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#5fb3a1', fontSize: 340, fontWeight: 800, letterSpacing: -14, display: 'flex' }}>
          O
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
