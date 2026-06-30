import { AdminLayoutClient } from "@/app/admin/AdminLayoutClient";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
