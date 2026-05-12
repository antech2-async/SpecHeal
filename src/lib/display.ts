const RUN_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta"
});

export function formatRunDate(value: string | Date) {
  return RUN_DATE_FORMATTER.format(new Date(value));
}
