/**
 * POST /auth/logout — signs the user out of Supabase and bounces back home.
 *
 * Why 303 instead of the default 307: after a POST, browsers should switch
 * to GET on the redirect target. A 307 preserves the POST method and the
 * browser ends up POSTing to "/", which doesn't accept POST → blank page
 * (the bug Steve hit). 303 explicitly tells the browser "now go GET this
 * other URL," which is what users actually want after logout.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL("/", baseUrl), { status: 303 });
}
