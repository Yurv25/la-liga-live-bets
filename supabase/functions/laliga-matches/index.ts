import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://sports.bzzoiro.com/api";
const LA_LIGA_ID = 3;

function normalizeStatus(status: string): "LIVE" | "HT" | "FT" | "NS" {
  const s = status.toLowerCase();
  if (s === "inprogress" || s === "live" || s === "in progress") return "LIVE";
  if (s === "halftime" || s === "ht" || s === "half time") return "HT";
  if (s === "finished" || s === "ft" || s === "ended") return "FT";
  return "NS";
}

function teamLogoUrl(teamId?: number): string {
  if (!teamId) return "";
  return `https://sports.bzzoiro.com/img/team/${teamId}/`;
}

interface BzzoiroEvent {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  league: { name: string; country: string };
  event_date: string;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  minute?: number | null;
}

interface BzzoiroLive {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  home_score: number;
  away_score: number;
  status: string;
  minute: number | null;
  league: { name: string; country: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("BZZOIRO_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "BZZOIRO_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const headers = { Authorization: `Token ${apiKey}` };

  try {
    const [eventsRes, liveRes] = await Promise.all([
      fetch(`${BASE_URL}/events/?league=${LA_LIGA_ID}`, { headers }),
      fetch(`${BASE_URL}/live/`, { headers }),
    ]);

    if (!eventsRes.ok) throw new Error(`Events API: ${eventsRes.status}`);
    if (!liveRes.ok) throw new Error(`Live API: ${liveRes.status}`);

    const eventsData = await eventsRes.json();
    const liveData = await liveRes.json();

    const events: BzzoiroEvent[] = eventsData.results || eventsData;
    const liveMatches: BzzoiroLive[] = (liveData.results || liveData).filter(
      (m: BzzoiroLive) => m.league?.name === "La Liga"
    );

    const mappedEvents = events.map((ev) => ({
      id: String(ev.id),
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      homeScore: ev.home_score ?? 0,
      awayScore: ev.away_score ?? 0,
      status: normalizeStatus(ev.status),
      minute: ev.minute ?? null,
      startTime: ev.event_date,
      homeLogo: teamLogoUrl(ev.home_team_id),
      awayLogo: teamLogoUrl(ev.away_team_id),
    }));

    const mappedLive = liveMatches.map((m) => ({
      id: String(m.id),
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: normalizeStatus(m.status),
      minute: m.minute,
      startTime: new Date().toISOString(),
      homeLogo: teamLogoUrl(m.home_team_id),
      awayLogo: teamLogoUrl(m.away_team_id),
    }));

    // Merge live data over events
    const liveMap = new Map(mappedLive.map((m) => [m.id, m]));
    const merged = mappedEvents.map((ev) => liveMap.get(ev.id) || ev);
    mappedLive.forEach((m) => {
      if (!mappedEvents.find((ev) => ev.id === m.id)) {
        merged.push(m);
      }
    });

    return new Response(JSON.stringify(merged), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Bzzoiro API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch match data", matches: [] }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
