'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createFlow(formData: {
  name: string;
  keyword: string;
  comment: string;
  dm: string;
}) {
  try {
    const { data, error } = await supabase
      .from('automation_flows')
      .insert([
        {
          name: formData.name,
          trigger_type: 'comment', // Default for now
          trigger_keyword: formData.keyword,
          response_comment: formData.comment,
          response_dm: formData.dm,
          is_active: true,
        },
      ])
      .select();

    if (error) throw error;

    revalidatePath('/flows');
    return { success: true, data };
  } catch (error) {
    console.error('Error creating flow:', error);
    return { success: false, error };
  }
}

export async function getFlows() {
  const { data, error } = await supabase
    .from('automation_flows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching flows:', error);
    return [];
  }
  return data;
}

export async function toggleFlowActive(id: string, currentStatus: boolean) {
  const { error } = await supabase
    .from('automation_flows')
    .update({ is_active: !currentStatus })
    .eq('id', id);

  if (error) {
    console.error('Error toggling flow:', error);
    return { success: false };
  }
  
  revalidatePath('/flows');
  return { success: true };
}

export async function deleteFlow(id: string) {
  const { error } = await supabase
    .from('automation_flows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting flow:', error);
    return { success: false };
  }
  
  revalidatePath('/flows');
  return { success: true };
}
