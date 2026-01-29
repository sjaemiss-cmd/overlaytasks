import { useEffect, useState } from "react";
import dayjs from "dayjs";

export const useTimeCheck = () => {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(dayjs());
    }, 30000);

    return () => clearInterval(id);
  }, []);

  return now;
};
