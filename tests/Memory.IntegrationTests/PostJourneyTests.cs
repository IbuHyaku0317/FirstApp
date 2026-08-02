using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Memory.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace Memory.IntegrationTests;

public sealed class PostJourneyTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer database = new PostgreSqlBuilder().WithImage("postgres:17-alpine").Build();
    private WebApplicationFactory<Program>? factory;
    private HttpClient? client;
    private readonly string mediaRoot = Path.Combine(Path.GetTempPath(), "memory-integration", Guid.NewGuid().ToString("N"));

    public async ValueTask InitializeAsync()
    {
        await database.StartAsync();
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = database.GetConnectionString(),
                ["Media:LocalRoot"] = mediaRoot,
            }));
        });
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<MemoryDbContext>().Database.MigrateAsync();
        client = factory.CreateClient();
    }

    public async ValueTask DisposeAsync()
    {
        client?.Dispose();
        if (factory is not null) await factory.DisposeAsync();
        await database.DisposeAsync();
        if (Directory.Exists(mediaRoot)) Directory.Delete(mediaRoot, true);
    }

    [Fact]
    public async Task Photo_is_locked_until_clock_reaches_one_year_later()
    {
        var http = client!;
        var email = $"integration-{Guid.NewGuid():N}@example.com";
        using var register = await http.PostAsJsonAsync("/api/v1/auth/register", new
        {
            displayName = "Integration user", email, password = "password-12345",
            timezone = "Asia/Tokyo", preferredLanguage = "en", device = "integration-test",
        });
        register.EnsureSuccessStatusCode();
        var auth = await register.Content.ReadFromJsonAsync<JsonElement>();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        var initialClock = await http.GetFromJsonAsync<JsonElement>("/api/v1/development/clock");
        var createdAt = initialClock.GetProperty("utcNow").GetDateTimeOffset();
        var occurredOn = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(createdAt, TimeZoneInfo.FindSystemTimeZoneById("Asia/Tokyo")).DateTime);

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("A memory under test"), "caption");
        var image = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xD9]);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        form.Add(image, "media", "memory.jpg");
        using var create = await http.PostAsync("/api/v1/posts", form);
        create.EnsureSuccessStatusCode();

        using var locked = await http.GetAsync($"/api/v1/calendar/{occurredOn.AddYears(1):yyyy-MM-dd}");
        locked.EnsureSuccessStatusCode();
        Assert.Equal(0, (await locked.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength());

        using var moveClock = await http.PutAsJsonAsync("/api/v1/development/clock", new { utcNow = createdAt.AddYears(1).AddDays(1) });
        moveClock.EnsureSuccessStatusCode();
        var unlocked = await http.GetFromJsonAsync<JsonElement>($"/api/v1/calendar/{occurredOn.AddYears(1):yyyy-MM-dd}");
        Assert.Equal(1, unlocked.GetArrayLength());
        Assert.Equal("A memory under test", unlocked[0].GetProperty("caption").GetString());
        var mediaUrl = unlocked[0].GetProperty("media")[0].GetProperty("url").GetString();
        using var media = await http.GetAsync(mediaUrl);
        media.EnsureSuccessStatusCode();
        Assert.Equal("image/jpeg", media.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Second_post_on_normal_day_is_rejected_and_cancel_restores_slot()
    {
        var http = client!;
        var email = $"daily-limit-{Guid.NewGuid():N}@example.com";
        var register = await http.PostAsJsonAsync("/api/v1/auth/register", new { displayName = "Limit user", email, password = "password-12345", timezone = "Asia/Tokyo", preferredLanguage = "en" });
        var auth = await register.Content.ReadFromJsonAsync<JsonElement>();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        var first = await CreatePhotoAsync(http);
        first.EnsureSuccessStatusCode();
        var post = await first.Content.ReadFromJsonAsync<JsonElement>();
        var second = await CreatePhotoAsync(http);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        using var cancel = await http.DeleteAsync($"/api/v1/posts/{post.GetProperty("id").GetGuid()}");
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        using var replacement = await CreatePhotoAsync(http);
        replacement.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Free_user_can_upload_video_only_because_api_runs_in_development()
    {
        var http = client!;
        var email = $"development-video-{Guid.NewGuid():N}@example.com";
        using var register = await http.PostAsJsonAsync("/api/v1/auth/register", new
        {
            displayName = "Development video user",
            email,
            password = "password-12345",
            timezone = "Asia/Tokyo",
            preferredLanguage = "en",
        });
        register.EnsureSuccessStatusCode();
        var auth = await register.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("free", auth.GetProperty("user").GetProperty("membership").GetString());
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        using var form = new MultipartFormDataContent();
        var video = new ByteArrayContent(CreateTenSecondMp4());
        video.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        form.Add(video, "media", "development-test.mp4");

        using var create = await http.PostAsync("/api/v1/posts", form);
        create.EnsureSuccessStatusCode();
        var post = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("video", post.GetProperty("media")[0].GetProperty("kind").GetString());
    }

    private static Task<HttpResponseMessage> CreatePhotoAsync(HttpClient http)
    {
        var form = new MultipartFormDataContent();
        var image = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xD9]);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        form.Add(image, "media", "memory.jpg");
        return http.PostAsync("/api/v1/posts", form);
    }

    private static byte[] CreateTenSecondMp4() =>
    [
        // ftyp box
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x00, 0x00,
        0x69, 0x73, 0x6F, 0x6D, 0x6D, 0x70, 0x34, 0x31,
        // moov box containing a version-0 mvhd box (timescale 1000, duration 10000 = 10 seconds)
        0x00, 0x00, 0x00, 0x24, 0x6D, 0x6F, 0x6F, 0x76,
        0x00, 0x00, 0x00, 0x1C, 0x6D, 0x76, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xE8,
        0x00, 0x00, 0x27, 0x10,
    ];
}
