import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'RLIS Fantasy League';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://fantasy.rlis.is/rlis_logo.png"
            alt="RLIS Logo"
            width={180}
            height={180}
            style={{
              borderRadius: 20,
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          RLIS Fantasy League
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Build your dream Rocket League team and compete!
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#64748b',
            fontSize: 24,
          }}
        >
          <span>fantasy.rlis.is</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
