const LIQUIPEDIA_API =
  'https://liquipedia.net/rocketleague/api.php?action=parse&page=Icelandic_Esports_League/Season_11/League_Play&prop=wikitext&format=json';

// Map Liquipedia team names (case-insensitive) to app display names
const TEAM_NAME_MAP: Record<string, string> = {
  thorakureyri: 'Thor',
  dusty: 'Dusty',
  omon: 'Ómon',
  '354 esports': '354 Esports',
  stjarnan: 'Stjarnan',
  hamar: 'Hamar',
};

export const TEAM_KEY_MAP: Record<string, string> = {
  Dusty: 'dusty',
  Thor: 'thor',
  'Ómon': 'omon',
  '354 Esports': '354esports',
  Hamar: 'hamar',
  Stjarnan: 'stjarnan',
};

export interface Match {
  time: string;
  team1: string;
  team2: string;
  score1: number | null;
  score2: number | null;
}

export interface Round {
  round: number;
  date: string;
  matches: Match[];
}

// Full schedule template — dates, times, matchups are static.
// Scores default to null and get filled in from Liquipedia.
const SCHEDULE_TEMPLATE: Round[] = [
  {
    round: 1, date: '2026-02-01', matches: [
      { time: '14:00', team1: 'Dusty', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Ómon', team2: '354 Esports', score1: null, score2: null },
      { time: '15:30', team1: 'Hamar', team2: 'Stjarnan', score1: null, score2: null },
    ],
  },
  {
    round: 2, date: '2026-02-08', matches: [
      { time: '14:00', team1: 'Ómon', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Hamar', team2: 'Dusty', score1: null, score2: null },
      { time: '15:30', team1: 'Stjarnan', team2: '354 Esports', score1: null, score2: null },
    ],
  },
  {
    round: 3, date: '2026-02-15', matches: [
      { time: '14:00', team1: 'Hamar', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Stjarnan', team2: 'Ómon', score1: null, score2: null },
      { time: '15:30', team1: '354 Esports', team2: 'Dusty', score1: null, score2: null },
    ],
  },
  {
    round: 4, date: '2026-02-22', matches: [
      { time: '14:00', team1: 'Stjarnan', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: '354 Esports', team2: 'Hamar', score1: null, score2: null },
      { time: '15:30', team1: 'Dusty', team2: 'Ómon', score1: null, score2: null },
    ],
  },
  {
    round: 5, date: '2026-03-01', matches: [
      { time: '14:00', team1: '354 Esports', team2: 'Thor', score1: null, score2: null },
      { time: '14:45', team1: 'Dusty', team2: 'Stjarnan', score1: null, score2: null },
      { time: '15:30', team1: 'Ómon', team2: 'Hamar', score1: null, score2: null },
    ],
  },
  {
    round: 6, date: '2026-03-08', matches: [
      { time: '14:00', team1: 'Thor', team2: 'Dusty', score1: null, score2: null },
      { time: '14:45', team1: '354 Esports', team2: 'Ómon', score1: null, score2: null },
      { time: '15:30', team1: 'Stjarnan', team2: 'Hamar', score1: null, score2: null },
    ],
  },
  {
    round: 7, date: '2026-03-15', matches: [
      { time: '14:00', team1: 'Thor', team2: 'Ómon', score1: null, score2: null },
      { time: '14:45', team1: 'Dusty', team2: 'Hamar', score1: null, score2: null },
      { time: '15:30', team1: '354 Esports', team2: 'Stjarnan', score1: null, score2: null },
    ],
  },
  {
    round: 8, date: '2026-03-22', matches: [
      { time: '14:00', team1: 'Thor', team2: 'Hamar', score1: null, score2: null },
      { time: '14:45', team1: 'Ómon', team2: 'Stjarnan', score1: null, score2: null },
      { time: '15:30', team1: 'Dusty', team2: '354 Esports', score1: null, score2: null },
    ],
  },
  {
    round: 9, date: '2026-03-29', matches: [
      { time: '14:00', team1: 'Thor', team2: 'Stjarnan', score1: null, score2: null },
      { time: '14:45', team1: 'Hamar', team2: '354 Esports', score1: null, score2: null },
      { time: '15:30', team1: 'Ómon', team2: 'Dusty', score1: null, score2: null },
    ],
  },
  {
    round: 10, date: '2026-04-19', matches: [
      { time: '14:00', team1: 'Thor', team2: '354 Esports', score1: null, score2: null },
      { time: '14:45', team1: 'Stjarnan', team2: 'Dusty', score1: null, score2: null },
      { time: '15:30', team1: 'Hamar', team2: 'Ómon', score1: null, score2: null },
    ],
  },
];

function normalizeLpName(name: string): string {
  return name.trim().toLowerCase();
}

function lpNameToApp(lpName: string): string | undefined {
  return TEAM_NAME_MAP[normalizeLpName(lpName)];
}

interface ParsedMatch {
  team1: string;
  team2: string;
  score1: number;
  score2: number;
}

/**
 * Parse wikitext to extract match results.
 * Matches the pattern:  |opponent1={{TeamOpponent|NAME|score=N}}
 * followed by:          |opponent2={{TeamOpponent|NAME|score=N}}
 * Only includes matches where both scores are present (non-empty digits).
 */
function parseScores(wikitext: string): ParsedMatch[] {
  const results: ParsedMatch[] = [];

  // Match each {{Match ... }} block that contains two TeamOpponent templates
  const matchBlockRe =
    /\|opponent1=\{\{TeamOpponent\|([^|}]+)\|score=(\d+)\}\}\s*\|opponent2=\{\{TeamOpponent\|([^|}]+)\|score=(\d+)\}\}/g;

  let m: RegExpExecArray | null;
  while ((m = matchBlockRe.exec(wikitext)) !== null) {
    const t1 = lpNameToApp(m[1]);
    const t2 = lpNameToApp(m[3]);
    if (t1 && t2) {
      results.push({
        team1: t1,
        team2: t2,
        score1: parseInt(m[2], 10),
        score2: parseInt(m[4], 10),
      });
    }
  }

  return results;
}

async function fetchWikitext(): Promise<string | null> {
  try {
    const res = await fetch(LIQUIPEDIA_API, {
      headers: {
        'User-Agent': 'RLISFantasy/1.0 (https://rlis-fantasy.vercel.app; contact@rlis.is)',
        'Accept-Encoding': 'gzip',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.parse?.wikitext?.['*'] ?? null;
  } catch {
    return null;
  }
}

export async function getScheduleWithScores(): Promise<Round[]> {
  const wikitext = await fetchWikitext();

  // If fetch/parse fails, return template as-is (all scores null → "Upcoming")
  if (!wikitext) {
    return SCHEDULE_TEMPLATE;
  }

  const parsed = parseScores(wikitext);

  // Build a lookup: "team1 vs team2" → scores
  const scoreMap = new Map<string, { score1: number; score2: number }>();
  for (const pm of parsed) {
    scoreMap.set(`${pm.team1} vs ${pm.team2}`, { score1: pm.score1, score2: pm.score2 });
  }

  // Merge into template
  return SCHEDULE_TEMPLATE.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      const key = `${match.team1} vs ${match.team2}`;
      const found = scoreMap.get(key);
      if (found) {
        return { ...match, score1: found.score1, score2: found.score2 };
      }
      return match;
    }),
  }));
}
