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
      {/* Auto-refresh every 5 seconds for live monitoring */}
      <meta httpEquiv="refresh" content="5" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-blue-600">Silqueen System Health</h1>
        <div className="flex items-center gap-2 text-emerald-600 text-[11px] font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE — Auto-refreshing every 5s
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(healthCheck).map(([key, value]) => (
          <div key={key} className={`p-4 rounded-2xl border ${value ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            <div className="font-bold uppercase text-[10px] opacity-60 mb-1">{key}</div>
            <div className="text-sm font-bold">{value ? 'CONNECTED' : 'MISSING'}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-700">Recent Activity</h2>
        <span className="text-slate-400 text-[10px]">{logs?.length || 0} events</span>
      </div>

      {logError && <div className="text-red-500 mb-4 font-bold p-4 bg-red-50 rounded-xl">Database Error: {logError.message}</div>}

      <div className="space-y-2">
        {logs?.map((log: any) => (
          <div key={log.id} className={`p-4 border rounded-xl ${log.status === 'processed' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${log.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {log.status === 'processed' ? '✅ PROCESSED' : '📡 RECEIVED'}
              </span>
              <span className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
            </div>
            <div className="font-bold text-slate-700 mt-1">{log.action_taken}</div>
            {log.sender_handle && log.sender_handle !== 'META' && (
              <div className="text-blue-600 font-semibold mt-0.5">@{log.sender_handle}</div>
            )}
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <div className="text-slate-400 p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
            ⏳ Waiting for comments... Comment "Price" on Instagram to see it appear here live!
          </div>
        )}
      </div>
    </div>
  );
}
