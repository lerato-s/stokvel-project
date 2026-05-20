// src/pages/Group/utils/helpers.js

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(m) {
  if (!m) return "—";
  const [year, month] = m.split("-");
  return new Date(year, month - 1).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function authHeader() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // The token is directly on the user object from login response
  const token = user.token;
  
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}