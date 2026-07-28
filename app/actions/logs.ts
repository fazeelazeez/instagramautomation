'use server';

import { supabase } from '@/lib/supabase';

/**
 * Fetches recent logs for the dashboard overview.
 */
export async function getRecentLogs({ from, to, limit = 500 }: { from?: string; to?: string; limit?: number } = {}) {
  try {
    let query = supabase
      .from('automation_logs')
      .select('*')
      .neq('action_taken', 'RAW_WEBHOOK_RECEIVED')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from && to) {
      query = query.gte('created_at', from).lte('created_at', to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch recent logs:', error);
      return [];
    }

    return JSON.parse(JSON.stringify(data || []));
  } catch (error: any) {
    console.error('Error in getRecentLogs:', error);
    return [];
  }
}

/**
 * Fetches logs for the analytics page with pagination and date filtering.
 */
export async function getAnalyticsLogs({
  from,
  to,
  page,
  pageSize
}: {
  from: string;
  to: string;
  page: number;
  pageSize: number;
}) {
  try {
    const { data, count, error } = await supabase
      .from('automation_logs')
      .select('*, automation_flows(*)', { count: 'exact' })
      .neq('action_taken', 'RAW_WEBHOOK_RECEIVED')
      .neq('action_taken', 'dm_sent_to_user')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Failed to fetch analytics logs:', error);
      return { data: [], count: 0, error: error.message || 'Database error' };
    }

    return {
      data: JSON.parse(JSON.stringify(data || [])),
      count: count || 0,
      error: null
    };
  } catch (error: any) {
    console.error('Error in getAnalyticsLogs:', error);
    return { data: [], count: 0, error: error?.message || 'Server error' };
  }
}
