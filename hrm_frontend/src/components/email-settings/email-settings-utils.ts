import { isAxiosError } from "axios";

export function splitEmails(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,\s]+/)
    .map((email) => email.trim())
    .filter((email) => {
      if (!email || seen.has(email.toLowerCase())) return false;
      seen.add(email.toLowerCase());
      return true;
    });
}

export function emailSettingsError(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(". ");
  }
  return "Không thể cập nhật cấu hình email. Vui lòng thử lại.";
}
