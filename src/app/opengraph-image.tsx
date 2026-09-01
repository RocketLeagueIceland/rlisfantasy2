import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RL_TEAMS } from '@/lib/scoring/constants';

export const alt = 'RLIS Fantasy League';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// This route is rendered at build time, where public/ is available on disk.
// Reading the logos from disk (instead of fetching our own domain) keeps the
// render deterministic - a network fetch would race the CDN rollout and can
// bake a previous deployment's assets into the image.
async function logoDataUri(relPath: string): Promise<string> {
  const buf = await readFile(join(process.cwd(), 'public', relPath));
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// Load a Google Font as TTF (satori can't use woff2). Falls back silently.
async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
        // Legacy UA makes Google Fonts serve TTF instead of woff2
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:11.0) like Gecko' } }
      )
    ).text();
    const match = css.match(/src: url\((https:[^)]+\.ttf)\)/);
    if (!match) return null;
    return await (await fetch(match[1])).arrayBuffer();
  } catch {
    return null;
  }
}

async function getSeasonName(): Promise<string | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const res = await fetch(`${url}/rest/v1/seasons?is_current=eq.true&select=name`, {
      headers: { apikey: key },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { name: string }[];
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [black, medium, seasonName] = await Promise.all([
    loadGoogleFont('Inter', 900),
    loadGoogleFont('Inter', 500),
    getSeasonName(),
  ]);
  const rlisLogo = await logoDataUri('rlis_logo.png');
  const teamLogos = await Promise.all(RL_TEAMS.map((team) => logoDataUri(`Teams/${team}.png`)));

  const fonts = [];
  if (black) fonts.push({ name: 'Inter', data: black, weight: 900 as const, style: 'normal' as const });
  if (medium) fonts.push({ name: 'Inter', data: medium, weight: 500 as const, style: 'normal' as const });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          backgroundColor: '#070b14',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.28), transparent 55%), radial-gradient(circle at 90% 100%, rgba(249,115,22,0.22), transparent 50%), radial-gradient(circle at 10% 100%, rgba(139,92,246,0.18), transparent 50%)',
          position: 'relative',
        }}
      >
        {/* Field markings: center circle, midline, goal boxes */}
        <div
          style={{
            position: 'absolute',
            left: 430,
            top: -55,
            width: 340,
            height: 740,
            borderRadius: 370,
            border: '2px solid rgba(148,163,184,0.14)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 599,
            top: 0,
            width: 2,
            height: 630,
            backgroundColor: 'rgba(148,163,184,0.14)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -2,
            top: 165,
            width: 130,
            height: 300,
            border: '2px solid rgba(148,163,184,0.12)',
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -2,
            top: 165,
            width: 130,
            height: 300,
            border: '2px solid rgba(148,163,184,0.12)',
            borderTopLeftRadius: 24,
            borderBottomLeftRadius: 24,
            display: 'flex',
          }}
        />

        {/* Logo + title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rlisLogo}
            alt="RLIS"
            width={128}
            height={128}
            style={{ borderRadius: 26, boxShadow: '0 0 70px rgba(56,189,248,0.55)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                letterSpacing: -4,
                backgroundImage: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 55%, #fb923c 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
              }}
            >
              RLIS FANTASY
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: '#94a3b8',
                display: 'flex',
                marginTop: -6,
              }}
            >
              Build your dream Rocket League team and climb the leaderboard
            </div>
          </div>
        </div>

        {/* Season pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '2px solid rgba(56,189,248,0.45)',
            backgroundColor: 'rgba(56,189,248,0.10)',
            borderRadius: 999,
            padding: '10px 34px',
            marginBottom: 34,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              backgroundColor: '#4ade80',
              boxShadow: '0 0 14px rgba(74,222,128,0.9)',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 6,
              color: '#7dd3fc',
              display: 'flex',
            }}
          >
            {(seasonName ?? 'RLÍS DEILDIN').toUpperCase()}
          </div>
        </div>

        {/* Team logos row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {RL_TEAMS.map((team, i) => (
            <div
              key={team}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 96,
                height: 96,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teamLogos[i]} alt={team} width={64} height={64} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#64748b',
            fontSize: 24,
            fontWeight: 500,
          }}
        >
          rocketleague.is
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
