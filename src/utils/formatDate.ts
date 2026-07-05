// Human-friendly German date labels for the chat UI, matching the original
// mockup ("Heute", "Gestern", "28. Jun.").

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDate(value: string | Date): string {
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(date);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" })
    .format(date);
}
