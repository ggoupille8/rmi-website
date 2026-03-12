import { defineMiddleware } from "astro:middleware";
import { isAuthenticated } from "./lib/admin-auth";
import { isPmAuthenticated } from "./lib/pm-auth";

export const onRequest = defineMiddleware(async ({ request, url, redirect }, next) => {
  // Only protect /admin pages (not /api/admin — those handle their own auth)
  if (url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api/")) {
    // Allow the login page without auth
    if (url.pathname === "/admin/login") {
      return next();
    }

    // Check session cookie
    if (!isAuthenticated(request)) {
      return redirect("/admin/login", 302);
    }
  }

  // Protect /pm pages (not /api/pm — those handle their own auth)
  if (url.pathname.startsWith("/pm") && !url.pathname.startsWith("/api/")) {
    // Allow the login page without auth
    if (url.pathname === "/pm" || url.pathname === "/pm/login") {
      return next();
    }

    // Check PM session cookie
    if (!isPmAuthenticated(request)) {
      return redirect("/pm", 302);
    }
  }

  return next();
});
