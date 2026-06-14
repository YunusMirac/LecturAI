/** Shared helpers for API route unit tests */
export async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

export function mockChain(resolver: () => unknown) {
  const c: Record<string, unknown> = {};
  c.eq = () => c;
  c.select = () => c;
  c.maybeSingle = () => Promise.resolve(resolver());
  c.single = () => Promise.resolve(resolver());
  c.update = () => c;
  c.delete = () => c;
  c.insert = () => Promise.resolve({ error: null, data: null });
  return c;
}
