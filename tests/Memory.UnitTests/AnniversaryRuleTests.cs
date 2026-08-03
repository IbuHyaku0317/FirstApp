using Memory.Domain;
using Xunit;

namespace Memory.UnitTests;

public class AnniversaryRuleTests
{
    [Fact]
    public void Normal_date_maps_to_previous_year() =>
        Assert.Equal(new DateOnly(2025, 8, 1), AnniversaryPolicy.DateYearsAgo(new(2026, 8, 1), 1));

    [Fact]
    public void February_28_shows_leap_day_memory() =>
        Assert.Equal(new DateOnly(2024, 2, 29), AnniversaryPolicy.DateYearsAgo(new(2025, 2, 28), 1));

    [Fact]
    public void Leap_day_unlocks_on_february_28_in_a_non_leap_year() =>
        Assert.Equal(new DateOnly(2025, 2, 28), AnniversaryPolicy.DateNextYear(new(2024, 2, 29)));

    [Fact]
    public void Leap_day_anniversary_is_observed_on_february_28_in_a_non_leap_year()
    {
        var setting = new AnniversarySetting(Guid.NewGuid(), "Leap day", 2, 29, DateTimeOffset.UtcNow);

        Assert.True(setting.IsOn(new DateOnly(2025, 2, 28)));
    }

    [Fact]
    public void Second_anniversary_post_can_be_suppressed_without_deleting_the_first()
    {
        var first = new Post(Guid.NewGuid(), null, new DateOnly(2026, 7, 1), 1);
        var second = new Post(first.UserId, null, new DateOnly(2026, 7, 1), 2, Guid.NewGuid());

        second.SuppressBecauseAnniversaryChanged();

        Assert.Null(first.SuppressionReason);
        Assert.Equal("anniversary_changed_before_unlock", second.SuppressionReason);
    }

    [Fact]
    public void Post_can_only_be_canceled_during_the_first_ten_minutes()
    {
        var post = new Post(Guid.NewGuid(), null, new DateOnly(2026, 8, 1));

        Assert.True(post.CanCancel(post.CreatedAt.AddMinutes(10)));
        Assert.False(post.CanCancel(post.CreatedAt.AddMinutes(10).AddTicks(1)));
    }
}
