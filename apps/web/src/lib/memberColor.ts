export const MEMBER_COLORS = [
  "oklch(0.6 0.19 288)",
  "oklch(0.62 0.2 340)",
  "oklch(0.65 0.15 200)",
  "oklch(0.68 0.16 140)",
  "oklch(0.7 0.18 70)",
  "oklch(0.6 0.2 20)",
];

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % MEMBER_COLORS.length;
  return MEMBER_COLORS[index]!;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
