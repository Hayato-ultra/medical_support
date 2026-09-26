import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, LifeBuoy, Mail, MapPin, Phone, Store, Truck } from 'lucide-react'
import { LegalPage, Section } from '@/components/legal-page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Contact — Medical Support',
  description:
    'Reach Medical Support support for an order, a prescription, or a pharmacy partnership, plus emergency numbers.',
}

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    body: 'support@medicalsupport.example',
    note: 'We reply within one working day',
  },
  {
    icon: Phone,
    title: 'Support line',
    body: '1800 000 000',
    note: 'Mon to Sat, 8am to 10pm IST',
  },
  {
    icon: MapPin,
    title: 'Registered office',
    body: '12, MG Road, Indore, Madhya Pradesh 452001',
    note: 'Registered pharmacy premises',
  },
  {
    icon: LifeBuoy,
    title: 'Data protection',
    body: 'privacy@medicalsupport.example',
    note: 'Privacy requests and access requests',
  },
]

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact us"
      updated="26 September 2026"
      intro="Tell us your order number and what has gone wrong, and we will pick it up from there. The quickest route for an order already placed is the order page itself, because it shows you exactly what our system believes happened."
    >
      <Section heading="Already placed an order?">
        <p>
          Open the order and use its timeline first. It shows the current status,
          the payment record, and, once the order is out for delivery, the
          delivery code and the rider assigned to it. If the status looks wrong,
          the support request below should quote your order number, shown at the
          top of the order page.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/orders">Go to my orders</Link>
          </Button>
        </div>
      </Section>

      <Section heading="How to reach us">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <Card key={c.title}>
              <CardContent className="p-5">
                <c.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm">{c.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          The address and numbers above are placeholders for this build. Replace
          them with your real registered details before going live, since a
          contact page with a fake number is worse than no contact page.
        </p>
      </Section>

      <Section heading="Pharmacies and riders">
        <p>
          Interested in dispensing through the platform, or in delivering for us?
          Create an account with the pharmacy or rider role from the{' '}
          <a href="/register" className="text-primary underline">
            registration page
          </a>
          . A pharmacy stays inactive until an admin verifies its drug licence,
          so keep your licence number and registered address to hand.
        </p>
        <p className="flex items-start gap-2">
          <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Already approved and need your dashboard?{' '}
          <Link href="/login" className="text-primary underline">
            Pharmacy login
          </Link>
          .
        </p>
      </Section>

      <Section heading="Delivery problems">
        <p className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          If your order is late, the rider is unreachable, or the address is
          wrong, contact us rather than ordering again. Re-ordering can leave you
          with two deliveries and a duplicate charge, which we then have to
          reverse.
        </p>
      </Section>

      <Section heading="Emergencies">
        <p>
          We are not an emergency service and cannot give medical advice. If
          someone is seriously unwell, call{' '}
          <span className="font-medium text-foreground">108</span> for an
          ambulance or <span className="font-medium text-foreground">112</span>{' '}
          for all emergencies, or go to your nearest hospital.
        </p>
        <p className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          For a suspected adverse reaction to a medicine, tell the dispensing
          pharmacy and your prescriber, and seek medical help. Please also let us
          know so we can review the order.
        </p>
      </Section>
    </LegalPage>
  )
}
