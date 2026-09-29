import type { Metadata } from 'next'
import { LegalPage, Section } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy — Mediconnect',
  description:
    'What personal and health data Mediconnect collects, why we need it, and the rights you have over it.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="26 September 2026"
      intro="Mediconnect delivers prescription medicines, which means we handle health data. This policy explains exactly what we collect, why, and what you can ask us to do with it."
    >
      <Section heading="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account details</strong> — your
            name, phone number, and the email or password tied to your account.
          </li>
          <li>
            <strong className="text-foreground">Order details</strong> — the
            medicines you ordered, quantities, delivery address, and the status
            of each order.
          </li>
          <li>
            <strong className="text-foreground">Prescription images</strong> —
            photos or PDFs you upload, and the pharmacist&rsquo;s decision on
            them. These are health data and are treated as sensitive.
          </li>
          <li>
            <strong className="text-foreground">Payment records</strong> — the
            amount, the payment status, and the gateway reference. We never store
            full card or UPI credentials.
          </li>
          <li>
            <strong className="text-foreground">Technical logs</strong> — IP
            address, device and browser type, and pages visited, used to keep
            the service secure and working.
          </li>
        </ul>
      </Section>

      <Section heading="Why we need it">
        <p>
          We use your data to dispense the right medicines, deliver them to the
          right address, and take payment. A pharmacist cannot lawfully review a
          prescription without seeing it, and we cannot fulfil an order without
          your delivery details. We also use aggregated data to spot fraud and
          outages.
        </p>
        <p>
          We do not sell your personal data, and we do not share it for
          advertising. We share only what is needed to complete your order: your
          address and a summary of the order go to the dispensing pharmacy, and
          your address and contact number go to the rider delivering it.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Order and prescription records are retained for as long as needed to
          serve you and to meet our legal record-keeping duties. Prescription
          images are kept while the prescription remains in your library, and
          you can delete them at any time. Once an order is outside the
          statutory retention window, we delete the record.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>You can, at any time:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>See the prescriptions and orders saved to your account.</li>
          <li>Delete a saved prescription from your library.</li>
          <li>Correct your name, phone number or delivery address.</li>
          <li>
            Ask for a copy of the data we hold about you, or ask us to erase
            your account.
          </li>
        </ul>
        <p>
          To exercise any of these, use the{' '}
          <a href="/contact" className="text-primary underline">
            contact page
          </a>
          . We respond to verified requests within 30 days.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Passwords are stored as salted hashes, never in plain text. One-time
          codes are never shown in production and expire shortly after issue.
          Prescription images are served only to you and to the pharmacist
          reviewing them, not to anyone who can guess a filename. Payments are
          handled by a payment gateway, so card and UPI details never touch our
          servers.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your data we will
          notify you and the relevant authority as required by law.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          This service is not intended for anyone under 18. We do not knowingly
          collect data from children, and a parent or guardian should manage
          any account for a minor.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If we change this policy materially we will update the date at the top
          of this page and, for significant changes, notify you through the app
          or by message before the change takes effect.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this policy, or about the way we handle your data,
          reach us on the{' '}
          <a href="/contact" className="text-primary underline">
            contact page
          </a>
          . Our registered address is listed there alongside our data protection
          contact.
        </p>
      </Section>
    </LegalPage>
  )
}
