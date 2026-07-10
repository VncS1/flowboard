"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CurrentUser } from "@/lib/api";
import { logout } from "@/lib/auth";
import { colorForUserId, initials } from "@/lib/memberColor";

import { LogOutIcon } from "./icons";

export function Header({ user, boardName }: { user: CurrentUser; boardName?: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-surface border-border border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4 text-sm">
          <span className="from-primary to-accent-2 bg-gradient-to-r bg-clip-text text-sm font-bold text-transparent">
            Flowboard
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/boards" className="hover:text-primary font-medium">
              Boards
            </Link>
            {boardName ? (
              <>
                <span className="text-muted" aria-hidden="true">
                  /
                </span>
                <span className="truncate font-medium">{boardName}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <div
            title={user.name}
            style={{ backgroundColor: colorForUserId(user.id) }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
          >
            {initials(user.name)}
          </div>
          <span className="text-muted">{user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className="hover:bg-bg hover:text-primary rounded-md p-1.5 disabled:opacity-50"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
