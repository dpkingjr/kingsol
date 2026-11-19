"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { PASSWORD_MIN } from "@/lib/password-rules";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="form narrow" key={state.ok ?? "form"}>
      <label className="field">
        <span>Current password</span>
        <input name="current" type="password" autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>New password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} required />
        <small>At least {PASSWORD_MIN} characters.</small>
      </label>
      <label className="field">
        <span>Repeat new password</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} required />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="form-ok" role="status">
          {state.ok}
        </p>
      )}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
