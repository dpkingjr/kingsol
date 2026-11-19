import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { guestPlayAllowed } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · Kingsol Solitaire" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="auth-page">
      <section className="panel table auth-panel">
        <h1>Sign in</h1>
        <p className="muted">Sign in to keep your saved games and stats with your account.</p>
        {/* ?next= is request data, so the form that uses it streams in; the fallback is the same form */}
        <Suspense fallback={<LoginForm next="/" />}>
          <LoginWithNext searchParams={searchParams} />
        </Suspense>
        <p className="muted small">
          Accounts are created by an administrator.{" "}
          <Suspense fallback={null}>
            <GuestLink />
          </Suspense>
        </p>
      </section>
    </main>
  );
}

async function LoginWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}

/** "Play as a guest" while guests may play; otherwise say why signing in is required. */
async function GuestLink() {
  await connection(); // a live setting: read per request, never at build time
  return (await guestPlayAllowed()) ? <Link href="/">Play as a guest</Link> : <>Guest play is turned off.</>;
}
