namespace Memory.Domain;

/// <summary>「○年前の今日」を決めるカレンダー上のドメインルール。</summary>
public static class AnniversaryPolicy
{
    public static DateOnly DateYearsAgo(DateOnly today, int yearsAgo)
    {
        var year = today.Year - yearsAgo;
        // うるう年の2月29日の思い出は、平年では2月28日に表示する。
        return today.Month == 2 && today.Day == 28 && DateTime.IsLeapYear(year)
            ? new DateOnly(year, 2, 29)
            : new DateOnly(year, today.Month, today.Day);
    }
}
