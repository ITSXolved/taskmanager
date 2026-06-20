// Builds WhatsApp deep links for sending credentials.
// The app/login URL is configured via NEXT_PUBLIC_APP_URL (.env), falling back
// to the current origin in the browser.

export function appUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function credentialsMessage(opts: {
  name: string;
  email: string;
  password: string;
}): string {
  return (
    `Hi ${opts.name}, your Ayadi Work Flow account is ready.\n\n` +
    `Login email: ${opts.email}\n` +
    `Temporary password: ${opts.password}\n\n` +
    `Sign in at https://taskmanager-vert-gamma.vercel.app/login — you'll be asked to set a new password on first login.`
  );
}

export function whatsappUrl(phone: string, message: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string): boolean {
  const url = whatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
