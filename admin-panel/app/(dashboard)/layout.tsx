import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!session.user.role) {
    redirect("/access-denied");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
