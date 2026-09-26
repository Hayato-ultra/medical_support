import type { Metadata } from 'next'
import { LegalPage, Section } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Service — Medical Support',
  description:
    'The terms that govern use of Medical Support, including prescriptions, orders, delivery, and account responsibilities.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="26 September 2026"
      intro="By using Medical Support you agree to these terms. They describe what we do, what we need from you, and the limits of what we can promise."
    >
      <Section heading="What we provide">
        <p>
          Medical Support is an online pharmacy platform. We connect you with
          licensed pharmacies that dispense medicines and with riders who
          deliver them. We are not a medical provider: we do not diagnose, we do
          not prescribe, and we do not give medical advice.
        </p>
        <p>
          Prescriptions are reviewed by a qualified pharmacist. A medicine you
          order without a prescription is dispensed only if the pharmacist is
          satisfied it is appropriate to do so.
        </p>
      </Section>

      <Section id="prescriptions" heading="Prescriptions">
        <p>
          Only a valid prescription from a registered medical practitioner is
          accepted. It must be legible, unaltered, and issued for the
          medicines being ordered. A prescription that is expired, edited,
          altered or unreadable may be rejected.
        </p>
        <p>
          Prescriptions we deem valid for repeat use are saved to your library so
          you can reorder quickly. You can delete them at any time, and deleting
          one removes it from the dispensing pharmacy&rsquo;s review queue.
        </p>
        <p>
          We may refuse to dispense or deliver any medicine, and we may cancel
          an order and refund it in full, where we believe dispensing it would
          be unsafe, unlawful, or contrary to the prescriber&rsquo;s intent.
        </p>
      </Section>

      <Section heading="Orders and payment">
        <p>
          An order is accepted once it is paid for and, where a prescription is
          involved, once a pharmacist has approved it. Stock is only confirmed
          at the point of payment, and we may cancel and refund an order if an
          item turns out to be unavailable.
        </p>
        <p>
          Prices include applicable taxes. Delivery charges are shown before you
          pay. A prescription that is rejected is refunded in full, as set out
          in our{' '}
          <a href="/refund-policy" className="text-primary underline">
            cancellation and refund policy
          </a>
          .
        </p>
      </Section>

      <Section heading="Delivery">
        <p>
          Delivery windows shown in the app are estimates, not guarantees. Delays
          can be caused by traffic, weather, stock movement at the pharmacy, or
          events outside our control.
        </p>
        <p>
          A delivery is complete only when you confirm it with the six-digit
          delivery code shown in your order. Do not share that code with anyone
          else, and never share it with a stranger who asks at the door. If
          somebody other than you demands the code, refuse and contact us.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          Keep your login details to yourself. You are responsible for activity
          on your account, including orders placed through it. Tell us
          immediately if you think someone else has access.
        </p>
        <p>
          You must be at least 18 years old to hold an account, and you must give
          accurate information. Accounts used for fraud, resale, or to obtain
          controlled medicines are closed without refund.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Order medicines for anyone other than yourself or your dependants.</li>
          <li>Attempt to obtain a controlled medicine without a valid prescription.</li>
          <li>
            Upload a prescription that is altered, copied from someone else, or
            not issued to you.
          </li>
          <li>
            Probe, scrape, overload or otherwise interfere with the service, or
            attempt to reach another customer&rsquo;s data.
          </li>
        </ul>
      </Section>

      <Section heading="Liability">
        <p>
          We take care to supply genuine medicines from licensed pharmacies and
          to deliver them as ordered. To the extent the law allows, our total
          liability for any order is limited to the amount you paid for that
          order. We are not liable for indirect or consequential loss, or for
          outcomes arising from your own misuse of a medicine, including taking
          a medicine without a valid prescription or against a pharmacist&rsquo;s
          advice.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be
          excluded, such as for death or personal injury caused by negligence, or
          for fraud.
        </p>
      </Section>

      <Section heading="Changes and termination">
        <p>
          We may update these terms, and will tell you before a material change
          takes effect. We may suspend or close an account that breaches these
          terms. Closing your account does not affect orders already placed.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of India, and the courts of India
          have exclusive jurisdiction over any dispute.
        </p>
      </Section>
    </LegalPage>
  )
}
