import { supabase } from './supabaseClient.js';

// Returns 'manager' or 'staff' for the given user id.
export async function getMyRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return 'staff';
  return data.role === 'manager' ? 'manager' : 'staff';
}