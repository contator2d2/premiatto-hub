import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "super_admin" | "admin" | "gestor" | "colaborador" | "correspondente" | "franqueado";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  company_id: string | null;
  department_id: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles" as never).select("*").eq("id", userData.user.id).maybeSingle(),
        supabase.from("user_roles" as never).select("role").eq("user_id", userData.user.id),
      ]);
      const profile = profileRes.data as ProfileRow | null;
      const roles = ((rolesRes.data as { role: AppRole }[]) ?? []).map((r) => r.role);
      return {
        user: userData.user,
        profile,
        roles,
        isAdmin: roles.includes("super_admin") || roles.includes("admin"),
        isSuperAdmin: roles.includes("super_admin"),
      };
    },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof useCurrentUser>["data"]>>;

// Silence unused Database import in some tsconfigs
export type _Db = Database;
