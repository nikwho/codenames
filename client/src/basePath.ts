/** Vite BASE_URL: "/" in local dev, "/codenames/" in production builds. */
export const BASE_URL = import.meta.env.BASE_URL;

/** No trailing slash: "" locally, "/codenames" in production. */
export const BASE_PATH = BASE_URL.replace(/\/$/, "");

/** Prefix an app-relative path (`/`, `/room/ABC`) with the deploy base. */
export function appPath(path = "/"): string {
  if (!path || path === "/") {
    return BASE_PATH || "/";
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

/** Strip deploy base from a browser pathname for routing. */
export function stripBasePath(pathname: string): string {
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

/** Socket.IO Engine.IO path: `/socket.io` locally, `/codenames/socket.io` in prod. */
export function socketIoPath(): string {
  return `${BASE_URL}socket.io`.replace(/\/{2,}/g, "/");
}
