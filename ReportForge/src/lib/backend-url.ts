const LOCAL_BACKEND_URL = "http://localhost:5000";

export const resolveBackendBaseUrl = () => {
  const configuredUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "")
    .trim()
    .replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  if (
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return LOCAL_BACKEND_URL;
  }

  return "";
};
