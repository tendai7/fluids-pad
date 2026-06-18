import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Fluids Pad — please read before using our engineering calculators and design tools.",
  robots: { index: true, follow: false },
};

const LAST_UPDATED = "30 May 2026";
const CONTACT_EMAIL = "info@fluidspad.com";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      {/* Engineering disclaimer — most prominent, top of page */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-10">
        <h2 className="text-base font-bold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
          <span className="text-lg">⚠</span> Important Engineering Disclaimer — Read This First
        </h2>
        <div className="space-y-2 text-sm text-red-700/90 dark:text-red-300/90">
          <p>
            All calculators, design tools, and results provided on this website are for{" "}
            <strong>preliminary assessment and educational purposes only.</strong> They are not
            a substitute for professional engineering judgment.
          </p>
          <p>
            Results must be independently verified by a <strong>qualified, registered
            professional engineer</strong> (ECSA-registered in South Africa, or equivalent in
            your jurisdiction) before being used in any design, construction, procurement, or
            regulatory submission.
          </p>
          <p>
            The developer of this website accepts <strong>no liability</strong> for any loss,
            damage, injury, or consequence arising from the use of, or reliance on, any
            calculation or result produced by this website, whether or not such result contains
            an error.
          </p>
        </div>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

        {/* 1 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Fluids Pad website (&ldquo;the Service&rdquo;), you
            agree to be bound by these Terms of Service. If you do not agree with any part of
            these terms, you must not use the Service.
          </p>
          <p className="mt-2">
            These Terms apply to all users of the Service, including without limitation
            students, engineers, academics, and companies.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
          <p>
            Fluids Pad provides a collection of interactive engineering
            calculators, design tools, AI-assisted practice questions, and reference material
            covering fluid mechanics, pipe flow, thermodynamics, and related disciplines. The
            Service is currently provided free of charge.
          </p>
          <p className="mt-2">
            The Service is intended for use by engineering students and professional engineers
            as a supplementary resource. It does not constitute professional engineering
            services, and no engineer-client relationship is formed through use of the Service.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. No Professional Engineering Services</h2>
          <p>
            The Service is an educational and preliminary-design reference tool. It does not
            constitute the provision of professional engineering services as defined under the
            Engineering Profession Act 46 of 2000 (South Africa) or any equivalent legislation
            in other jurisdictions.
          </p>
          <p className="mt-2">
            The developer of this website is not acting as your engineer of record. Any
            reliance on outputs from this website for a real engineering project must be
            accompanied by independent review and sign-off by an ECSA-registered professional
            engineer (or equivalent) who takes professional responsibility for the design.
          </p>
          <p className="mt-2">
            Specific limitations applicable to each calculator are listed in the
            &ldquo;Validity &amp; Limitations&rdquo; section on that calculator&rsquo;s page.
            These limitations are not exhaustive.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Accuracy of Results</h2>
          <p>
            While reasonable care has been taken in the implementation of calculation
            methodologies referenced in industry standards (including but not limited to ASME,
            ISO, IEC, SANS, and SANRAL publications), the developer makes no warranty,
            express or implied, as to the accuracy, completeness, or fitness for purpose of
            any result produced by the Service.
          </p>
          <p className="mt-2">
            Engineering calculations involve simplifying assumptions that may not apply to your
            specific situation. You are responsible for understanding the assumptions underlying
            each tool and determining whether those assumptions are appropriate for your application.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, the developer of this website
            shall not be liable for any direct, indirect, incidental, special, consequential,
            or punitive damages arising from:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>The use of or inability to use the Service</li>
            <li>Any errors or omissions in any calculation result</li>
            <li>Reliance on any output from the Service in any design or decision</li>
            <li>Interruption, suspension, or termination of the Service</li>
            <li>Any unauthorised access to or alteration of your data</li>
          </ul>
          <p className="mt-3">
            This limitation applies regardless of the legal theory on which the claim is based,
            and even if the developer has been advised of the possibility of such damages.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless the developer of this website from and
            against any claims, damages, losses, costs, and expenses (including reasonable
            legal fees) arising out of or in connection with your use of the Service or your
            breach of these Terms.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
            <li>Use automated scripts, bots, or scrapers to make excessive requests to the Service without prior written permission</li>
            <li>Reproduce, resell, or redistribute any part of the Service for commercial purposes without prior written consent</li>
            <li>Use the AI practice or assistant features in a manner intended to circumvent rate limits or generate large volumes of automated requests</li>
            <li>Misrepresent outputs of the Service as having been produced by, or approved by, a registered professional engineer</li>
          </ul>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">8. Intellectual Property</h2>
          <p>
            All content on this website, including but not limited to calculator logic,
            user interface design, text, and graphics, is the intellectual property of the
            developer unless otherwise stated. Underlying mathematical and engineering
            methodologies derived from published standards or textbooks are not claimed as
            proprietary.
          </p>
          <p className="mt-2">
            You may use results from the Service for personal, academic, or professional
            engineering purposes. You may not copy, republish, or distribute the software,
            user interface, or content of the Service for commercial purposes without
            prior written permission.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">9. Third-Party Services</h2>
          <p>
            The Service uses Google Analytics to collect anonymous usage data to improve the
            Service. The AI practice and assistant features are powered by Anthropic&rsquo;s
            Claude API. Use of these features is also subject to the respective third-party
            terms of service. The developer is not responsible for the availability, accuracy,
            or content of third-party services.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">10. Availability and Changes</h2>
          <p>
            The developer reserves the right to modify, suspend, or discontinue the Service
            at any time without notice. The developer may also update these Terms at any time.
            Continued use of the Service after changes constitutes acceptance of the revised
            Terms. The &ldquo;Last updated&rdquo; date at the top of this page reflects when
            changes were last made.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">11. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the
            Republic of South Africa. Any disputes arising from these Terms or the use of the
            Service shall be subject to the exclusive jurisdiction of the courts of South Africa.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">12. Contact</h2>
          <p>
            If you have questions about these Terms, please contact:{" "}
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
          <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
