using Memory.Domain;
using Microsoft.EntityFrameworkCore;

namespace Memory.Infrastructure;

public sealed class MemoryDbContext(DbContextOptions<MemoryDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<AnniversarySetting> AnniversarySettings => Set<AnniversarySetting>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresEnum<Membership>();
        b.HasPostgresEnum<MediaKind>();
        b.HasPostgresEnum<MediaStatus>();

        b.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
            entity.Property(user => user.DisplayName).HasMaxLength(80);
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.NormalizedEmail).HasMaxLength(320);
            entity.Property(user => user.PreferredLanguage).HasMaxLength(10);
            entity.HasQueryFilter(user => user.DeletedAt == null);
        });

        b.Entity<AnniversarySetting>(entity =>
        {
            entity.ToTable("anniversary_settings");
            entity.HasKey(setting => setting.Id);
            entity.Property(setting => setting.Name).HasMaxLength(80);
            entity.HasIndex(setting => setting.UserId)
                .IsUnique()
                .HasFilter("\"EffectiveTo\" IS NULL");
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(setting => setting.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Post>(entity =>
        {
            entity.ToTable("posts");
            entity.HasKey(post => post.Id);
            entity.Property(post => post.Caption).HasMaxLength(2000);
            entity.HasIndex(post => new { post.UserId, post.CreatedAt });
            entity.HasIndex(post => new { post.UserId, post.OccurredOn, post.CreatedAt });
            entity.HasIndex(post => new { post.UserId, post.OccurredOn, post.DailySequence })
                .IsUnique()
                .HasFilter("\"DeletedAt\" IS NULL");
            entity.HasOne(post => post.AnniversarySetting)
                .WithMany()
                .HasForeignKey(post => post.AnniversarySettingId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(post => post.DeletedAt == null);
        });

        b.Entity<MediaAsset>(entity =>
        {
            entity.ToTable("media_assets");
            entity.HasKey(media => media.Id);
            entity.HasIndex(media => media.StorageKey).IsUnique();
            entity.HasOne(media => media.Post)
                .WithMany(post => post.Media)
                .HasForeignKey(media => media.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(media => media.Post.DeletedAt == null);
        });

        b.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(token => token.Id);
            entity.HasIndex(token => token.TokenHash).IsUnique();
        });
    }
}
