import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Introduction</h2>
        <p>
          Welcome to SILQUEEN DESIGNS ("we," "our," or "us"). We are a bridal boutique and ladies' stitching business based in Kerala, India. 
          This Privacy Policy explains how we collect, use, and protect your information when you interact with our Instagram business account 
          and our internal automation tool, bot.silqueen.com. This policy covers all interactions handled by our automated systems to ensure 
          transparency and security for our customers and followers.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. What Data We Collect</h2>
        <p>
          Our automation tool collects specific data points necessary to facilitate automated interactions on Instagram. This includes:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Instagram User ID:</strong> A unique identifier to track the interaction.</li>
          <li><strong>Instagram Username:</strong> To personalize our replies.</li>
          <li><strong>Public Comment Text:</strong> The content of comments made on our posts.</li>
          <li><strong>DM Message Content:</strong> The text of direct messages sent to our business account.</li>
          <li><strong>Timestamps:</strong> The exact time and date of each interaction to manage reply logic and retention.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Why We Collect It</h2>
        <p>
          We collect this data for the sole purpose of operating our internal Instagram automation tool. This allows us to:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>Send automated, timely replies to comments about our products and services.</li>
          <li>Respond automatically to Direct Messages (DMs) with relevant product details, catalogs, pricing, and availability.</li>
          <li>Enhance our customer service experience by providing instant information outside of regular business hours.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. How We Store and Protect It</h2>
        <p>
          Your data security is important to us. We implement industry-standard security practices to protect the information we collect:
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Encryption in Transit:</strong> All data transmitted between Instagram and our tool is encrypted using Secure Socket Layer (SSL/TLS) technology.</li>
          <li><strong>Restricted Access:</strong> Access to the stored interaction data is strictly limited to authorized staff who require it for business operations.</li>
          <li><strong>Secure Infrastructure:</strong> Our tool is hosted on secure servers with regular security monitoring.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Data Retention Period</h2>
        <p>
          We believe in data minimization. We retain interaction data for <strong>30 days</strong> from the date of collection. 
          After this 30-day period, the data is automatically and permanently deleted from our systems.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Your Data Rights</h2>
        <p>
          We respect your privacy rights and provide the following ways to manage your information:
        </p>
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="text-lg font-medium text-slate-700">Right to Access</h3>
            <p>You have the right to request a copy of the data we have collected from your Instagram interactions. You can do this by contacting us at our official email address.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-700">Right to Correction</h3>
            <p>If you believe the data we have is inaccurate (e.g., a misrecorded username), you can request a fix by emailing us.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-700">Right to Deletion</h3>
            <p>
              You have the right to request the immediate deletion of your data before the 30-day retention period expires. 
              Please visit our <a href="/deletion" className="text-blue-600 hover:underline">Data Deletion</a> page for instructions. 
              All deletion requests are processed within 24 hours.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Third-Party Sharing</h2>
        <p className="font-medium text-slate-800">
          We do not sell or share your data with third parties. 
        </p>
        <p>
          Data is only used internally to operate our Instagram automation tool for SILQUEEN DESIGNS. We do not provide access 
          to your data to any external marketing agencies or third-party service providers except as required by law.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Children's Privacy</h2>
        <p>
          Our services and automation tools are not directed at children under the age of 13. We do not knowingly collect 
          personal information from children. If we become aware that a child under 13 has provided us with personal 
          information, we will take immediate steps to delete such data.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Changes to This Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
          Privacy Policy on this page and updating the "Last Updated" date.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Contact Information</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us:
        </p>
        <div className="mt-4 bg-slate-50 p-6 rounded-lg border border-slate-100">
          <p><strong>Legal Business Name:</strong> SILQUEEN DESIGNS</p>
          <p><strong>Address:</strong> SHOP 1, CHERUPULLYPARAMBIL BUILDING, PONJASSERY, PERUMBAVOOR, ERNAKULAM, KERALA, 683547, India</p>
          <p><strong>Contact Email:</strong> Silqueendesigns@gmail.com</p>
          <p><strong>Data Protection Contact:</strong> FASNA M M (Proprietor)</p>
          <p><strong>Governing Law:</strong> India</p>
        </div>
      </section>
    </LegalLayout>
  );
}
