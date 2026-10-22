// Timezone helpers. Appointment times are entered in the office timezone
// (configurable, default America/Los_Angeles) and stored in UTC.

export type DayHours = { closed: boolean; open: string; close: string };
/** Index 0 = Sunday … 6 = Saturday, matching Date#getDay(). */
export type OfficeHours = DayHours[];

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTimeString(value: string) {
  return TIME_RE.test(value);
}

export function isValidDateString(value: string) {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of an instant in a given timezone. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday,
  };
}

function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock date ("2026-11-03") and time ("14:30") in `timeZone`
 * to a UTC Date. Returns null for invalid input or for local times that do
 * not exist (skipped by a daylight-saving transition).
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date | null {
  if (!isValidDateString(dateStr) || !isValidTimeString(timeStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  let guess = naive - offsetMs(new Date(naive), timeZone);
  // Second pass corrects guesses that straddle a DST boundary.
  guess = naive - offsetMs(new Date(guess), timeZone);
  const result = new Date(guess);
  const check = zonedParts(result, timeZone);
  if (check.hour !== h || check.minute !== mi || check.day !== d) return null;
  return result;
}

/** "YYYY-MM-DD" for an instant in the given timezone. */
export function zonedDateString(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function zonedTimeString(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export type SchedulingRules = {
  timezone: string;
  officeHours: OfficeHours;
  slotMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  durationMinutes: number;
};

/**
 * Validates a requested appointment start against office hours and booking
 * limits. Returns an error message, or null if the request is acceptable.
 */
export function validateAppointmentTime(start: Date, rules: SchedulingRules, now = new Date()): string | null {
  const earliest = now.getTime() + rules.minNoticeHours * 3600_000;
  if (start.getTime() < earliest) {
    return rules.minNoticeHours > 0
      ? `Requests need at least ${rules.minNoticeHours} hours' notice.`
      : "Please choose a time in the future.";
  }
  if (start.getTime() > now.getTime() + rules.maxAdvanceDays * 86400_000) {
    return `Requests can be made up to ${rules.maxAdvanceDays} days in advance.`;
  }
  const p = zonedParts(start, rules.timezone);
  const day = rules.officeHours[p.weekday];
  if (!day || day.closed) return `The office is closed on ${WEEKDAY_NAMES[p.weekday]}s.`;
  const startMin = p.hour * 60 + p.minute;
  if (startMin % rules.slotMinutes !== 0) {
    return `Please choose a time on a ${rules.slotMinutes}-minute boundary.`;
  }
  if (startMin < minutes(day.open) || startMin + rules.durationMinutes > minutes(day.close)) {
    return `On ${WEEKDAY_NAMES[p.weekday]}s appointments run between ${day.open} and ${day.close}, ending by closing time.`;
  }
  return null;
}

/** Short timezone label such as "PST" or "PDT" for display next to times. */
export function timeZoneAbbreviation(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

export function formatDateTime(date: Date | null | undefined, timeZone: string, withZone = true) {
  if (!date) return "—";
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return withZone ? `${s} ${timeZoneAbbreviation(date, timeZone)}` : s;
}

export function formatDate(date: Date | null | undefined, timeZone: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date | null | undefined, timeZone: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function defaultOfficeHours(): OfficeHours {
  return [
    { closed: true, open: "10:00", close: "16:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "18:00" },
    { closed: false, open: "09:00", close: "17:00" },
    { closed: false, open: "10:00", close: "14:00" },
  ];
}

export function parseOfficeHours(value: unknown): OfficeHours {
  const fallback = defaultOfficeHours();
  if (!Array.isArray(value) || value.length !== 7) return fallback;
  return value.map((d, i) => {
    const obj = (d ?? {}) as Partial<DayHours>;
    const open = typeof obj.open === "string" && isValidTimeString(obj.open) ? obj.open : fallback[i].open;
    const close = typeof obj.close === "string" && isValidTimeString(obj.close) ? obj.close : fallback[i].close;
    return { closed: Boolean(obj.closed), open, close };
  });
}

/** Generic timezone name such as "Pacific Time". */
export function timeZoneName(timeZone: string) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longGeneric" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Value for an <input type="datetime-local"> in the office timezone. */
export function toLocalInput(date: Date | null | undefined, timeZone: string) {
  if (!date) return "";
  return `${zonedDateString(date, timeZone)}T${zonedTimeString(date, timeZone)}`;
}

/** Parses a datetime-local value entered in the office timezone. */
export function fromLocalInput(value: string | null | undefined, timeZone: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? zonedTimeToUtc(m[1], m[2], timeZone) : null;
}
