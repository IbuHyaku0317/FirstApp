namespace Memory.Domain;

/// <summary>
/// ユーザーの記念日設定履歴。有効終了日時がないレコードが現在の設定を表す。
/// </summary>
public sealed class AnniversarySetting
{
    private AnniversarySetting() { }

    public AnniversarySetting(Guid userId, string name, int month, int day, DateTimeOffset effectiveFrom)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 80)
        {
            throw new ArgumentException("Anniversary name is required and must be 80 characters or fewer.", nameof(name));
        }

        ValidateDate(month, day);
        Id = Guid.NewGuid();
        UserId = userId;
        Name = name.Trim();
        Month = month;
        Day = day;
        EffectiveFrom = effectiveFrom;
        CreatedAt = effectiveFrom;
    }

    public Guid Id { get; private init; }
    public Guid UserId { get; private init; }
    public string Name { get; private init; } = null!;
    public int Month { get; private init; }
    public int Day { get; private init; }
    public DateTimeOffset EffectiveFrom { get; private init; }
    public DateTimeOffset? EffectiveTo { get; private set; }
    public DateTimeOffset CreatedAt { get; private init; }

    public bool IsOn(DateOnly date)
    {
        if (Month == 2 && Day == 29 && !DateTime.IsLeapYear(date.Year))
        {
            return date.Month == 2 && date.Day == 28;
        }

        return date.Month == Month && date.Day == Day;
    }

    public void Close(DateTimeOffset at) => EffectiveTo ??= at;

    private static void ValidateDate(int month, int day)
    {
        if (month is < 1 or > 12 || day is < 1 || day > DateTime.DaysInMonth(2024, month))
        {
            throw new ArgumentOutOfRangeException(nameof(day), "The anniversary month and day are invalid.");
        }
    }
}
