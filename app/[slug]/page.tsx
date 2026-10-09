import { notFound } from "next/navigation";
import HomeView from "@/components/HomeView";
import { getHome } from "@/lib/data";
import { resolveSlugs } from "@/lib/blocks";

export const revalidate = 30;

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { blocks, eventDate, cookieText } = await getHome();
  if (!Object.values(resolveSlugs(blocks)).includes(slug)) notFound();
  return <HomeView blocks={blocks} eventDate={eventDate} cookieText={cookieText} focus={slug} />;
}
