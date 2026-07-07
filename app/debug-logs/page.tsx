import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function DebugLogs() {
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-8 font-mono text-xs">
      <h1 className="text-xl font-bold mb-4 text-blue-600">Silqueen Debug Logs</h1>
      {error && <div className="text-red-500 mb-4">Error: {error.message}</div>}
      <div className="space-y-2">
        {logs?.map((log: any) => (
          <div key={log.id} className="p-4 border border-slate-100 rounded bg-slate-50">
            <div className="text-slate-400">{log.created_at}</div>
            <div className="font-bold text-slate-700">{log.action_taken} - {log.status}</div>
            <div className="text-slate-500">Handle: {log.sender_handle}</div>
            <pre className="mt-2 text-[10px] overflow-auto max-h-40 bg-white p-2 border border-slate-50">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <div className="text-slate-400">No logs found yet. Meta has not sent any events or the database is still disconnected.</div>
        )}
      </div>
    </div>
  );
}
