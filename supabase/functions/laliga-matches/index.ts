import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://sports.bzzoiro.com/api";
const LA_LIGA_ID = 3;
const PAGE_SIZE = 200;
const MAX_PAGES = 20; // safety cap (4000 matches)

function normalizeStatus(
  status: string | undefined,
  period: string | null | undefined
): "LIVE" | "HT" | "FT" | "NS" {
  if (period === "halftime") return "HT";
  switch (status) {
    case "inprogress":
    case "penalties":
      return "LIVE";
    case "finished":
      return "FT";
    case "notstarted":
      return "NS";
    default:
      return "NS";
  }
}

function teamLogoUrl(teamId?: number | null): string {
  if (!teamId) return "";
  return `https://sports.bzzoiro.com/img/team/${teamId}/`;
}

function mapMatch(ev: any) {
  const homeTeamId = ev.home_team_id ?? null;
  const awayTeamId = ev.away_team_id ?? null;

  return {
    id: String(ev.id),
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    homeScore: ev.home_score ?? 0,
    awayScore: ev.away_score ?? 0,
    status: normalizeStatus(ev.status, ev.period),
    minute: ev.current_minute ?? null,
    startTime: ev.event_date ?? new Date().toISOString(),
    homeTeamId,
    awayTeamId,
    homeLogo: teamLogoUrl(homeTeamId),
    awayLogo: teamLogoUrl(awayTeamId),
    round: ev.round_number ?? null,
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
    // Fetch first page + live in parallel
    const [firstPageRes, liveRes] = await Promise.all([
      fetch(
        `${BASE_URL}/v2/events/?league_id=${LA_LIGA_ID}&season_id=294&limit=${PAGE_SIZE}&offset=0`,
        { headers }
      ),
      fetch(`${BASE_URL}/v2/events/live/?league_id=${LA_LIGA_ID}&season_id=294`, { headers }),
    ]);

    if (!firstPageRes.ok) throw new Error(`Events API: ${firstPageRes.status}`);
    if (!liveRes.ok) throw new Error(`Live API: ${liveRes.status}`);

    const firstPage = await firstPageRes.json();
    const liveData = await liveRes.json();

    const totalCount: number = firstPage.count ?? 0;
    const allResults: any[] = [...(firstPage.results ?? [])];

    // Fan out remaining pages in parallel
    const totalPages = Math.min(
      MAX_PAGES,
      Math.ceil(totalCount / PAGE_SIZE)
    );

    if (totalPages > 1) {
      const offsets: number[] = [];
      for (let p = 1; p < totalPages; p++) offsets.push(p * PAGE_SIZE);
      const pages = await Promise.all(
        offsets.map((offset) =>
          fetch(
            `${BASE_URL}/v2/events/?league_id=${LA_LIGA_ID}&season_id=294&limit=${PAGE_SIZE}&offset=${offset}`,
            { headers }
          ).then((r) => (r.ok ? r.json() : { results: [] }))
        )
      );
      for (const pg of pages) {
        if (Array.isArray(pg.results)) allResults.push(...pg.results);
      }
    }

    const liveEvents: any[] = liveData.events ?? [];

    const mappedEvents = allResults.map((ev: any) => mapMatch(ev));
    const mappedLive = liveEvents.map((m: any) => mapMatch(m));

    // Merge: live overrides scheduled by id
    //const liveMap = new Map(mappedLive.map((m: any) => [m.id, m]));
    //const merged = mappedEvents.map((ev: any) => liveMap.get(ev.id) || ev);
    const liveMap = new Map(mappedLive.map((m: any) => [m.id, m]));
    const merged = mappedEvents.map((ev: any) => {
      const live = liveMap.get(ev.id);
      if (live) return { ...ev, ...live, round: ev.round }; // keep round from event
      return ev;
    });
    mappedLive.forEach((m: any) => {
      if (!mappedEvents.find((ev: any) => String(ev.id) === String(m.id))) merged.push(m);
    });

    // Final dedupe by string id to guarantee no duplicate keys downstream
    const dedupMap = new Map<string, any>();
    for (const m of merged) dedupMap.set(String(m.id), m);
    const deduped = Array.from(dedupMap.values());

    console.log(
      `[laliga-matches] total=${totalCount} fetched=${allResults.length} live=${liveEvents.length} merged=${merged.length} deduped=${deduped.length}`
    );

    return new Response(JSON.stringify(deduped), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Bzzoiro v2 API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch match data", matches: [] }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
