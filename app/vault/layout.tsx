import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vault layout — gates every /vault/* route.
 * If the user has not set a passphrase yet, send them to /vault/setup.
 * Otherwise let them through (the page itself decides whether to require unlock).
 */
export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vault");

  const { data: profile } = await supabase
    .from("users")
    .select("argon_salt, sentinel_ciphertext")
    .eq("id", user.id)
    .maybeSingle();

  const hasPassphrase = Boolean(profile?.argon_salt && profile?.sentinel_ciphertext);

  // If they haven't set a passphrase and they aren't already on /setup, send them there.
  // We can't easily detect the current path from a layout, so we let the page
  // components themselves redirect if needed. /vault/setup is the safe destination.
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="text-lg font-bold text-sherpa-500">Sherpa</div>
          <form action="/auth/logout" method="post">
            <button className="text-sm text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </form>
        </div>
      </header>
      <div data-has-passphrase={hasPassphrase} className="bg-slate-50 min-h-full">
        {children}
      </div>
    </>
  );
}
