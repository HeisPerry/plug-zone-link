import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSavedContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-contacts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_contacts").select("*").eq("user_id", user!.id).order("label").limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; phone_number: string; provider?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("saved_contacts")
        .upsert({ user_id: user.id, label: input.label, phone_number: input.phone_number, provider: input.provider ?? null }, { onConflict: "user_id,phone_number" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-contacts", user?.id] }),
  });
}

export function useDeleteContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-contacts", user?.id] }),
  });
}
