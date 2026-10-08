export type Item = Record<string, string>;
export type Block = { id: string; type: BlockType; props: Record<string, any> };
export type BlockType =
  | "hero" | "about" | "tracks" | "schedule" | "prizes" | "speakers" | "sponsors"
  | "faq" | "register" | "tickets" | "newsletter" | "text" | "image" | "cta" | "footer";

export type Field =
  | { key: string; label: string; kind: "text" | "textarea" | "image" }
  | { key: string; label: string; kind: "items"; fields: { key: string; label: string; kind: "text" | "textarea" | "image" }[] };

export const BLOCK_DEFS: Record<BlockType, { label: string; nav?: boolean; defaults: Record<string, any>; fields: Field[] }> = {
  hero: {
    label: "Hero (3D laptop + countdown)",
    defaults: {
      eyebrow: "Thinking Beyond Borders",
      title: "Iyin-Ekiti TechFest",
      subtitle: "A hackathon powered by Fiesu and FUTES Gotham Mafians. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
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
        { value: "48h", label: "Of non-stop building" },
        { value: "100+", label: "Hackers" },
        { value: "10", label: "Mentors" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
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
      { key: "items", label: "Tracks", kind: "items", fields: [{ key: "title", label: "Title", kind: "text" }, { key: "body", label: "Description", kind: "textarea" }] },
    ],
  },
  schedule: {
    label: "Schedule", nav: true,
    defaults: {
      heading: "Schedule",
      items: [
        { time: "Day 1, 9:00 AM", title: "Opening ceremony", body: "Lorem ipsum dolor sit amet." },
        { time: "Day 1, 11:00 AM", title: "Hacking begins", body: "Consectetur adipiscing elit." },
        { time: "Day 2, 4:00 PM", title: "Final pitches", body: "Sed do eiusmod tempor." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Sessions", kind: "items", fields: [{ key: "time", label: "Time", kind: "text" }, { key: "title", label: "Title", kind: "text" }, { key: "body", label: "Description", kind: "textarea" }] },
    ],
  },
  prizes: {
    label: "Prizes", nav: true,
    defaults: {
      heading: "Prizes",
      items: [
        { place: "1st place", prize: "₦000,000 + mentorship" },
        { place: "2nd place", prize: "₦000,000" },
        { place: "3rd place", prize: "₦000,000" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Prizes", kind: "items", fields: [{ key: "place", label: "Place", kind: "text" }, { key: "prize", label: "Prize", kind: "text" }] },
    ],
  },
  speakers: {
    label: "Speakers, mentors and judges", nav: true,
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
    defaults: { heading: "Sponsors", items: [{ name: "Sponsor", image: "" }, { name: "Sponsor", image: "" }] },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "items", label: "Sponsors", kind: "items", fields: [{ key: "name", label: "Name", kind: "text" }, { key: "image", label: "Logo", kind: "image" }] },
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
    defaults: { heading: "Register", body: "Lorem ipsum dolor sit amet. Sign up your team before spots run out." },
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
    fields: [{ key: "heading", label: "Heading", kind: "text" }, { key: "body", label: "Body", kind: "textarea" }],
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
      text: "Iyin-Ekiti TechFest powered by Fiesu and FUTES Gotham Mafians",
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
