"use server";

import { redirect } from "next/navigation";
import { requireUser, safeNext } from "@/lib/auth";
import { createSession, deleteOtherSessions, deleteSession } from "@/lib/session";
import { authenticate, checkPassword, setPassword } from "@/lib/users";
import { passwordProblem } from "@/lib/password";

export interface FormState {
  error?: string;
  ok?: string;
}

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const username = field(form, "username").trim();
  const password = field(form, "password");
  if (!username || !password) return { error: "Enter your username and password." };

  const result = await authenticate(username, password);
  if (!result.ok) return { error: result.error };

  await createSession(result.userId);
  // Accounts made or reset by an admin pick their own password first.
  redirect(result.mustChangePassword ? "/account?welcome=1" : safeNext(field(form, "next")));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const current = field(form, "current");
  const next = field(form, "password");
  const confirm = field(form, "confirm");

  if (!(await checkPassword(user.id, current))) return { error: "Your current password is wrong." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (next === current) return { error: "Choose a password different from your current one." };

  await setPassword(user.id, next, false);
  await deleteOtherSessions(user.id);
  return { ok: "Password changed. You've been signed out on other devices." };
}
