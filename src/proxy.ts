// Next.js 16 renamed `middleware` to `proxy` (same functionality, new file name).
// Clerk v7 detects Next 16 and supports clerkMiddleware() in this file.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only the auth pages are public; everything else (incl. /api/*) requires sign-in.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect(); // unauthed: redirect pages to sign-in, 401 for /api/*
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, run on everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
