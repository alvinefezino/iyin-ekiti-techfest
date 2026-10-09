export type Item = Record<string, string>;
export type Block = { id: string; type: BlockType; props: Record<string, any>; name?: string; slug?: string; showInNav?: boolean };
export type BlockType =
  | "hero" | "about" | "tracks" | "schedule" | "prizes" | "speakers" | "sponsors"
  | "faq" | "register" | "attendees" | "tickets" | "newsletter" | "text" | "image" | "cta" | "footer";

export type SubFieldKind = "text" | "textarea" | "image" | "time" | "checkbox" | "select";
export type SubField = { key: string; label: string; kind: SubFieldKind; placeholder?: string; options?: string[] };
export type Field =
  | { key: string; label: string; kind: "text" | "textarea" | "image" | "time" | "checkbox" | "select"; placeholder?: string; options?: string[] }
  | { key: string; label: string; kind: "items"; fields: SubField[] };

export const BLOCK_DEFS: Record<BlockType, { label: string; nav?: boolean; defaults: Record<string, any>; fields: Field[] }> = {
  hero: {
    label: "Hero (3D laptop + countdown)",
    defaults: {
      eyebrow: "Thinking Beyond Borders",
      title: "Iyin Ekiti TechFest",
      subtitle: "A hackathon powered by FIESU and FUTES Gotham Mafians. 7 November 2026, 9:00 AM to 5:00 PM.",
      ctaLabel: "Register for the hackathon",
      ctaHref: "#register",
    },
    fields: [
      { key: "eyebrow", label: "Small line above title", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "subtitle", label: "Subtitle", kind: "textarea" },
      { key: "ctaLabel", label: "Button label", kind: "text" },
      { key: "ctaHref", label: "Button link", kind: "text" },
    ],
  },
  about: {
    label: "About the hackathon", nav: true,
    defaults: {
      heading: "About the hackathon",
      body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      items: [
        { value: "9AM-5PM", label: "7 November 2026" },
        { value: "100+", label: "Hackers" },
        { value: "10", label: "Mentors" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "image", label: "Photo (optional)", kind: "image" },
      { key: "items", label: "Stats", kind: "items", fields: [{ key: "value", label: "Value", kind: "text" }, { key: "label", label: "Label", kind: "text" }] },
    ],
  },
  tracks: {
    label: "Hackathon tracks", nav: true,
    defaults: {
      heading: "Tracks",
      items: [
        { title: "Track one", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
        { title: "Track two", body: "Sed do eiusmod tempor incididunt ut labore et dolore." },
        { title: "Track three", body: "Ut enim ad minim veniam, quis nostrud exercitation." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Tracks", kind: "items", fields: [{ key: "title", label: "Title", kind: "text" }, { key: "body", label: "Description", kind: "textarea" }, { key: "image", label: "Photo (optional)", kind: "image" }] },
    ],
  },
  schedule: {
    label: "Schedule", nav: true,
    defaults: {
      heading: "Schedule",
      items: [
        { start: "09:00", end: "10:00", title: "Opening ceremony", liveText: "Pelumi is on air", body: "Lorem ipsum dolor sit amet." },
        { start: "10:00", end: "16:00", title: "Hacking begins", liveText: "The hackers are active, and bombing", body: "Consectetur adipiscing elit." },
        { start: "16:00", end: "17:00", title: "Award giving", liveText: "There's a reward for every sleepless night", body: "Sed do eiusmod tempor." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Sessions", kind: "items", fields: [
        { key: "title", label: "Session title", kind: "text" },
        { key: "start", label: "Starts at (WAT, 24h)", kind: "time" },
        { key: "end", label: "Ends at (WAT, 24h)", kind: "time" },
        { key: "liveText", label: "Message shown while it is live", kind: "text" },
        { key: "body", label: "Description", kind: "textarea" },
        { key: "time", label: "Time label (optional, auto-filled from start and end)", kind: "text" },
        { key: "image", label: "Photo (optional)", kind: "image" },
      ] },
    ],
  },
  prizes: {
    label: "Prizes", nav: true,
    defaults: {
      heading: "Prizes",
      items: [
        { place: "1st place", prize: "₦100,000" },
        { place: "2nd place", prize: "₦75,000" },
        { place: "3rd place", prize: "₦50,000" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Prizes", kind: "items", fields: [{ key: "place", label: "Place", kind: "text" }, { key: "prize", label: "Prize", kind: "text" }, { key: "image", label: "Photo (optional)", kind: "image" }] },
    ],
  },
  speakers: {
    label: "People (speakers, judges, team)", nav: true,
    defaults: {
      heading: "Speakers and judges",
      items: [
        { name: "Speaker name", role: "Role, Company", image: "" },
        { name: "Speaker name", role: "Role, Company", image: "" },
        { name: "Speaker name", role: "Role, Company", image: "" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "People", kind: "items", fields: [{ key: "name", label: "Name", kind: "text" }, { key: "role", label: "Role", kind: "text" }, { key: "image", label: "Photo", kind: "image" }] },
    ],
  },
  sponsors: {
    label: "Sponsors",
    defaults: {
      heading: "Sponsors",
      items: [
        { name: "Sponsor", image: "", badge: "", highlight: "", promoEnabled: "", promoCode: "IYINTECHFEST", bankName: "", accountNumber: "", accountName: "" },
        { name: "Sponsor", image: "", badge: "", highlight: "", promoEnabled: "", promoCode: "IYINTECHFEST", bankName: "", accountNumber: "", accountName: "" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      {
        key: "items", label: "Sponsors", kind: "items", fields: [
          { key: "name", label: "Name", kind: "text" } as SubField,
          { key: "image", label: "Logo", kind: "image" } as SubField,
          { key: "badge", label: "Badge (e.g. Food sponsor — shows above card)", kind: "text", placeholder: "Food sponsor" } as SubField,
          { key: "highlight", label: "Highlight with animated orange arrow (clickable)", kind: "checkbox" } as SubField,
          { key: "promoEnabled", label: "Enable promo flow on click (shows promo code → payment modal)", kind: "checkbox" } as SubField,
          { key: "promoCode", label: "Promo code", kind: "text", placeholder: "IYINTECHFEST" } as SubField,
          { key: "bankName", label: "Bank name", kind: "text", placeholder: "e.g. Access Bank" } as SubField,
          { key: "accountNumber", label: "Account number", kind: "text", placeholder: "0123456789" } as SubField,
          { key: "accountName", label: "Account name", kind: "text", placeholder: "IYIN TECHFEST" } as SubField,
        ]
      },
    ],
  },
  faq: {
    label: "FAQ", nav: true,
    defaults: {
      heading: "FAQ",
      items: [
        { q: "Who can join?", a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
        { q: "Is it free?", a: "Sed do eiusmod tempor incididunt ut labore." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Questions", kind: "items", fields: [{ key: "q", label: "Question", kind: "text" }, { key: "a", label: "Answer", kind: "textarea" }] },
    ],
  },
  register: {
    label: "Hackathon registration form", nav: true,
    defaults: { heading: "Register for the hackathon", body: "Lorem ipsum dolor sit amet. Sign up your team before spots run out." },
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }],
  },
  attendees: {
    label: "Event registration form (attendees)", nav: true,
    defaults: { heading: "Register for the event", body: "Secure your spot at Iyin Ekiti TechFest. General attendance \u2014 no team needed." },
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }],
  },
  tickets: {
    label: "Buy tickets (Paystack)", nav: true,
    defaults: { heading: "Tickets", body: "Get your ticket. Your receipt and QR code are emailed to you.", price: "5000", name: "General admission" },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "name", label: "Ticket name", kind: "text" },
      { key: "price", label: "Price in naira", kind: "text" },
    ],
  },
  newsletter: {
    label: "Newsletter signup",
    defaults: { heading: "Stay in the loop", body: "Get an email whenever we update the event." },
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }],
  },
  text: {
    label: "Text section", nav: true,
    defaults: { heading: "Section heading", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }, { key: "image", label: "Photo (optional)", kind: "image" }],
  },
  image: {
    label: "Image",
    defaults: { src: "", alt: "", caption: "" },
    fields: [{ key: "src", label: "Image", kind: "image" }, { key: "alt", label: "Alt text", kind: "text" }, { key: "caption", label: "Caption", kind: "text" }],
  },
  cta: {
    label: "Call to action",
    defaults: { heading: "Ready to build?", body: "Lorem ipsum dolor sit amet.", label: "Register now", href: "#register" },
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }, { key: "label", label: "Button label", kind: "text" }, { key: "href", label: "Button link", kind: "text" }],
  },
  footer: {
    label: "Footer",
    defaults: {
      text: "Iyin Ekiti TechFest powered by FIESU and FUTES Gotham Mafians",
      items: [{ label: "Home", href: "#" }],
    },
    fields: [
      { key: "text", label: "Footer text", kind: "text" },
      { key: "items", label: "Links", kind: "items", fields: [{ key: "label", label: "Label", kind: "text" }, { key: "href", label: "Link", kind: "text" }] },
    ],
  },
};

export const newBlock = (type: BlockType): Block => ({
  id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  props: JSON.parse(JSON.stringify(BLOCK_DEFS[type].defaults)),
});

const order: BlockType[] = ["hero", "about", "tracks", "schedule", "prizes", "speakers", "sponsors", "faq", "register", "newsletter", "footer"];
export const DEFAULT_BLOCKS: Block[] = order.map((t) => ({ ...newBlock(t), id: t }));

// ---- Section names, URL slugs and navbar helpers ----
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const RESERVED = new Set(["admin", "api", "exam", "preview", "tickets", "login", "_next", "hero"]);

/** Unique URL slug for every block. Priority: pinned slug, section name, heading, block type. */
export function resolveSlugs(blocks: Block[]): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();
  for (const b of blocks) if (b.type === "hero") { out[b.id] = "hero"; used.add("hero"); }
  for (const b of blocks) {
    if (b.type === "hero") continue;
    let base = slugify(b.slug || "") || slugify(b.name || "") || slugify(String(b.props?.heading || b.props?.title || "")) || slugify(b.type);
    if (RESERVED.has(base)) base += "-section";
    let sl = base, n = 2;
    while (used.has(sl)) sl = `${base}-${n++}`;
    used.add(sl);
    out[b.id] = sl;
  }
  return out;
}

export const navLabel = (b: Block) => b.name || String(b.props?.heading || "") || "";
export const inNav = (b: Block) => b.type !== "hero" && (b.showInNav ?? !!BLOCK_DEFS[b.type]?.nav) && !!navLabel(b);
