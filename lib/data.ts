import { supabasePublic } from "@/lib/supabase/server";
import { DEFAULT_BLOCKS, type Block } from "@/lib/blocks";
import { SITE } from "@/lib/site";

export async function getHome(): Promise<{ blocks: Block[]; eventDate: string; cookieText: string }> {
  try {
    const sb = supabasePublic();
    const [{ data: page }, { data: settings }] = await Promise.all([
      sb.from("pages").select("published").eq("slug", "home").maybeSingle(),
      sb.from("settings").select("key,value").in("key", ["event_date", "cookie_text"]),
    ]);
    const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));
    const published = page?.published as Block[] | undefined;
    return {
      blocks: published && published.length ? published : DEFAULT_BLOCKS,
      eventDate: (s.event_date as string) || SITE.eventDate,
      cookieText: (s.cookie_text as string) || "We use cookies to improve your experience.",
    };
  } catch {
    return { blocks: DEFAULT_BLOCKS, eventDate: SITE.eventDate, cookieText: "We use cookies to improve your experience." };
  }
}
