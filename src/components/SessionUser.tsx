"use client";

import { createContext, useContext } from "react";

/** What client components may know about the signed-in user. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "player";
}

const SessionUserContext = createContext<PublicUser | null>(null);

export function SessionUserProvider({ user, children }: { user: PublicUser | null; children: React.ReactNode }) {
  return <SessionUserContext value={user}>{children}</SessionUserContext>;
}

/** The signed-in user, or null for a guest (or outside a provider). */
export function useSessionUser(): PublicUser | null {
  return useContext(SessionUserContext);
}
