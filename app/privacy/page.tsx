import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Fluids Pad — how we collect, use, and protect your personal information in compliance with POPIA (South Africa).",
  robots: { index: true, follow: false },
};

const LAST_UPDATED = "30 May 2026";
const CONTACT_EMAIL = "info@fluidspad.com";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          This Privacy Policy explains how Fluids Pad collects, uses, and
          protects your personal information. It is written in compliance with the{" "}
          <strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong> of the
          Republic of South Africa.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

        {/* 1 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Who We Are</h2>
          <p>
            Fluids Pad is an independent engineering reference website
            operated by an individual developer based in South Africa. For the purposes of
            POPIA, the developer acts as the <strong>responsible party</strong> (information
            officer) for all personal information processed through this Service.
          </p>
          <p className="mt-2">
            Contact:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. What Personal Information We Collect</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email address (voluntary)</h3>
              <p>
                We collect your email address only if you voluntarily provide it — for
                example, when downloading a calculation report, joining our notification
                list, or submitting feedback. You are never required to provide an email
                address to use any calculator on this website.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Usage data (anonymous, automatic)</h3>
              <p>
                We use <strong>Google Analytics 4</strong> to collect anonymous information
                about how the website is used: which pages are visited, how long users spend
                on each page, which calculators are most used, and general geographic region
                (country/province level). This data does not identify you personally.
              </p>
              <p className="mt-2">
                Google Analytics may use cookies and similar technologies to collect this
                data. You can opt out of Google Analytics tracking at any time using the{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Google Analytics Opt-out Browser Add-on
                </a>
                .
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Feedback and messages (voluntary)</h3>
              <p>
                If you submit feedback through the feedback widget, we collect the content
                of your message and, if provided, your email address. This is used solely
                to respond to your feedback and improve the Service.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI interactions (not stored)</h3>
              <p>
                The AI practice and assistant features are powered by Anthropic&rsquo;s API.
                Your questions and the AI responses are not stored by us. Anthropic may
                process this data according to their own{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Local storage (on your device)</h3>
              <p>
                Some features (such as calculation history, saved designs, and dark mode
                preference) store data in your browser&rsquo;s local storage. This data stays
                on your device and is not transmitted to our servers. You can clear it at
                any time by clearing your browser&rsquo;s local storage.
              </p>
            </div>
          </div>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. Why We Collect This Information</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Information</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Purpose</th>
                  <th className="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Legal basis (POPIA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-4">Email address</td>
                  <td className="py-2 pr-4">Send notifications about new tools and updates; respond to feedback</td>
                  <td className="py-2">Consent (you provide it voluntarily)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Anonymous usage data</td>
                  <td className="py-2 pr-4">Understand which calculators are used; improve the Service</td>
                  <td className="py-2">Legitimate interest (improving a free public service)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Feedback messages</td>
                  <td className="py-2 pr-4">Respond to user feedback; identify bugs and improvements</td>
                  <td className="py-2">Consent (you submit it voluntarily)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            We do <strong>not</strong> sell, rent, or trade your personal information to any
            third party for their own marketing purposes. We do not use your information for
            profiling or automated decision-making.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Email Communications</h2>
          <p>
            If you provide your email address, you consent to receiving occasional emails
            from us about new calculators, tools, or relevant engineering content. We use
            Mailchimp to manage our mailing list. Every email we send includes an
            unsubscribe link. You can unsubscribe at any time with no consequences.
          </p>
          <p className="mt-2">
            We will never send you unsolicited commercial communications unrelated to the
            Service, and we will never share your email address with third parties for their
            own marketing purposes.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Third-Party Processors</h2>
          <p>The following third parties process data on our behalf:</p>
          <ul className="mt-3 space-y-2 list-disc list-inside pl-2">
            <li>
              <strong>Google Analytics</strong> — anonymous website usage statistics.
              Governed by Google&rsquo;s Privacy Policy. Data is anonymised before
              transmission where possible.
            </li>
            <li>
              <strong>Mailchimp (Intuit Inc.)</strong> — email list management. Your email
              address is stored on Mailchimp&rsquo;s servers if you subscribe.
              Mailchimp complies with GDPR and operates internationally.
            </li>
            <li>
              <strong>Anthropic</strong> — AI question answering for the Practice and
              AI Assistant features. Your queries are processed by Anthropic&rsquo;s API.
            </li>
            <li>
              <strong>Vercel</strong> — website hosting. Standard web server logs (IP
              address, browser type) may be retained briefly for security purposes.
            </li>
          </ul>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. How Long We Keep Your Information</h2>
          <ul className="space-y-2 list-disc list-inside pl-2">
            <li>
              <strong>Email address:</strong> retained in Mailchimp for as long as you
              remain subscribed. Deleted within 30 days of an unsubscribe request.
            </li>
            <li>
              <strong>Feedback messages:</strong> retained for up to 24 months to track
              improvement themes, then deleted.
            </li>
            <li>
              <strong>Analytics data:</strong> retained by Google Analytics for 14 months
              (our configured retention period), then automatically deleted.
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">7. Your Rights Under POPIA</h2>
          <p>
            As a data subject under POPIA, you have the following rights regarding your
            personal information:
          </p>
          <ul className="mt-3 space-y-2 list-disc list-inside pl-2">
            <li><strong>Right of access</strong> — you may request a copy of the personal information we hold about you</li>
            <li><strong>Right to correction</strong> — you may request that inaccurate information be corrected</li>
            <li><strong>Right to deletion (erasure)</strong> — you may request that your personal information be deleted</li>
            <li><strong>Right to object</strong> — you may object to the processing of your personal information</li>
            <li><strong>Right to withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time</li>
            <li><strong>Right not to be subject to automated decisions</strong> — we do not use automated profiling or decision-making</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">8. Complaints — Information Regulator</h2>
          <p>
            If you believe your personal information has been processed in a manner that
            violates POPIA, you have the right to lodge a complaint with the{" "}
            <strong>Information Regulator of South Africa</strong>:
          </p>
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-300">Information Regulator (South Africa)</p>
            <p className="text-blue-700 dark:text-blue-400 mt-1">
              Website:{" "}
              <a
                href="https://inforegulator.org.za"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                inforegulator.org.za
              </a>
            </p>
            <p className="text-blue-700 dark:text-blue-400">
              Email: inforeg@justice.gov.za
            </p>
            <p className="text-blue-700 dark:text-blue-400">
              Physical address: JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001
            </p>
          </div>
          <p className="mt-3">
            We would appreciate the opportunity to address any concern directly before you
            contact the Regulator — please email us first.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">9. Cookies</h2>
          <p>
            This website uses cookies in the following ways:
          </p>
          <ul className="mt-2 space-y-2 list-disc list-inside pl-2">
            <li>
              <strong>Analytics cookies</strong> (Google Analytics) — track anonymous
              page views and usage patterns. These are third-party cookies set by Google.
            </li>
            <li>
              <strong>Functional local storage</strong> — your theme preference (dark/light
              mode) and calculation history are stored in browser local storage, not in cookies.
              No data from local storage is transmitted to our servers.
            </li>
          </ul>
          <p className="mt-2">
            You can manage or delete cookies through your browser settings. Disabling analytics
            cookies will not affect your ability to use any calculator.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">10. Children&rsquo;s Privacy</h2>
          <p>
            The Service is not directed at children under the age of 18. We do not
            knowingly collect personal information from anyone under 18. If you believe a
            child has provided us with personal information, please contact us and we will
            delete it promptly.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &ldquo;Last
            updated&rdquo; date at the top of this page shows when it was last revised.
            Significant changes will be noted in our newsletter to subscribers.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">12. Contact</h2>
          <p>
            For any questions about this Privacy Policy or to exercise your POPIA rights:
          </p>
          <p className="mt-2">
            <strong>Information Officer:</strong> Fluids Pad<br />
            <strong>Email:</strong>{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

      </div>

      {/* Bottom link */}
      <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          See also:{" "}
          <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}
