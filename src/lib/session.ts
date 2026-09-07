import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";
import { SESSION_COOKIE } from "./constants";

export type SessionData = {
  user?: SessionUser;
};

export function sessionOptions(remember = false): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (min 32 chars). See .env.example");
  }
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

export async function getSession(remember?: boolean) {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions(remember));
}

export async function requireUser() {
  const session = await getSession();
  if (!session.user) return null;
  return session.user;
}
