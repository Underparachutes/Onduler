import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: '#151918',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: '#5fb3a1', fontSize: 110, fontWeight: 800, letterSpacing: -4, display: 'flex' }}>
        O
      </div>
    </div>,
    { width: 180, height: 180 }
  )
}
