import { type Actor, json, request, type TestApp } from "./app.ts";

export const VALID_PARK = {
  name: "Vega II.",
  latitude: 47.4979,
  longitude: 19.0402,
  timezone: "Europe/Budapest",
};

export type ParkBody = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  status: string;
  fastIntervalS: number;
  billingStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function parksPath(organization: { slug: string }, parkId?: string): string {
  const collection = `/api/orgs/${organization.slug}/parks`;
  return parkId ? `${collection}/${parkId}` : collection;
}

/** Creates a park and returns it as the API answered. */
export async function createPark(
  testApp: TestApp,
  manager: Actor,
  organization: { slug: string },
  input: Partial<typeof VALID_PARK> & { fastIntervalS?: number } = {},
): Promise<ParkBody> {
  const response = await request(testApp, manager, "POST", parksPath(organization), {
    ...VALID_PARK,
    ...input,
  });
  if (response.status !== 201) {
    throw new Error(`Creating the park failed: ${response.status} ${await response.text()}`);
  }
  return (await json<{ park: ParkBody }>(response)).park;
}
