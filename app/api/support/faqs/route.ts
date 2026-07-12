import { NextRequest } from "next/server";
import { listFaqs } from "@/lib/server/faq";
import { json } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  const consumerType = req.nextUrl.searchParams.get("consumerType") || undefined;
  const search = req.nextUrl.searchParams.get("search") || undefined;
  return json(listFaqs(consumerType, search));
}
