// Fetch wrapper { data, error } (konvensi backend).
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

export type DisplayPlatform = {
  id: string;
  code: string;
  name: string;
  current: { label: string; status: "CALLED" | "SERVING" } | null;
  waiting: number;
};

export type OutletDisplay = {
  outlet: { id: string; name: string };
  platforms: DisplayPlatform[];
};

export async function getDisplay(outletId: string): Promise<OutletDisplay> {
  const res = await fetch(`${API_BASE}/outlets/${outletId}/display`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.data as OutletDisplay;
}
