// Fetch wrapper { data, error } (konvensi backend, CLAUDE.md §4).
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
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.error) throw new ApiClientError(json.error, res.status);
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
};
