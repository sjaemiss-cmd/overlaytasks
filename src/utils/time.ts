import dayjs from "dayjs";

export const minutesUntil = (deadlineIso: string, now: dayjs.Dayjs) => {
  return dayjs(deadlineIso).diff(now, "minute");
};

export const formatDeadline = (deadlineIso: string) => {
  return dayjs(deadlineIso).format("YYYY/MM/DD HH:mm");
};
