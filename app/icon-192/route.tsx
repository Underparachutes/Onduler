import { ImageResponse } from 'next/og'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: '#151918',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#5fb3a1', fontSize: 130, fontWeight: 800, letterSpacing: -5, display: 'flex' }}>
          O
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
