import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Create your account</h1>
      <SignupForm />
      <p className="text-muted mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
