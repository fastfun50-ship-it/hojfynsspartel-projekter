"use client";

import UndoBanner from "./UndoBanner";
import { type FieldTabId } from "@/lib/fieldDemo";
import FieldTabBar from "./field/FieldTabBar";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  userName: string;
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function activeTab(pathname: string | null, tabParam: string | null): FieldTabId | null {
  if (!pathname) return null;
  if (pathname === "/app") {
    if (
      tabParam === "rum" ||
      tabParam === "materialer" ||
      tabParam === "resultat" ||
      tabParam === "mere" ||
      tabParam === "job"
    ) {
      return tabParam;
    }
    // Camera flow (opened from Rum) — highlight Rum in chrome nav
    if (tabParam === "foto") return "rum";
    if (tabParam === "idag" || tabParam === "uge" || tabParam === "sager") return "job";
    return "job";
  }
  if (pathname.startsWith("/app/sag")) return "mere";
  if (pathname.startsWith("/app/projekter")) return "mere";
  if (pathname.startsWith("/app/admin")) return "mere";
  return null;
}

export default function AppChrome({ userName, children }: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const onFieldHome = pathname === "/app";
  const onSag = !!pathname?.startsWith("/app/sag");
  const tab = activeTab(pathname, search.get("tab"));
  /* Field home: FieldShell owns the bar. Mere children (admin, projekter/ny, …): same FieldTabBar. */
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
      {showBottom ? <FieldTabBar active={tab} fixed /> : null}
    </div>
  );
}
