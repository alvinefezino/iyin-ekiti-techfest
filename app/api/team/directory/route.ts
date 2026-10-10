import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Team directory: hackers + attendees + exam pass/fail
// Auth: allowed if (a) valid admin session OR (b) correct x-team-code header / ?code= when TEAM_CODE is set
// If TEAM_CODE is not set, admin session is required.

async function authorized(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin) return true;
  const teamCode = process.env.TEAM_CODE?.trim();
  if (!teamCode) return false;
  const headerCode = req.headers.get("x-team-code")?.trim() || "";
  const urlCode = req.nextUrl.searchParams.get("code")?.trim() || "";
  // also accept JSON body code for POST
  let bodyCode = "";
  if (req.method === "POST") {
    try {
      const j = await req.clone().json();
      bodyCode = String((j as any)?.code || "").trim();
    } catch {}
  }
  return headerCode === teamCode || urlCode === teamCode || bodyCode === teamCode;
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Unauthorized. Sign in as admin or provide team code." }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const sb = supabaseAdmin();

  const [regsRes, attendeesRes, invitesRes] = await Promise.all([
    sb.from("hackathon_registrations").select("id,full_name,email,phone,team_name,team_members,created_at").order("created_at", { ascending: false }),
    sb.from("event_attendees").select("id,full_name,email,phone,team_name,team_members,created_at").order("created_at", { ascending: false }),
    sb.from("exam_invites").select("email,status,score,disqualified_reason,created_at,submitted_at,started_at"),
  ]);

  if (regsRes.error) return NextResponse.json({ error: regsRes.error.message }, { status: 500 });
  if (attendeesRes.error) return NextResponse.json({ error: attendeesRes.error.message }, { status: 500 });

  const inviteMap = new Map<string, { status: string; score: number | null; disqualified_reason: string | null }>();
  for (const r of (invitesRes.data ?? []) as any[]) {
    inviteMap.set(String(r.email).toLowerCase(), { status: r.status, score: r.score ?? null, disqualified_reason: r.disqualified_reason ?? null });
  }

  const filter = (rows: any[]) => {
    if (!q) return rows;
    return rows.filter((r) => String(r.full_name || "").toLowerCase().includes(q) || String(r.email || "").toLowerCase().includes(q));
  };

  const hackers = filter((regsRes.data ?? []) as any[]).map((r: any) => {
    const inv = inviteMap.get(String(r.email).toLowerCase());
    const score = inv?.score ?? null;
    const status = inv?.status ?? "registered";
    const passed = inv ? (inv.status === "submitted" && (score ?? 0) >= 20 ? true : inv.status === "disqualified" ? false : null) : null;
    return { ...r, exam_status: status, exam_score: score, exam_passed: passed, exam_reason: inv?.disqualified_reason ?? null };
  });

  const attendees = filter((attendeesRes.data ?? []) as any[]);

  return NextResponse.json({ ok: true, hackers, attendees, q, counts: { hackers: hackers.length, attendees: attendees.length } });
}

export async function POST(req: NextRequest) {
  // Allow POST with code in body as alternative to GET
  return GET(req);
}
