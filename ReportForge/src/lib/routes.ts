export const HOME_ROUTE = "/";
export const TEMPLATES_ROUTE = "/templates";
export const DASHBOARD_ROUTE = "/dashboard";
export const PROFILE_ROUTE = "/profile";
export const ADMIN_ROUTE = "/admin";
export const AUTH_CALLBACK_ROUTE = "/auth/callback";
export const ABOUT_ROUTE = "/#about";
export const DEFAULT_POST_LOGIN_REDIRECT = DASHBOARD_ROUTE;
export const FALLBACK_TEMPLATE_ID = "research-report";

export const isEditorRoute = (pathname: string) => pathname.startsWith("/editor/");

export const isProtectedAppRoute = (pathname: string) =>
  pathname.startsWith(DASHBOARD_ROUTE) ||
  pathname.startsWith(PROFILE_ROUTE) ||
  pathname.startsWith(ADMIN_ROUTE);

export const buildEditorRoute = (templateId: string, reportId?: string | null) => {
  if (!reportId) {
    return `/editor/${templateId}`;
  }

  const params = new URLSearchParams({ reportId });
  return `/editor/${templateId}?${params.toString()}`;
};
