"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { passwordProblem, usernameProblem } from "@/lib/password";
import type { Role } from "@/lib/session";
import {
  adminCount,
  createUser,
  deleteUser,
  getUserRole,
  setPassword,
  signOutEverywhere,
  unlockUser,
  updateUser,
  usernameTaken,
} from "@/lib/users";
import type { FormState } from "@/app/actions/auth";
import { setGuestPlayAllowed } from "@/lib/settings";

/* Every action re-checks that the caller is an admin; the page hiding buttons is not security. */

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

/** Account ids are bigint row ids; anything else is refused before reaching the database. */
const userIdOf = (form: FormData) => {
  const id = field(form, "userId");
  return /^\d{1,18}$/.test(id) ? id : null;
};
const NO_SUCH = { error: "That account no longer exists." };

const asRole = (v: string): Role | null => (v === "admin" || v === "player" ? v : null);

const displayNameProblem = (name: string) =>
  name.length < 1 || name.length > 60 ? "Display names are 1–60 characters." : null;

export async function createUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin("/admin/users");
  const username = field(form, "username");
  const displayName = field(form, "displayName") || username;
  const password = form.get("password");
  const role = asRole(field(form, "role"));

  const problem =
    usernameProblem(username) ??
    displayNameProblem(displayName) ??
    (typeof password === "string" ? passwordProblem(password) : "Enter a temporary password.") ??
    (role ? null : "Choose a role.");
  if (problem) return { error: problem };
  if (await usernameTaken(username)) return { error: `The username "${username}" is already taken.` };

  await createUser({ username, displayName, password: password as string, role: role! });
  refresh();
  return { ok: `Created ${username}. They'll choose their own password when they first sign in.` };
}

export async function updateUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("/admin/users");
  const userId = userIdOf(form);
  if (!userId) return NO_SUCH;
  const displayName = field(form, "displayName");
  const role = asRole(field(form, "role"));
  const problem = displayNameProblem(displayName) ?? (role ? null : "Choose a role.");
  if (problem) return { error: problem };

  const currentRole = await getUserRole(userId);
  if (!currentRole) return NO_SUCH;
  if (currentRole === "admin" && role !== "admin") {
    if (userId === admin.id) return { error: "You can't remove your own admin role." };
    if ((await adminCount()) <= 1) return { error: "There must be at least one admin." };
  }

  await updateUser(userId, { displayName, role: role! });
  refresh();
  return { ok: "Saved." };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin("/admin/users");
  const userId = userIdOf(form);
  if (!userId) return NO_SUCH;
  const password = form.get("password");
  const problem = typeof password === "string" ? passwordProblem(password) : "Enter a temporary password.";
  if (problem) return { error: problem };
  if (!(await getUserRole(userId))) return NO_SUCH;

  await setPassword(userId, password as string, true);
  await signOutEverywhere(userId);
  refresh();
  return { ok: "Password reset. They're signed out and must choose a new password at next sign-in." };
}

export async function unlockUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin("/admin/users");
  const userId = userIdOf(form);
  if (!userId) return NO_SUCH;
  await unlockUser(userId);
  refresh();
  return { ok: "Unlocked." };
}

export async function signOutUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin("/admin/users");
  const userId = userIdOf(form);
  if (!userId) return NO_SUCH;
  await signOutEverywhere(userId);
  return { ok: "Signed out on all devices." };
}

export async function deleteUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("/admin/users");
  const userId = userIdOf(form);
  if (!userId) return NO_SUCH;
  if (userId === admin.id) return { error: "You can't delete your own account here." };
  const role = await getUserRole(userId);
  if (!role) return NO_SUCH;
  if (role === "admin" && (await adminCount()) <= 1) return { error: "There must be at least one admin." };

  await deleteUser(userId); // sessions, saves and stats go with it
  refresh();
  return { ok: "Deleted." };
}

export async function setGuestPlayAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin("/admin/users");
  const value = field(form, "guestPlay");
  if (value !== "on" && value !== "off") return { error: "Choose on or off." };
  await setGuestPlayAllowed(value === "on", admin.id);
  refresh();
  return {
    ok:
      value === "on"
        ? "Guest play is on. Anyone can play without signing in."
        : "Guest play is off. Visitors must sign in to play.",
  };
}
