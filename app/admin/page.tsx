import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/server";
import AdminApp from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await requireAdmin();
  if (!user) redirect("/admin/login");
  return <AdminApp email={user.email ?? ""} />;
}
