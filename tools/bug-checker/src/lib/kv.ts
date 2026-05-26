const kvAvailable = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _kv: any = null;
async function getKv() {
  if (!kvAvailable) return null;
  if (!_kv) _kv = (await import('@vercel/kv')).kv;
  return _kv;
}

function getMonthKey(): string {
  const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const yyyy = jstNow.getUTCFullYear();
  const mm = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
  return `scan:count:${yyyy}-${mm}`;
}

function getResetAt(): string {
  const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const nextY = m === 11 ? y + 1 : y;
  const nextM = String(m === 11 ? 1 : m + 2).padStart(2, '0');
  return `${nextY}-${nextM}-01T00:00:00+09:00`;
}

export async function getCount() {
  const limit = parseInt(process.env.FREE_LIMIT ?? '10000');
  const client = await getKv();
  const used = client ? (((await client.get(getMonthKey())) as number) ?? 0) : 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: getResetAt(),
  };
}

export async function incrementCount(): Promise<number> {
  const client = await getKv();
  if (!client) return 0;
  return client.incr(getMonthKey());
}

export async function isLimitExceeded(): Promise<boolean> {
  if (!kvAvailable) return false;
  const { remaining } = await getCount();
  return remaining <= 0;
}

export interface Subscription {
  email: string;
  stripeCustomerId: string;
  status: string;
  createdAt: string;
}

export async function getSubscription(token: string): Promise<Subscription | null> {
  const client = await getKv();
  if (!client) return null;
  return client.get(`subscription:${token}`) as Promise<Subscription | null>;
}

export async function setSubscription(token: string, data: Subscription) {
  const client = await getKv();
  if (!client) return;
  await client.set(`subscription:${token}`, data);
  await client.set(`cust:${data.stripeCustomerId}`, token);
}

export async function deleteSubscriptionByCustomerId(customerId: string) {
  const client = await getKv();
  if (!client) return;
  const token = await client.get(`cust:${customerId}`) as string | null;
  if (token) {
    await client.del(`subscription:${token}`);
    await client.del(`cust:${customerId}`);
  }
}
