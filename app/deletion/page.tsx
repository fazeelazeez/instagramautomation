import LegalLayout from "@/components/LegalLayout";

export default function DataDeletion() {
  return (
    <LegalLayout title="Data Deletion Instruction">
      <section>
        <p className="text-lg">
          At SILQUEEN DESIGNS, we prioritize your data privacy. You have the full right to request the deletion of 
          any personal data collected through our Instagram automation tool (Silqueen Automation (bot.silqueen.com)).
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">How to Request Data Deletion</h2>
        <p>
          If you wish to have your interaction data (Username, User ID, and message history) removed from our internal 
          automation system before our standard 30-day auto-deletion period, please follow these steps:
        </p>
        <div className="mt-6 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
            <div>
              <p className="font-medium text-slate-800">Compose an Email</p>
              <p>Send an email to <strong>Silqueendesigns@gmail.com</strong> from your registered email or mention your Instagram handle.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
            <div>
              <p className="font-medium text-slate-800">Use the Correct Subject Line</p>
              <p>Please use the subject line: <strong>"Data Deletion Request - Instagram Automation"</strong>.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
            <div>
              <p className="font-medium text-slate-800">Provide Your Instagram Username</p>
              <p>Include your Instagram username (e.g., @yourname) so we can accurately identify and remove your data.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">Processing Time</h2>
        <p className="text-blue-800">
          Once we receive your email, our team will process the deletion request within <strong>24 hours</strong>. 
          You will receive a confirmation email once your data has been permanently purged from our systems.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Alignment with Privacy Policy</h2>
        <p>
          This deletion process is in accordance with our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, 
          which guarantees your right to deletion. As stated, all data is automatically deleted after 30 days regardless 
          of a manual request, but this page provides you with the means for immediate removal.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Contact for Data Protection</h2>
        <p>
          For any specific concerns regarding your data, you may reach out to our Data Protection Contact:
        </p>
        <p className="mt-2 font-medium text-slate-800">FASNA M M (Proprietor)</p>
        <p>Email: Silqueendesigns@gmail.com</p>
      </section>
    </LegalLayout>
  );
}
