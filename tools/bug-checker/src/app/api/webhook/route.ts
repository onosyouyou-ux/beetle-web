import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setSubscription, deleteSubscriptionByCustomerId } from '@/lib/kv';
import crypto from 'crypto';

async function sendTokenEmail(email: string, token: string) {
  // TODO: メールサービス（Resend等）を設定したらここに実装する
  // 例: await resend.emails.send({ to: email, subject: '購読トークン', text: token })
  console.warn(`[WARN] Token not emailed. email=${email} token=${token}`);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { customer_email?: string; customer: string };
    const token = crypto.randomUUID();
    await setSubscription(token, {
      email: session.customer_email ?? '',
      stripeCustomerId: session.customer,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    await sendTokenEmail(session.customer_email ?? '', token);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { customer: string };
    await deleteSubscriptionByCustomerId(sub.customer);
  }

  return NextResponse.json({ received: true });
}
