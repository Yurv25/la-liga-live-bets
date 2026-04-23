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
  switch (s) {
    case "inprogress":
    case "1st_half":
    case "2nd_half":
      return "LIVE";

    case "halftime":
      return "HT";

    case "finished":
      return "FT";

    case "notstarted":
    case "postponed":
    case "cancelled":
      return "NS";

    default:
      return "NS";
  }
  /*
  if (s === "inprogress" || s === "live" || s === "in progress") return "LIVE";
  if (s === "halftime" || s === "ht" || s === "half time") return "HT";
  if (s === "finished" || s === "ft" || s === "ended") return "FT";
  if (s === "notstarted" || s === "ns" || s === "not started") return "NS";
  */
  //return "NS";
}

function teamLogoUrl(teamId?: number): string {
  if (!teamId) return "";
  return `https://sports.bzzoiro.com/img/team/${teamId}/`;
}

function extractTeamApiId(ev: any, side: "home" | "away"): number | null {
  // Use api_id (not id) — api_id is what the /img/team/{api_id}/ endpoint expects
  const obj = ev[`${side}_team_obj`];
  if (obj?.api_id) return obj.api_id;
  if (obj?.id) return obj.id; // fallback to internal id if api_id missing
  const directId = ev[`${side}_team_id`];
  if (directId) return directId;
  return null;
}

function mapMatch(ev: any, fallbackStartTime?: string) {
  const homeTeamId = extractTeamApiId(ev, "home");
  const awayTeamId = extractTeamApiId(ev, "away");

  return {
    id: String(ev.id),
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    homeScore: ev.home_score ?? 0,
    awayScore: ev.away_score ?? 0,
    status: normalizeStatus(ev.status),
    minute: ev.current_minute ?? ev.minute ?? null,
    startTime: ev.event_date ?? fallbackStartTime ?? new Date().toISOString(),
    homeTeamId: homeTeamId,
    awayTeamId: awayTeamId,
    homeLogo: teamLogoUrl(homeTeamId ?? undefined),
    awayLogo: teamLogoUrl(awayTeamId ?? undefined),
  };
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

    const events = eventsData.results || eventsData;
    const liveMatches = ((liveData.results || liveData) as any[]).filter(
      (m: any) => m.league?.name?.toLowerCase().includes("liga") //m.league?.name === "La Liga"
    );
    console.log("LIVE MATCHES RAW:", liveMatches);
    const mappedEvents = events.map((ev: any) => mapMatch(ev));
    const mappedLive = liveMatches.map((m: any) => mapMatch(m, new Date().toISOString()));

    console.log("EVENT IDS:", mappedEvents.map(m => m.id));
    console.log("LIVE IDS:", mappedLive.map(m => m.id));
    
    // Merge live data over events
    const liveMap = new Map(mappedLive.map((m: any) => [m.id, m]));
    const merged = mappedEvents.map((ev: any) => liveMap.get(ev.id) || ev);
    mappedLive.forEach((m: any) => {
      if (!mappedEvents.find((ev: any) => ev.id === m.id)) {
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
