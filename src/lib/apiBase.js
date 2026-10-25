// src/lib/apiBase.js
const isClient = typeof window !== "undefined";

// Get the API base URL from environment or default
export const apiBase = isClient
  ? window.location.origin
  : process.env.VERCEL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function apiUrl(path) {
  if (!path) return apiBase;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${apiBase}/${normalizedPath}`;
}

export const apiConfig = {
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export async function apiFetch(path, options = {}) {
  const url = apiUrl(path);
  const config = {
    ...apiConfig,
    ...options,
    headers: { ...apiConfig.headers, ...options.headers },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

export async function apiPost(path, data) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiPut(path, data) {
  return apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiDelete(path) {
  return apiFetch(path, {
    method: "DELETE",
  });
}