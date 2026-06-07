// Penyimpanan sesi CMS di sisi klien (MVP: localStorage). Token JWT dari backend.
import { apiPost } from "./api";

const TOKEN_KEY = "qms.cms.token";
const USER_KEY = "qms.cms.user";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator";
  client_id: string;
};

type LoginResult = { token: string; user: SessionUser };

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  const result = await apiPost<LoginResult>("/auth/login", { email, password });
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  return result.user;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
