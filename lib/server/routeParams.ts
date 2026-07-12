/** Next.js 14/15 compatible dynamic route param resolver */
export async function routeId(params: { id: string } | Promise<{ id: string }>): Promise<string> {
  const resolved = await Promise.resolve(params);
  return String(resolved.id || "");
}
