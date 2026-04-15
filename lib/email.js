/**
 * Send an email via Resend REST API.
 * Uses server-side env var — never call from client components.
 */
export async function sendEmail({ to, subject, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Resend error ${response.status}: ${err.message || "unknown"}`);
  }

  return response.json();
}
