import { useLanguage } from "../../providers/LanguageProvider";

export function CalendarGrid({
  cursor,
  counts,
}: {
  cursor: Date;
  counts: Map<number, number>;
}) {
  const { t } = useLanguage();
  const blanks = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const days = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();

  return (
    <div className="calendar">
      {t.weekdays.map((day) => (
        <b key={day}>{day}</b>
      ))}
      {Array.from({ length: blanks }, (_, index) => (
        <i key={`blank-${index}`} />
      ))}
      {Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        return (
          <div key={day} className={counts.has(day) ? "has-memory" : ""}>
            <span>{day}</span>
            {counts.has(day) && (
              <small>
                {counts.get(day)}
                {t.items}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}
