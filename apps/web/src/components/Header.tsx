"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CurrentUser } from "@/lib/api";
import { logout } from "@/lib/auth";

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
        <div className="flex min-w-0 items-center gap-2 text-sm">
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
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="text-muted">{user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="hover:bg-bg hover:text-primary rounded-md px-3 py-1.5 font-medium disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
