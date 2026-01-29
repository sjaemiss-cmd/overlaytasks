import dayjs from "dayjs";

export const minutesUntil = (deadlineIso: string, now: dayjs.Dayjs) => {
  return dayjs(deadlineIso).diff(now, "minute");
};

export const formatDeadline = (deadlineIso: string) => {
  return dayjs(deadlineIso).format("YYYY/MM/DD HH:mm");
};

export const addMinutesToLocalDatetime = (
  value: string,
  minutes: number,
  fallbackBase?: dayjs.Dayjs
) => {
  const current = dayjs(value);
  const base = current.isValid() ? current : (fallbackBase ?? dayjs());
  return base.add(minutes, "minute").format("YYYY-MM-DDTHH:mm");
};
