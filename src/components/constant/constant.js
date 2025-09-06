export const baseUrl =
  import.meta.env.VITE_APP_ENV === "local"
    ? "http://localhost:7000"
    : "https://api.nivabupalaunchevent.com";
console.log(import.meta.env.VITE_APP_ENV, "baseUrl:", baseUrl);
