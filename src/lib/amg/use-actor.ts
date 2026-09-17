import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { getBootstrap } from "./actions";
import type { Actor, Company } from "./types";

export function useActorGate() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const [actor, setActor] = useState<Actor | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState<null | "inactive">(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setActor(null);
      setBlocked(null);
      setReady(true);
      void nav({ to: "/login" });
      return;
    }
    void getBootstrap()
      .then((b) => {
        if (!b.ok && b.reason === "no_profile") {
          setReady(true);
          if (typeof window === "undefined" || window.location.pathname !== "/onboarding") {
            void nav({ to: "/onboarding" });
          }
          return;
        }
        if (!b.ok && b.reason === "inactive") {
          setBlocked("inactive");
          setReady(true);
          void signOut().finally(() => {
            window.location.replace(`${window.location.origin}/login?nonaktif=1`);
          });
          return;
        }
        if (b.ok) {
          setActor(b.actor);
          setCompanies(b.companies);
          setReady(true);
        }
      })
      .catch(() => {
        void nav({ to: "/onboarding" });
      });
  }, [user, isPending, nav]);

  return { user, isPending, actor, companies, ready, blocked };
}
