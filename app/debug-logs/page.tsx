import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DebugLogs() {
  const healthCheck = {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    instaToken: !!process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
  };

  const { data: logs, error: logError } = await supabase
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-8 font-mono text-xs">
      <h1 className="text-xl font-bold mb-4 text-blue-600">Silqueen System Health</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(healthCheck).map(([key, value]) => (
          <div key={key} className={`p-4 rounded-2xl border ${value ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <div className="font-bold uppercase text-[10px] opacity-60 mb-1">{key}</div>
            <div className="text-sm font-bold">{value ? 'CONNECTED' : 'MISSING'}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-4 text-slate-700">Recent Activity</h2>
      {logError && <div className="text-red-500 mb-4 font-bold p-4 bg-red-50 rounded-xl">Database Error: {logError.message}</div>}
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
