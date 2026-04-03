// Lightweight API base resolver so the frontend still works when served from a
// static dev server (e.g., VS Code Live Server) on a different port than the
// Express API. It prefers an explicit meta tag or a locally stored override,
// then falls back to the backend default port, and finally to the current
// origin.
(function () {
  const normalize = value => (typeof value === "string" ? value.trim().replace(/\/$/, "") : null);

  const metaBase = normalize(document.querySelector('meta[name="api-base"]')?.content);
  const storedBase = normalize(localStorage.getItem("api_base"));

  const defaultBackendPort = "5000";
  const renderBase = "https://wad-project-l6pk.onrender.com";
  const hostname = window.location.hostname;
  const isLocalhost = ["localhost", "127.0.0.1", ""].includes(hostname);
  const sameOrigin = normalize(window.location.origin);
  const defaultLocalBase = normalize(`http://localhost:${defaultBackendPort}`);

  const resolved =
    metaBase ||
    storedBase ||
    (isLocalhost ? defaultLocalBase : renderBase) ||
    sameOrigin ||
    defaultLocalBase;

  window.API_BASE = resolved;
})();
