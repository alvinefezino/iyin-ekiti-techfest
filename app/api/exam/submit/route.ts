import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";
import { sendEmail, shell } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { token?: string; answers?: Record<string, number>; violationReason?: string }
    | null;
  if (!body?.token || !body.answers) return NextResponse.json({ error: "token and answers required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,email,status").eq("token", body.token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "disqualified") return NextResponse.json({ error: "Disqualified" }, { status: 403 });
  if (invite.status === "submitted") return NextResponse.json({ error: "Already submitted" }, { status: 403 });

  const { data: dbQs } = await sb.from("exam_questions").select("id,answer").order("id");
  const key: Record<number, number> = {};
  if (dbQs && dbQs.length === 50) dbQs.forEach((q: any) => (key[q.id] = q.answer));
  else EXAM_QUESTIONS.forEach((q) => (key[q.id] = q.answer));

  let score = 0;
  for (const [k, v] of Object.entries(body.answers)) {
    const id = Number(k);
    if (key[id] === v) score += 1;
  }

  const violationReason = typeof body.violationReason === "string" ? body.violationReason.slice(0, 64) : null;

  const disqualifiedByScore = score < 20;
  const finalStatus = disqualifiedByScore ? "disqualified" : "submitted";
  const disqualifiedReason = violationReason ? violationReason : disqualifiedByScore ? "Score below required threshold" : null;

  const payload: Record<string, unknown> = {
    status: finalStatus,
    answers: body.answers,
    score,
    submitted_at: new Date().toISOString(),
  };
  if (disqualifiedReason) payload["disqualified_reason"] = disqualifiedReason;

  await sb.from("exam_invites").update(payload).eq("id", invite.id);

  // Resolve display name from hackathon registrations, fallback to Gmail local-part (e.g. john.doe@gmail.com -> John)
  let displayName = "";
  try {
    const { data: reg } = await sb.from("hackathon_registrations").select("full_name").ilike("email", invite.email).maybeSingle();
    if (reg?.full_name) displayName = String(reg.full_name).trim().split(/\s+/)[0].replace(/[^A-Za-z\-']/g, "") || String(reg.full_name).trim().split(/\s+/)[0] || "";
  } catch {}
  if (!displayName) {
    const local = String(invite.email).split("@")[0] || "";
    const first = local.split(/[._\-+]/)[0].replace(/\d+/g, "") || local.replace(/\d+/g, "") || "there";
    displayName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  // Send result mail without hyphen in visible text
  try {
    if (disqualifiedByScore) {
      const html = shell(`
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0a0a0a;line-height:1.6">
        <div style="background:#013216;color:#FFFFFF;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.02em">Update On Your Result</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px">Iyin Ekiti TechFest Hackathon by FIESU</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 12px">Hello ${displayName},</p>
          <p style="margin:0 0 12px">Thank you for taking part in the Iyin Ekiti TechFest assessment. We have reviewed your submission.</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#991B1B;font-weight:600">Your Score</div>
            <div style="font-size:28px;font-weight:800;color:#991B1B">${score} of 50</div>
            <div style="font-size:12px;color:#7F1D1D;margin-top:4px">Required to advance is 20 of 50</div>
          </div>
          <p style="margin:0 0 12px">We are sorry to let you know that you did not meet the requirements to move to the next stage at this time. This decision is based solely on the score threshold and is final for this round.</p>
          <p style="margin:0 0 12px">We truly value your interest and effort and we encourage you to stay connected for future opportunities with FIESU and Iyin Ekiti TechFest. Your passion for technology is appreciated and we hope to see you at upcoming events.</p>
          <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">With appreciation</p>
          <p style="margin:2px 0 0;font-size:13px;color:#013216">FIESU and Iyin Ekiti TechFest Team</p>
          <p style="font-size:11px;color:#9CA3AF;margin:12px 0 0">Questions? Reply to this mail and our team will respond.</p>
        </div>
      </div>
    `);
      await sendEmail(invite.email, "Update On Your Iyin Ekiti TechFest Result", html);
    } else {
      const html = shell(`
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0a0a0a;line-height:1.65">
        <div style="background:#013216;color:#FFFFFF;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:19px;font-weight:800;line-height:1.3">Congratulations! You have Qualified for the Iyin Ekiti Tech Fest 2026 Hackathon Stage</div>
          <div style="font-size:13px;opacity:0.9;margin-top:6px">Iyin Ekiti TechFest Hackathon by FIESU</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 12px">Hi ${displayName},</p>
          <p style="margin:0 0 12px;font-weight:700">Congratulations!</p>
          <p style="margin:0 0 12px">You have successfully passed the first stage of the Iyin Ekiti Tech Fest 2026 Hackathon, and we are pleased to inform you that you have qualified for the next stage!</p>
          <p style="margin:0 0 12px">Your performance in the objective assessment has earned you a place in the next phase of the competition. Now, it is time to move beyond answering questions and start demonstrating what you can build.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#166534;font-weight:600">Your Score</div>
            <div style="font-size:28px;font-weight:800;color:#166534">${score} of 50</div>
            <div style="font-size:12px;color:#15803D;margin-top:4px">Required to advance was 20 of 50</div>
          </div>
          <div style="background:#013216;color:#FFFFFF;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
            <div style="font-size:15px;font-weight:800">What is Next?</div>
            <div style="font-size:12px;opacity:0.9;margin-top:4px">For the next stage, you will be expected to develop a project idea into a Minimum Viable Product (MVP) and present your solution to the judges.</div>
          </div>
          <p style="margin:0 0 12px">An MVP is a basic but functional version of your product that demonstrates its core purpose and shows how it solves a particular problem. You do not need to build a complete, market ready application, but you should have something tangible to demonstrate.</p>
          <p style="margin:16px 0 8px;font-weight:800;color:#013216">Here are the things you need to prepare:</p>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:12px 0">
            <div style="font-weight:800;color:#013216;margin-bottom:6px">1. Build Your Project to the MVP Stage</div>
            <ul style="margin:0;padding-left:18px">
              <li>Identify a real problem your project intends to solve.</li>
              <li>Develop a working prototype that demonstrates the core functionality of your solution.</li>
              <li>Focus on the most important features rather than trying to build everything at once.</li>
              <li>Be prepared to demonstrate what works and explain what you intend to improve.</li>
            </ul>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:12px 0">
            <div style="font-weight:800;color:#013216;margin-bottom:6px">2. Prepare Your Presentation Slides</div>
            <p style="margin:0 0 8px">Every participant or team must prepare slides to support their presentation. Your slides should cover:</p>
            <ul style="margin:0;padding-left:18px">
              <li><strong>Problem Statement:</strong> What problem are you solving, and who experiences it?</li>
              <li><strong>Your Solution:</strong> How does your project address the problem?</li>
              <li><strong>Technology Stack:</strong> What programming languages, frameworks, tools, or technologies did you use?</li>
              <li><strong>Demonstration:</strong> Show us your MVP and explain how it works.</li>
              <li><strong>Innovation and Impact:</strong> What makes your solution useful, and what difference could it make?</li>
              <li><strong>Future Improvements:</strong> What would you build next if you had more time?</li>
            </ul>
            <p style="margin:10px 0 0;font-size:13px;color:#475569">Keep your slides clear, concise, and focused on your actual work.</p>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:12px 0">
            <div style="font-weight:800;color:#013216;margin-bottom:6px">3. Be Ready to Defend Your Work</div>
            <p style="margin:0 0 8px">The judges may ask questions about your implementation, technical decisions, target users, and how your solution addresses the problem.</p>
            <p style="margin:0 0 8px">Make sure you understand the code and technologies used in your project. If you are working in a team, every member should understand the project, not just the person who wrote the code.</p>
            <p style="margin:0">Remember, we are interested in your problem solving ability, technical understanding, creativity, and the value of your solution.</p>
          </div>
          <div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:12px;padding:16px;margin:20px 0">
            <div style="font-weight:800;color:#9A3412;margin-bottom:6px">Team and WhatsApp Group Instructions</div>
            <p style="margin:0 0 8px">If you are participating as part of a team, only the team lead should join the official hackathon WhatsApp group on behalf of the team.</p>
            <p style="margin:0 0 8px">The team lead will receive updates and communicate relevant information to the other team members.</p>
            <p style="margin:0 0 12px">If you registered as an individual participant, you are welcome to join the group yourself.</p>
            <p style="margin:0 0 10px;font-weight:700">Join the official WhatsApp group here:</p>
            <a href="https://chat.whatsapp.com/F3xKCG0ZM4CB4qlllr99hI?s=cl&p=a&mlu=4&ilr=4" style="display:inline-block;background:#25D366;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:700;font-size:13px">Join WhatsApp Group</a>
            <div style="font-size:11px;color:#9CA3AF;margin-top:8px;word-break:break-all">https://chat.whatsapp.com/F3xKCG0ZM4CB4qlllr99hI?s=cl&amp;p=a&amp;mlu=4&amp;ilr=4</div>
          </div>
          <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">With congratulations</p>
          <p style="margin:2px 0 0;font-size:13px;color:#013216">FIESU and Iyin Ekiti TechFest Team</p>
        </div>
      </div>
    `);
      await sendEmail(invite.email, "Congratulations! You have Qualified for the Iyin Ekiti Tech Fest 2026 Hackathon Stage", html);
    }
  } catch {}

  return NextResponse.json({ ok: true, score, total: 50, status: finalStatus });
}
