import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("token")?.value;
  if (!token) return false;

  const secret = process.env.JWT_SECRET ?? "insecure-dev-secret";

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  if (await hasValidSession(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/boards/:path*"],
};
