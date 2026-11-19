import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatTime } from "@/lib/format";
import { GAME_NAMES, getStats } from "@/lib/gameData";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Account · Kingsol Solitaire" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="page">
      <PageHeader title="Account" />
      <main className="page-main">
        <Suspense fallback={<p className="muted">Loading your account…</p>}>
          <AccountContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function AccountContent({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const [{ welcome }, stats] = await Promise.all([searchParams, getStats(user.id)]);
  const mustChange = user.mustChangePassword;

  return (
    <>
      {mustChange && (
        <div className="notice" role="status">
          {welcome ? `Welcome, ${user.displayName}! ` : ""}Your password was set by an administrator. Please choose
          your own now.
        </div>
      )}

      <section className="panel table">
        <h2>Your statistics</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Played</th>
                <th scope="col">Won</th>
                <th scope="col">Win rate</th>
                <th scope="col">Best time</th>
                <th scope="col">Fewest moves</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.game}>
                  <th scope="row">{GAME_NAMES[s.game]}</th>
                  <td>{s.played}</td>
                  <td>{s.won}</td>
                  <td>{s.played ? `${Math.round((s.won / s.played) * 100)}%` : "–"}</td>
                  <td>{s.bestSeconds != null ? formatTime(s.bestSeconds) : "–"}</td>
                  <td>{s.bestMoves ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">A game counts as played once you make your first move.</p>
      </section>

      <section className="panel table">
        <h2>Profile</h2>
        <dl className="profile">
          <dt>Display name</dt>
          <dd>{user.displayName}</dd>
          <dt>Username</dt>
          <dd>{user.username}</dd>
          <dt>Role</dt>
          <dd>{user.role === "admin" ? "Administrator" : "Player"}</dd>
        </dl>
        <p className="muted small">Ask an administrator to change your display name.</p>
      </section>

      <section className="panel table" id="password">
        <h2>{mustChange ? "Choose your password" : "Change password"}</h2>
        <ChangePasswordForm />
      </section>
    </>
  );
}
