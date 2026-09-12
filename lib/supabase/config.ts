export const cookieOptions = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN
  ? {
      domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    }
  : { sameSite: "lax" as const, path: "/" };
