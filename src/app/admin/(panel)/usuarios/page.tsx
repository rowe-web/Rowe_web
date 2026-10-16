import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { AdminOnly } from "@/admin/shell/AdminOnly";
import { UsersScreen, type UserRow } from "@/admin/screens/UsersScreen";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const user = await requirePageUser();
  if (user.role !== "admin") return <AdminOnly what="Los usuarios del panel solo los gestiona un administrador." />;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("admin_users");
  return <UsersScreen users={(data ?? []) as UserRow[]} meId={user.id} />;
}
