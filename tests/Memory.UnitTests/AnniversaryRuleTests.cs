using Memory.Application;
using Xunit;

namespace Memory.UnitTests;

public class AnniversaryRuleTests
{
    [Fact] public void Normal_date_maps_to_previous_year() => Assert.Equal(new DateOnly(2025, 8, 1), AnniversaryRule.DateYearsAgo(new(2026, 8, 1), 1));
    [Fact] public void February_28_shows_leap_day_memory() => Assert.Equal(new DateOnly(2024, 2, 29), AnniversaryRule.DateYearsAgo(new(2025, 2, 28), 1));
}
