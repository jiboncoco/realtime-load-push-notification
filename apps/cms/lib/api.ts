// Fetch wrapper yang memahami konvensi { data, error } backend (CLAUDE.md §4).
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

export type ApiError = { code: string; message: string };

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(err: ApiError, status: number) {
    super(err.message);
    this.code = err.code;
    this.status = status;
  }
}

type ApiEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.error) throw new ApiClientError(json.error, res.status);
  return json.data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>("GET", path, { token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>("POST", path, { body, token }),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>("PATCH", path, { body, token }),
  del: <T>(path: string, token?: string | null) =>
    request<T>("DELETE", path, { token }),
};
