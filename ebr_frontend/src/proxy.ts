import { NextRequest, NextResponse } from "next/server";
import { API_ROUTES } from "@/lib/api-routes";

const authPaths = ["/login", "/register", "/forgot-password"];
const protectedPaths = [
  "/",
  "/home",
  "/cleaning-checklists",
  "/features",
  "/filter-usage-records",
  "/finished-product-production-orders",
  "/finished-products",
  "/pressure-differentials",
  "/product-orders",
  "/production-order-deviations",
  "/semi-finished-products",
  "/raw-materials",
  "/reports",
  "/label",
  "/profile",
  "/setting",
  "/settings",
  "/contract",
  "/department",
  "/company",
];
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
const refreshEndpoint = API_ROUTES.auth.refreshToken;
const isSecureCookie = process.env.NODE_ENV === "production";
const isHttpOnlyCookie = process.env.COOKIE_HTTP_ONLY === "true";

export default async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasAccessToken = Boolean(accessToken);
  const hasRefreshToken = Boolean(refreshToken);
  const hasValidAccessToken =
    hasAccessToken && !isAccessTokenExpired(accessToken);
  const isLoggedIn = hasValidAccessToken && hasRefreshToken;
  const { pathname } = request.nextUrl;
  const isAuthPath = authPaths.includes(pathname);
  const isProtectedPath = protectedPaths.some((path) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`),
  );

  // Restore the session before deciding whether an auth, root, or protected
  // route should redirect. Previously /login and / returned too early, so a
  // valid refresh token could never replace a missing/expired access token.
  if (
    hasRefreshToken &&
    !hasValidAccessToken &&
    (isAuthPath || isProtectedPath)
  ) {
    const refreshResponse = await refreshAccessToken(
      request,
      refreshToken,
      isAuthPath || pathname === "/" ? "/home" : request.url,
    );
    if (refreshResponse) {
      return refreshResponse;
    }

    if (isAuthPath) {
      return reloadAndClearAuthCookies(request);
    }
    return redirectToLoginAndClearAuthCookies(request);
  }

  if (pathname === "/") {
    const target = isLoggedIn ? "/home" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (isLoggedIn && isAuthPath) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!isLoggedIn && isProtectedPath) {
    return redirectToLoginAndClearAuthCookies(request);
  }

  return NextResponse.next();
}

const refreshAccessToken = async (
  request: NextRequest,
  refreshToken: string | undefined,
  redirectTarget: string,
) => {
  if (!refreshToken || !backendBaseUrl) {
    return null;
  }
  try {
    const response = await fetch(`${backendBaseUrl}${refreshEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) {
      return null;
    }
    const maxAge = getAccessTokenMaxAge(data.accessToken, 15 * 60);
    const redirectResponse = NextResponse.redirect(
      new URL(redirectTarget, request.url),
    );
    redirectResponse.cookies.set({
      name: "accessToken",
      value: data.accessToken,
      httpOnly: isHttpOnlyCookie,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: isSecureCookie,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    return redirectResponse;
  } catch {
    return null;
  }
};

const getAccessTokenMaxAge = (token: string, fallbackSeconds: number) => {
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) {
      return fallbackSeconds;
    }
    const payloadJson = decodeBase64Url(payloadBase64);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== "number") {
      return fallbackSeconds;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAge = payload.exp - nowSeconds;
    return maxAge > 0 ? maxAge : fallbackSeconds;
  } catch {
    return fallbackSeconds;
  }
};

const isAccessTokenExpired = (token: string | undefined) => {
  if (!token) {
    return true;
  }
  const maxAge = getAccessTokenMaxAge(token, 0);
  return maxAge <= 0;
};

const redirectToLoginAndClearAuthCookies = (request: NextRequest) => {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearAuthCookies(response);
  return response;
};

const reloadAndClearAuthCookies = (request: NextRequest) => {
  const response = NextResponse.redirect(request.url);
  clearAuthCookies(response);
  return response;
};

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.set({
    name: "accessToken",
    value: "",
    httpOnly: isHttpOnlyCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isSecureCookie,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookies.set({
    name: "refreshToken",
    value: "",
    httpOnly: isHttpOnlyCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isSecureCookie,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  if (typeof atob === "function") {
    return atob(padded);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder available");
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
