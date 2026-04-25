"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { redeemInvite } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { setSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof params?.token === "string" ? params.token : null;
    if (!token) {
      setError("Missing invite token.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await redeemInvite(token);
        if (cancelled) return;
        setSession(session);
        router.replace("/");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This invite link is invalid.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router, setSession]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b16] px-6 py-12 text-slate-200">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur">
        {error ? (
          <>
            <ShieldAlert className="mx-auto h-10 w-10 text-red-300" />
            <h1 className="mt-4 text-xl font-semibold text-white">Invite unavailable</h1>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
            <p className="mt-6 text-xs text-slate-500">
              Ask the owner for a fresh link.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-300" />
            <h1 className="mt-4 text-xl font-semibold text-white">Opening your access...</h1>
            <p className="mt-2 text-sm text-slate-400">
              Validating the invite link. This only takes a second.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
