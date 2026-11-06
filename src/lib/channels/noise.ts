const NOISE = /(newsletter|otp|dmarc|unsubscribe|mailer-daemon|ratehawk\.com|b2b@news|amazon|linkedin|olympia|4winds|ryanair|imperatore|stripe|wise|google analytics|taaft|wizz|kreo|volonline|western union|press up|alpitour|yanolja|highlevel|supabase|fastweb|looking4|webbeds|sand tour|getresponse|musvc|noreply|no-reply|donotreply|github\.com|cursor\.com|hostinger)/i;

export function isNoiseMessage(input: {
  from?: string | null;
  subject?: string | null;
  text?: string | null;
}) {
  const blob = `${input.from || ""} ${input.subject || ""} ${input.text || ""}`;
  return NOISE.test(blob);
}
