"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";

export function StudentRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!mounted) return;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const roles = user.roles || [user.role];
        const resolvedPersona = user.activePersona || (pathname.startsWith("/dashboard/student") ? "STUDENT" : "ADMIN");
        if (!roles.includes("STUDENT") || resolvedPersona !== "STUDENT") {
          router.replace("/dashboard/admin");
        }
      } catch {
        if (mounted) router.replace("/auth/login");
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  return null;
}
