"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Username</span>
        <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary wide" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
