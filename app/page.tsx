import HomeView from "@/components/HomeView";
import { getHome } from "@/lib/data";

export const revalidate = 30;

export default async function Home() {
  const { blocks, eventDate, cookieText } = await getHome();
  return <HomeView blocks={blocks} eventDate={eventDate} cookieText={cookieText} />;
}
