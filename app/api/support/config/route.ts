import { getPublicSupportConfig } from "@/lib/server/env";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPublicSupportConfig();
  return json(config);
}
