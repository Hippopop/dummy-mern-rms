export const money = (amount: number) =>
  `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/* Stock totals accumulate through repeated $inc, so they carry float noise
 * (44.419999999999995). Show at most three decimals and drop trailing zeros. */
export const qty = (amount: number) =>
  Number(amount.toFixed(3)).toLocaleString('en-BD', { maximumFractionDigits: 3 });
