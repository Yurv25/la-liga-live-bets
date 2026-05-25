import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://sports.bzzoiro.com/api";
const LA_LIGA_ID = 3;
const WORLD_CUP_ID = 27;
const PAGE_SIZE = 200;
const MAX_PAGES = 20; // safety cap (4000 matches)
const LA_LIGA_SEASON_ID = 294;
const WORLD_CUP_GROUP_SEASON_ID = 383;
const WORLD_CUP_KNOCKOUT_SEASON_ID = 188;

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
    leagueId: ev.league_id ?? null,
    seasonId: ev.season_id ?? null,
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
    const [firstPageRes, wcGroupFirstPageRes, wcKnockoutFirstPageRes, liveRes, wcLiveRes] = await Promise.all([
      fetch(`${BASE_URL}/v2/events/?league_id=${LA_LIGA_ID}&season_id=${LA_LIGA_SEASON_ID}&limit=${PAGE_SIZE}&offset=0`, { headers }),
      fetch(`${BASE_URL}/v2/events/?league_id=${WORLD_CUP_ID}&season_id=${WORLD_CUP_GROUP_SEASON_ID}&limit=${PAGE_SIZE}&offset=0`, { headers }),
      fetch(`${BASE_URL}/v2/events/?league_id=${WORLD_CUP_ID}&season_id=${WORLD_CUP_KNOCKOUT_SEASON_ID}&limit=${PAGE_SIZE}&offset=0`, { headers }),
      fetch(`${BASE_URL}/v2/events/live/?league_id=${LA_LIGA_ID}`, { headers }),
      fetch(`${BASE_URL}/v2/events/live/?league_id=${WORLD_CUP_ID}`, { headers }),
    ]);

    if (!firstPageRes.ok) throw new Error(`Events API: ${firstPageRes.status}`);
    if (!wcGroupFirstPageRes.ok) throw new Error(`WC Group Events API: ${wcGroupFirstPageRes.status}`);
    if (!wcKnockoutFirstPageRes.ok) throw new Error(`WC Knockout Events API: ${wcKnockoutFirstPageRes.status}`);
    if (!liveRes.ok) throw new Error(`Live API: ${liveRes.status}`);
    if (!wcLiveRes.ok) throw new Error(`WC Live API: ${wcLiveRes.status}`);

    const firstPage = await firstPageRes.json();
    const wcGroupFirstPage = await wcGroupFirstPageRes.json();
    const wcKnockoutFirstPage = await wcKnockoutFirstPageRes.json();

    const wcResults: any[] = [
      ...(wcGroupFirstPage.results ?? []),
      ...(wcKnockoutFirstPage.results ?? []),
    ];

    const wcGroupTotalCount: number = wcGroupFirstPage.count ?? 0;
    const wcKnockoutTotalCount: number = wcKnockoutFirstPage.count ?? 0;

    const wcGroupTotalPages = Math.min(MAX_PAGES, Math.ceil(wcGroupTotalCount / PAGE_SIZE));
    const wcKnockoutTotalPages = Math.min(MAX_PAGES, Math.ceil(wcKnockoutTotalCount / PAGE_SIZE));

    //Paginate WC group stage
    if (wcGroupTotalPages > 1) {
      const wcOffsets: number[] = [];
      for (let p = 1; p < wcGroupTotalPages; p++) wcOffsets.push(p * PAGE_SIZE);
      const wcPages = await Promise.all(
        wcOffsets.map((offset) =>
          fetch(
            `${BASE_URL}/v2/events/?league_id=${WORLD_CUP_ID}&season_id=${WORLD_CUP_GROUP_SEASON_ID}&limit=${PAGE_SIZE}&offset=${offset}`,
            { headers }
          ).then((r) => (r.ok ? r.json() : { results: [] }))
        )
      );
      for (const pg of wcPages) {
        if (Array.isArray(pg.results)) wcResults.push(...pg.results);
      }
    }

    //Paginate WC knockout stage
    if (wcKnockoutTotalPages > 1) {
      const wcOffsets: number[] = [];
      for (let p = 1; p < wcKnockoutTotalPages; p++) wcOffsets.push(p * PAGE_SIZE);
      const wcPages = await Promise.all(
        wcOffsets.map((offset) =>
          fetch(
            `${BASE_URL}/v2/events/?league_id=${WORLD_CUP_ID}&season_id=${WORLD_CUP_KNOCKOUT_SEASON_ID}&limit=${PAGE_SIZE}&offset=${offset}`,
            { headers }
          ).then((r) => (r.ok ? r.json() : { results: [] }))
        )
      );
      for (const pg of wcPages) {
        if (Array.isArray(pg.results)) wcResults.push(...pg.results);
      }
    }


    const liveData = await liveRes.json();
    const wcLiveData = await wcLiveRes.json();
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
            `${BASE_URL}/v2/events/?league_id=${LA_LIGA_ID}&season_id=${LA_LIGA_SEASON_ID}&limit=${PAGE_SIZE}&offset=${offset}`,
            { headers }
          ).then((r) => (r.ok ? r.json() : { results: [] }))
        )
      );
      for (const pg of pages) {
        if (Array.isArray(pg.results)) allResults.push(...pg.results);
      }
    }

    const liveEvents: any[] = [
      ...(liveData.events ?? []),
      ...(wcLiveData.events ?? []),
    ];

    const mappedEvents = [...allResults, ...wcResults].map((ev: any) => mapMatch(ev));
    liveEvents.forEach((ev: any) => {
      console.log(`[live-period] id=${ev.id} status=${JSON.stringify(ev.status)} period=${JSON.stringify(ev.period)} minute=${JSON.stringify(ev.current_minute)}`);
    });
    const mappedLive = liveEvents.map((m: any) => mapMatch(m));
    // Merge: live overrides scheduled by id
    //const liveMap = new Map(mappedLive.map((m: any) => [m.id, m]));
    //const merged = mappedEvents.map((ev: any) => liveMap.get(ev.id) || ev);
    const liveMap = new Map(mappedLive.map((m: any) => [m.id, m]));
    const merged = mappedEvents.map((ev: any) => {
      const live = liveMap.get(ev.id);
      if (live) return { ...ev, ...live, round: ev.round, leagueId: ev.leagueId, seasonId: ev.seasonId }; // keep scheduling fields from event
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
