// Public promotional link supplied by the approved affiliate programme.
// Preserve it verbatim: rewriting a CJ URL can invalidate attribution.
export function bookingLink(configured = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_URL) {
  const value = configured?.trim();
  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password) {
        return { href: value, affiliate: true };
      }
    } catch {
      // An invalid optional configuration must not break the trip workspace.
    }
  }
  return { href: "https://www.booking.com/", affiliate: false };
}
