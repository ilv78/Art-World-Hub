export default function Privacy() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="font-serif text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: 26 March 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-semibold">1. Data Controller</h2>
            <p>
              ArtVerse ("we", "us", "our") is the data controller responsible for
              processing your personal data. If you have any questions about this
              Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              Email: <a href="mailto:privacy@artverse.idata.ro" className="text-primary hover:underline">privacy@artverse.idata.ro</a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">2. Personal Data We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account data:</strong> name, email address, password (hashed), profile image</li>
              <li><strong>Artist profile data:</strong> biography, country, specialisation, social media links, portfolio images</li>
              <li><strong>Transaction data:</strong> order history, cart contents, shipping information</li>
              <li><strong>Usage data:</strong> pages visited, actions taken, browser type, IP address, device information</li>
              <li><strong>Communication data:</strong> messages, support requests, feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">3. Lawful Basis for Processing</h2>
            <p>We process your personal data on the following legal bases under the GDPR:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Contract performance (Art. 6(1)(b)):</strong> to provide our platform services, process orders, and manage your account</li>
              <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> to improve our services, prevent fraud, and ensure platform security</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> for optional marketing communications and non-essential cookies</li>
              <li><strong>Legal obligation (Art. 6(1)(c)):</strong> to comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">4. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account</li>
              <li>To display artist profiles and artworks in the gallery</li>
              <li>To process purchases and facilitate communication between buyers and artists</li>
              <li>To operate auctions and exhibition features</li>
              <li>To send transactional emails (order confirmations, account updates)</li>
              <li>To improve and personalise your experience on the platform</li>
              <li>To detect and prevent fraudulent or unauthorised activity</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">5. Cookies and Tracking</h2>
            <p>
              We use essential cookies to maintain your session and preferences.
              These are strictly necessary for the platform to function and do not
              require consent under the ePrivacy Directive.
            </p>
            <p>
              We do not use third-party advertising trackers. If we introduce
              analytics or non-essential cookies in the future, we will obtain your
              prior consent through a clear cookie banner.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">6. Data Sharing and Transfers</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Infrastructure providers:</strong> hosting and database services located within the EEA</li>
              <li><strong>Email service providers:</strong> for transactional emails (with appropriate data processing agreements)</li>
              <li><strong>Authentication providers:</strong> Google OAuth, when you choose to sign in with Google</li>
            </ul>
            <p>
              Where data is transferred outside the EEA, we ensure appropriate
              safeguards are in place, such as Standard Contractual Clauses (SCCs)
              or adequacy decisions by the European Commission.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">7. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfil
              the purposes described in this policy, or as required by law. Account
              data is retained while your account is active. Upon account deletion,
              personal data is removed within 30 days, except where retention is
              required for legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">8. Your Rights</h2>
            <p>
              Under the GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Right of access (Art. 15):</strong> obtain a copy of your personal data</li>
              <li><strong>Right to rectification (Art. 16):</strong> correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure (Art. 17):</strong> request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to restrict processing (Art. 18):</strong> limit how we use your data</li>
              <li><strong>Right to data portability (Art. 20):</strong> receive your data in a machine-readable format</li>
              <li><strong>Right to object (Art. 21):</strong> object to processing based on legitimate interests</li>
              <li><strong>Right to withdraw consent:</strong> at any time, without affecting prior processing</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@artverse.idata.ro" className="text-primary hover:underline">privacy@artverse.idata.ro</a>.
              We will respond within 30 days as required by the GDPR.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">9. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal data, including encryption in transit (TLS),
              hashed passwords, access controls, and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">10. Supervisory Authority</h2>
            <p>
              If you believe your data protection rights have been violated, you
              have the right to lodge a complaint with your local data protection
              supervisory authority. In the Netherlands, the relevant authority is
              the Autoriteit Persoonsgegevens (AP) —{" "}
              <a href="https://www.autoriteitpersoonsgegevens.nl" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                www.autoriteitpersoonsgegevens.nl
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes
              will be communicated via email or a prominent notice on the platform.
              Your continued use of ArtVerse after changes constitutes acceptance of
              the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
