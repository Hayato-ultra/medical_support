import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section } from '@/components/legal-page'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'About — Mediconnect',
  description:
    'What Mediconnect is, who it is for, and how the pharmacy and rider network works.',
}

export default function AboutPage() {
  return (
    <LegalPage
      title="About Mediconnect"
      updated="26 September 2026"
      intro="Mediconnect puts a licensed pharmacy, a pharmacist and a rider between you and a medicine you need, and keeps you informed the whole way through."
    >
      <Section heading="What we are">
        <p>
          We are an online pharmacy platform. You search or upload a
          prescription, a pharmacist checks it, a licensed pharmacy dispenses
          it, and a rider delivers it. The whole chain is visible on one order
          page, and money moves only when the order is genuinely accepted.
        </p>
        <p>
          We started because buying a repeat prescription should not mean
          travelling to a shop, and because nobody should have to guess whether
          their medicine will arrive or whether the pharmacy has actually read
          their prescription.
        </p>
      </Section>

      <Section heading="How an order works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>You find a medicine or upload a prescription.</li>
          <li>You pay. Stock is only committed once payment goes through.</li>
          <li>
            If a prescription is involved, a pharmacist verifies it, usually
            within about 15 minutes.
          </li>
          <li>The pharmacy accepts the order, packs it, and it is collected.</li>
          <li>
            The rider delivers to your address, and you confirm the handover
            with a six-digit code.
          </li>
        </ol>
        <p>
          If anything goes wrong at any step, the order timeline says so and a
          refund is triggered automatically where one is owed. See the{' '}
          <Link href="/refund-policy" className="text-primary underline">
            cancellation and refund policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="Who we serve">
        <p>
          Customers, mostly ordering a repeat medicine or using a prescription
          they no longer have on paper. Pharmacies that want to sell medicines
          without building their own delivery stack. Riders who need work with a
          predictable flow of orders. And prescribers, who can see that a
          prescription they wrote actually reached a pharmacist.
        </p>
      </Section>

      <Section heading="What we will not do">
        <p>
          We will not sell a prescription medicine without a valid prescription,
          substitute a different salt without asking, sell an expired medicine,
          or guess at a prescription we cannot read. We will not let a rider
          mark a delivery complete on their own: the code has to come from you.
        </p>
        <p>
          We are not doctors and we do not give medical advice. Anything that
          needs a clinician&rsquo;s judgement needs a clinician.
        </p>
      </Section>

      <Section heading="Start here">
        <p>Depending on what you came for:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/medicines">Browse medicines</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prescriptions/upload">Upload a prescription</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Create an account</Link>
          </Button>
        </div>
        <p className="pt-2">
          Running a pharmacy?{' '}
          <Link href="/login" className="text-primary underline">
            Sign in to the pharmacy dashboard
          </Link>{' '}
          or ask to{' '}
          <Link href="/contact" className="text-primary underline">
            become a partner
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  )
}
