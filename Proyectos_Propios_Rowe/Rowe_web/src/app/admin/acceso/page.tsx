import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/admin/screens/LoginForm";
import { siteHost } from "@/lib/site";

export const metadata: Metadata = { title: "Acceso" };

export default function LoginPage({ searchParams }: PageProps<"/admin/acceso">) {
  return (
    <main className="flex min-h-screen-safe items-center justify-center p-6">
      <Suspense>
        <Login searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/admin/acceso">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return <LoginForm next={next} linkError={sp.error === "enlace"} host={siteHost} />;
}
