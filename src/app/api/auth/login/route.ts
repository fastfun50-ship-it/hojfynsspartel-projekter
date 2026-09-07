import { NextResponse } from "next/server";
import { verifyLogin } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const remember = Boolean(body.remember);

    if (!email || !password) {
      return NextResponse.json({ error: "Udfyld email og adgangskode" }, { status: 400 });
    }

    const user = await verifyLogin(email, password);
    if (!user) {
      return NextResponse.json({ error: "Forkert email eller adgangskode" }, { status: 401 });
    }

    const session = await getSession(remember);
    session.user = user;
    await session.save();

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login fejlede" }, { status: 500 });
  }
}
