import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Sign in</h1>
      <LoginForm />
      <p className="text-muted mt-6 text-sm">
        No account yet?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
