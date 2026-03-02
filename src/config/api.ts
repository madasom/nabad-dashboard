export const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "http://129.151.201.2:3126"
    : "http://localhost:4000";

