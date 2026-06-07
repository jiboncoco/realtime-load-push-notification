// Fetch wrapper yang memahami konvensi { data, error } backend (CLAUDE.md §4).
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

export type ApiError = { code: string; message: string };

export class ApiClientError extends Error {
  code: string;
  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
  }
}

type ApiEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (json.error) throw new ApiClientError(json.error);
  return json.data as T;
}
