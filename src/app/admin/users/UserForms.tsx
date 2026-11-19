"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { PASSWORD_MIN } from "@/lib/password-rules";
import type { UserRow } from "@/lib/users";
import {
  createUserAction,
  setGuestPlayAction,
  deleteUserAction,
  resetPasswordAction,
  signOutUserAction,
  unlockUserAction,
  updateUserAction,
} from "./actions";

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="form-ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, {});
  return (
    // a successful create remounts the form, clearing it for the next user
    <form action={action} className="form grid-form" key={state.ok ?? "create"}>
      <label className="field">
        <span>Username</span>
        <input name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} required pattern="[a-zA-Z0-9_.\-]{3,32}" />
      </label>
      <label className="field">
        <span>Display name</span>
        <input name="displayName" autoComplete="off" maxLength={60} placeholder="Same as username" />
      </label>
      <label className="field">
        <span>Temporary password</span>
        <input name="password" type="text" autoComplete="new-password" minLength={PASSWORD_MIN} required />
      </label>
      <label className="field">
        <span>Role</span>
        <select name="role" defaultValue="player">
          <option value="player">Player</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div className="grid-form-actions">
        <button className="primary" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add user"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

/** Edit, reset, unlock, sign out and delete controls for one account. */
export function UserRowControls({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [editState, edit, editing] = useActionState<FormState, FormData>(updateUserAction, {});
  const [resetState, reset, resetting] = useActionState<FormState, FormData>(resetPasswordAction, {});
  const [miscState, misc, busy] = useActionState<FormState, FormData>(async (prev: FormState, form: FormData) => {
    const op = form.get("op");
    if (op === "unlock") return unlockUserAction(prev, form);
    if (op === "signout") return signOutUserAction(prev, form);
    if (op === "delete") return deleteUserAction(prev, form);
    return prev;
  }, {});

  return (
    <div className="user-controls">
      <form action={edit} className="inline-form">
        <input type="hidden" name="userId" value={user.id} />
        <label className="field compact">
          <span>Display name</span>
          <input name="displayName" defaultValue={user.displayName} maxLength={60} required />
        </label>
        <label className="field compact">
          <span>Role</span>
          <select name="role" defaultValue={user.role} disabled={isSelf}>
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
          {/* a disabled select isn't submitted; your own role can't change here */}
          {isSelf && <input type="hidden" name="role" value={user.role} />}
        </label>
        <button type="submit" disabled={editing}>
          Save
        </button>
        <Message state={editState} />
      </form>

      <form action={reset} className="inline-form" key={resetState.ok ?? "reset"}>
        <input type="hidden" name="userId" value={user.id} />
        <label className="field compact">
          <span>New temporary password</span>
          <input name="password" type="text" autoComplete="new-password" minLength={PASSWORD_MIN} required />
        </label>
        <button type="submit" disabled={resetting}>
          Reset password
        </button>
        <Message state={resetState} />
      </form>

      <form
        action={misc}
        className="inline-form"
        onSubmit={(e) => {
          const op = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
          if (op === "delete" && !confirm(`Delete ${user.username}? Their saved games and stats are deleted too.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={user.id} />
        {user.locked && (
          <button type="submit" name="op" value="unlock" disabled={busy}>
            Unlock
          </button>
        )}
        <button type="submit" name="op" value="signout" disabled={busy}>
          Sign out everywhere
        </button>
        {!isSelf && (
          <button type="submit" name="op" value="delete" className="danger" disabled={busy}>
            Delete
          </button>
        )}
        <Message state={miscState} />
      </form>
    </div>
  );
}

/** Turn guest play on or off for the whole site. */
export function GuestAccessForm({ allowed }: { allowed: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setGuestPlayAction, {});
  return (
    <form action={action} className="guest-access">
      <p className="guest-status">
        <span className={allowed ? "status-dot on" : "status-dot off"} aria-hidden />
        {allowed ? (
          <span>
            <strong>On</strong>: anyone can play without signing in. Guests&apos; games are saved in their own browser.
          </span>
        ) : (
          <span>
            <strong>Off</strong>: visitors who aren&apos;t signed in see a sign-in prompt instead of the games.
          </span>
        )}
      </p>
      <input type="hidden" name="guestPlay" value={allowed ? "off" : "on"} />
      <div className="inline-form">
        <button type="submit" className={allowed ? "danger" : "primary"} disabled={pending}>
          {allowed ? "Turn off guest play" : "Turn on guest play"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
