import LegalLayout from "@/components/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Acceptance of Terms</h2>
        <p>
          By interacting with the SILQUEEN DESIGNS Instagram account and utilizing our automated messaging features, 
          you agree to be bound by these Terms of Service. If you do not agree to these terms, please refrain from 
          commenting on our posts or sending direct messages that trigger our automated systems.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Description of Service</h2>
        <p>
          SILQUEEN DESIGNS operates an internal Instagram automation tool (Silqueen Automation (bot.silqueen.com)) designed exclusively 
          for our business engagement. The service provides:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>Automated public replies to comments on our official Instagram posts.</li>
          <li>Automated private replies to Direct Messages (DMs) containing product information, catalogs, and business details.</li>
        </ul>
        <p className="mt-4 italic">
          Note: This tool is used for our own business account only and is not available for use by any third-party businesses.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Account Ownership and Verification</h2>
        <p>
          Our tool connects only to the official SILQUEEN DESIGNS Instagram Business Account. We do not require users 
          to create accounts on bot.silqueen.com. All interactions occur through the Instagram platform, subject to 
          Instagram's own terms and conditions.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Anti-Spam and Acceptable Use</h2>
        <p>
          We are committed to maintaining a high-quality, spam-free experience for our followers.
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>Our tool will only respond to interactions initiated by you (comments or DMs).</li>
          <li>We do not send unsolicited "cold" direct messages to users who have not contacted us first.</li>
          <li>Users must not use our automation triggers to send malicious content, spam, or prohibited material to our account.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Termination Rights</h2>
        <p>
          We reserve the right to block specific users from interacting with our automation tool if they violate these 
          terms or engage in abusive behavior towards our business account.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Limitation of Liability</h2>
        <p>
          SILQUEEN DESIGNS shall not be liable for any indirect, incidental, special, or consequential damages resulting 
          from the use or inability to use our automated services, including but not limited to delays in automated 
          replies or technical errors in message delivery.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Governing Law</h2>
        <p>
          These terms shall be governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes 
          arising from these terms shall be subject to the exclusive jurisdiction of the courts in Kerala, India.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Your continued interaction with our Instagram 
          account following any changes constitutes your acceptance of the new Terms of Service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Contact Information</h2>
        <p>
          For any questions regarding these Terms of Service, please reach out to:
        </p>
        <div className="mt-4 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <p><strong>Business Name:</strong> SILQUEEN DESIGNS</p>
          <p><strong>Email:</strong> Silqueendesigns@gmail.com</p>
          <p><strong>Location:</strong> Perumbavoor, Kerala, India</p>
        </div>
      </section>
    </LegalLayout>
  );
}
