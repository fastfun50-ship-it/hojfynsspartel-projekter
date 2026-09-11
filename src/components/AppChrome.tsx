"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import UndoBanner from "./UndoBanner";
import { FIELD_TABS, type FieldTabId } from "@/lib/fieldDemo";

type Props = {
  userName: string;
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function activeTab(pathname: string | null, tabParam: string | null): FieldTabId | null {
  if (!pathname) return null;
  if (pathname === "/app") {
    if (tabParam === "uge" || tabParam === "sager" || tabParam === "mere") return tabParam;
    return "idag";
  }
  if (pathname.startsWith("/app/sag")) return "sager";
  if (pathname.startsWith("/app/projekter")) return "sager";
  if (pathname.startsWith("/app/admin")) return "mere";
  return null;
}

export default function AppChrome({ userName, children }: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const onFieldHome = pathname === "/app";
  const onSag = !!pathname?.startsWith("/app/sag");
  const tab = activeTab(pathname, search.get("tab"));
  const showBottom = !onFieldHome && !onSag;
  const showTopbar = !onFieldHome && !onSag;

  return (
    <div className={"shell" + (onFieldHome || onSag ? " shell-field" : "")}>
      {showTopbar ? (
        <header className="topbar">
          <div>
            <div className="brand-name">Højfynsspartel</div>
            <div className="hint">{userName}</div>
          </div>
        </header>
      ) : null}
      {!onFieldHome && !onSag ? <UndoBanner /> : null}
      {children}
      {showBottom ? (
        <nav className="field-tabs field-tabs-fixed" aria-label="Hovedmenu">
          {FIELD_TABS.map((t) => (
            <Link
              key={t.id}
              href={"/app?tab=" + t.id}
              className={"field-tab" + (tab === t.id ? " field-tab-active" : "")}
            >
              <span>{t.label}</span>
              {tab === t.id ? <span className="field-tab-line" /> : null}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
