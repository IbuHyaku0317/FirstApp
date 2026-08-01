import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TextButton } from "../components/atoms";
import { CalendarGrid } from "../components/organisms/CalendarGrid";
import { useLanguage } from "../providers/LanguageProvider";
import { api } from "../shared/api/client";

export function CalendarPage() {
  const now = new Date();
  const { t } = useLanguage();
  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const query = useQuery({
    queryKey: ["calendar", cursor.getFullYear(), cursor.getMonth()],
    queryFn: () => api.calendar(cursor.getFullYear(), cursor.getMonth() + 1),
  });
  const counts = new Map(
    query.data?.map((entry) => [Number(entry.date.slice(-2)), entry.count]),
  );
  return (
    <main className="narrow calendar-page">
      <div className="month-nav">
        <TextButton
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
        >
          ←
        </TextButton>
        <h1>{t.yearMonth(cursor.getFullYear(), cursor.getMonth() + 1)}</h1>
        <TextButton
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
        >
          →
        </TextButton>
      </div>
      <CalendarGrid cursor={cursor} counts={counts} />
    </main>
  );
}
