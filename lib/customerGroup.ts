/** Match callbacks/tickets from the same person (phone or email). */

export function normalizePhoneKey(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function normalizeEmailKey(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function customerKey(fields: { phone?: string | null; email?: string | null; name?: string | null }): string {
  const phone = normalizePhoneKey(fields.phone);
  const email = normalizeEmailKey(fields.email);
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  const name = (fields.name || "").trim().toLowerCase();
  if (name) return `name:${name}`;
  return "unknown";
}

export type CustomerGroup<T> = {
  key: string;
  label: string;
  phone?: string;
  email?: string;
  name?: string;
  items: T[];
  latestAt: number;
};

export function groupByCustomer<T>(
  items: T[],
  pick: (item: T) => { phone?: string | null; email?: string | null; name?: string | null; createdAt?: string | Date | null },
): CustomerGroup<T>[] {
  const map = new Map<string, CustomerGroup<T>>();

  for (const item of items) {
    const fields = pick(item);
    const key = customerKey(fields);
    const created = fields.createdAt ? new Date(fields.createdAt).getTime() : 0;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        label: fields.name || fields.email || fields.phone || "Unknown customer",
        phone: fields.phone || undefined,
        email: fields.email || undefined,
        name: fields.name || undefined,
        items: [],
        latestAt: created,
      };
      map.set(key, group);
    }

    group.items.push(item);
    if (created >= group.latestAt) {
      group.latestAt = created;
      if (fields.name) group.name = fields.name;
      if (fields.phone) group.phone = fields.phone;
      if (fields.email) group.email = fields.email;
      group.label = fields.name || fields.email || fields.phone || group.label;
    }
    if (!group.phone && fields.phone) group.phone = fields.phone;
    if (!group.email && fields.email) group.email = fields.email;
    if (!group.name && fields.name) group.name = fields.name;
  }

  for (const group of map.values()) {
    group.items.sort((a, b) => {
      const ta = new Date(pick(a).createdAt || 0).getTime();
      const tb = new Date(pick(b).createdAt || 0).getTime();
      return tb - ta;
    });
  }

  return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
}

export function sameCustomer(
  a: { phone?: string | null; email?: string | null },
  b: { phone?: string | null; email?: string | null },
): boolean {
  return customerKey(a) === customerKey(b) && customerKey(a) !== "unknown";
}
