// Prefer explicit URL if provided
const explicit = import.meta.env.VITE_API_URL;
// Compute local API host dynamically so mobile devices on same LAN can reach it
const hostFromLocation =
  typeof window !== "undefined" && window.location?.hostname
    ? window.location.hostname
    : "localhost";
const apiPort = import.meta.env.VITE_API_PORT || "7000";

export const baseUrl =
  explicit ||
  (import.meta.env.VITE_APP_ENV === "local"
    ? `http://${hostFromLocation}:${apiPort}`
    : "https://api.nivabupalaunchevent.com");

console.log(
  "ENV:", import.meta.env.VITE_APP_ENV,
  "API:", baseUrl
);
