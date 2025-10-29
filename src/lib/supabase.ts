import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export { supabase };
export type { User, Session };

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserRoles = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
  
  return data.map(r => r.role);
};
