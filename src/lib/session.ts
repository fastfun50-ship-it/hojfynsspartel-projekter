import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";
import { SESSION_COOKIE } from "./constants";

export type SessionData = {
  user?: SessionUser;
};

function getSecretOrNull(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

/** Call only when writing a session (login). Throws if secret missing/short. */
export function assertSessionSecret(): string {
  const secret = getSecretOrNull();
  if (!secret) {
    throw new Error("SESSION_SECRET must be set (min 32 chars). See .env.example");
  }
  return secret;
}

export function hasSessionSecret(): boolean {
  return getSecretOrNull() !== null;
}

export function sessionOptions(remember = false): SessionOptions {
  const secret = assertSessionSecret();
  return {
    cookieName: SESSION_COOKIE,
    password: secret,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
    },
  };
}

function emptySession(): IronSession<SessionData> {
  return {
    save: async () => {
      throw new Error("SESSION_SECRET mangler — kan ikke gemme session. Se /setup");
    },
    destroy: async () => {},
    updateConfig: () => {},
  } as IronSession<SessionData>;
}

/**
 * Read session. If SESSION_SECRET is missing, returns an empty session
 * instead of throwing (avoids 500 on every page).
 */
export async function getSession(remember?: boolean) {
  if (!getSecretOrNull()) {
    return emptySession();
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions(remember));
}

export async function requireUser() {
  const session = await getSession();
  if (!session.user) return null;
  return session.user;
}
