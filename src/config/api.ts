const envApiBase = import.meta.env.VITE_API_URL?.trim();

export const API_BASE = (
  envApiBase ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://api.dawasom.org:3126"
    : "http://localhost:3126")
).replace(/\/+$/, "");
