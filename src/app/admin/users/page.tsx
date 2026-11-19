import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { guestPlayAllowed } from "@/lib/settings";
import { listUsers } from "@/lib/users";
import { CreateUserForm, GuestAccessForm, UserRowControls } from "./UserForms";

export const metadata: Metadata = { title: "Manage users · Kingsol Solitaire" };

export default function AdminUsersPage() {
  return (
    <div className="page">
      <PageHeader title="Manage users" />
      <main className="page-main wide">
        <Suspense fallback={<p className="muted">Loading users…</p>}>
          <UsersAdmin />
        </Suspense>
      </main>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "Never");

async function UsersAdmin() {
  const admin = await requireAdmin("/admin/users");
  const [users, guestsAllowed] = await Promise.all([listUsers(), guestPlayAllowed()]);

  return (
    <>
      <section className="panel table">
        <h2>Guest access</h2>
        <GuestAccessForm allowed={guestsAllowed} />
      </section>

      <section className="panel table">
        <h2>Add a user</h2>
        <p className="muted small">
          Give them their username and temporary password. They choose their own password when they first sign in.
        </p>
        <CreateUserForm />
      </section>

      <section className="panel table">
        <h2>
          Users <span className="muted">({users.length})</span>
        </h2>
        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id} className="user-card">
              <div className="user-card-head">
                <div>
                  <strong>{u.displayName}</strong> <span className="muted">@{u.username}</span>
                  {u.id === admin.id && <span className="badge">you</span>}
                  {u.role === "admin" && <span className="badge">admin</span>}
                  {u.locked && <span className="badge warn">locked</span>}
                  {u.mustChangePassword && <span className="badge muted-badge">temporary password</span>}
                </div>
                <div className="muted small">
                  Created {when(u.createdAt)} · Last sign-in {when(u.lastLoginAt)}
                </div>
              </div>
              <UserRowControls user={u} isSelf={u.id === admin.id} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
