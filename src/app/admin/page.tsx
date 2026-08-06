import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminApp from "./admin-app";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/admin/login");
  }

  return <AdminApp user={{ id: user.id, name: user.name, email: user.email, role: user.role }} />;
}
