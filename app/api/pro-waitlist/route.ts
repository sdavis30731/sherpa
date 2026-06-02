/**
 * POST /api/pro-waitlist  (SHRP-048)
 *
 * Public endpoint. Captures Pro early-access list signups from the
 * /pro-waitlist page on the homepage CTA.
 *
 * Body:
 *   email      (required) — string
 *   name       (optional) — string
 *   company    (optional) — string
 *   team_size  (optional) — '1-5' | '6-20' | '21-100' | '100+'
 *   tools      (optional) — string[]
 *   use_case   (optional) — string
 *
 * No auth required. Uses the service-role client (createAdminClient)
 * because the table has no SELECT policy for anon/authenticated.
 *
 * Duplicate email returns 200 with already_on_list: true (don't leak
 * which addresses are on the list, just succeed silently).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TEAM_SIZES = ["1-5", "6-20", "21-100", "100+"] as const;
type TeamSize = (typeof TEAM_SIZES)[number];

interface RequestBody {
  email?: string;
  name?: string;
  company?: string;
  team_size?: string;
  tools?: string[];
  use_case?: string;
}

function isValidEmail(s: string): boolean {
  // Pragmatic email regex, not a full RFC-compliant one. We're trying
  // to catch fat-fingers, not validate every edge case.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 },
    );
  }

  const name = body.name?.trim() || null;
  const company = body.company?.trim() || null;
  const teamSize = TEAM_SIZES.includes(body.team_size as TeamSize)
    ? (body.team_size as TeamSize)
    : null;
  const tools =
    Array.isArray(body.tools) && body.tools.length > 0
      ? body.tools.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : null;
  const useCase = body.use_case?.trim() || null;
  // Cap free-text length so we're not vulnerable to silly amounts of data.
  const safeUseCase = useCase ? useCase.slice(0, 2000) : null;
  const safeCompany = company ? company.slice(0, 200) : null;
  const safeName = name ? name.slice(0, 200) : null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pro_waitlist")
    .insert({
      email,
      name: safeName,
      company: safeCompany,
      team_size: teamSize,
      tools,
      use_case: safeUseCase,
    } as never);

  if (error) {
    // Unique violation on email — treat as success (don't leak who's on the list)
    if (error.code === "23505") {
      return NextResponse.json({ success: true, already_on_list: true });
    }
    return NextResponse.json(
      { error: "Could not save your signup. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
