import { redirect } from "next/navigation";
import { getTenantSession } from "@/lib/tenant-auth";
import TenantDashboard from "./tenant-dashboard";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const tenant = await getTenantSession();

  if (!tenant) {
    redirect("/portal/login");
  }

  return <TenantDashboard tenant={{ id: tenant.id, fullName: tenant.fullName, phone: tenant.phone }} />;
}
