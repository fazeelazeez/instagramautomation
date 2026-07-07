import Link from "next/link";

interface LegalLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 border-b pb-4">{title}</h1>
      <div className="space-y-8 text-slate-600 leading-relaxed">
        {children}
      </div>
      
      <footer className="mt-20 pt-8 border-t border-slate-200">
        <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-500">
          <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
          <Link href="/deletion" className="hover:text-blue-600 transition-colors">Data Deletion</Link>
          <Link href="/" className="hover:text-blue-600 transition-colors ml-auto">Back to Home</Link>
        </div>
      </footer>
    </div>
  );
}
