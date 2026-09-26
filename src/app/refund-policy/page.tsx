import type { Metadata } from 'next'
import { LegalPage, Section } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy — Medical Support',
  description:
    'When you can cancel an order, when a pharmacist can reject a prescription, and how long a refund takes.',
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Cancellation & Refunds"
      updated="26 September 2026"
      intro="We would rather you did not have to chase a refund. Here is exactly when you can cancel, when a pharmacist can stop an order, and how long your money takes to come back."
    >
      <Section heading="Cancel before the pharmacy starts">
        <p>
          You can cancel an order yourself from your order page while it is
          still awaiting payment, awaiting a prescription check, or awaiting
          pharmacy confirmation. Cancelling at this point puts the medicine back
          into stock and nothing is charged.
        </p>
        <p>
          Once the pharmacy has started packing, self-service cancellation is
          withdrawn, because the medicine has already been handled. After that,
          ask our support team and we will do what we can.
        </p>
      </Section>

      <Section heading="When a pharmacist rejects a prescription">
        <p>
          A pharmacist may reject a prescription if it is invalid, expired,
          illegible, altered, or does not match the medicines ordered. If a
          prescription is rejected, the whole order is cancelled and the full
          amount is refunded to the original payment method. The medicines
          return to stock automatically.
        </p>
        <p>
          If a prescription is rejected we will tell you why in the order
          timeline, and you can upload a clearer or fresher prescription to
          reorder.
        </p>
      </Section>

      <Section heading="When we cannot fulfil">
        <p>
          If an item is out of stock at the pharmacy, the pharmacy is closed, or
          we cannot deliver to your address, the order is cancelled and refunded
          in full. This applies whether or not you noticed the problem before
          paying.
        </p>
        <p>
          We may suggest a different brand containing the same active
          ingredient. We will never substitute a different salt or a different
          medicine without your agreement, and your consent is recorded in the
          order.
        </p>
      </Section>

      <Section heading="Damaged, wrong or missing items">
        <p>
          If what arrives is wrong, damaged, or missing, tell us within 48 hours
          of delivery and send a photo. We will arrange a replacement or a full
          refund, and you do not need to return the item unless we ask.
        </p>
        <p>
          Because medicines are health products, we cannot accept returns of
          medicines for resale. Anything we ask you to send back is destroyed
          rather than restocked, for everyone&rsquo;s safety.
        </p>
      </Section>

      <Section heading="How long a refund takes">
        <p>Once we approve a refund:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>UPI and cards: the money usually reaches your account in 3 to 5 working days.</li>
          <li>Netbanking: 5 to 7 working days, depending on your bank.</li>
          <li>
            Your bank&rsquo;s processing time is outside our control. We cannot
            speed it up, but we can confirm with the gateway that a refund was
            raised.
          </li>
        </ul>
        <p>
          We refund to the original payment method only. We cannot refund to a
          different account, UPI ID, or to cash.
        </p>
      </Section>

      <Section heading="Something gone wrong with a payment">
        <p>
          If money left your account but the order shows as unpaid, the amount is
          not captured and is returned to you automatically. If you were charged
          twice for one order, contact us with both references and we will reverse
          the duplicate.
        </p>
      </Section>

      <Section heading="Ask for a refund">
        <p>
          Use the{' '}
          <a href="/contact" className="text-primary underline">
            contact page
          </a>{' '}
          and include your order number. We respond to refund requests within
          one working day. Nothing on this page overrides your statutory rights
          as a consumer.
        </p>
      </Section>
    </LegalPage>
  )
}
