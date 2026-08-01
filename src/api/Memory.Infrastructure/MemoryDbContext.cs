using Memory.Domain;
using Microsoft.EntityFrameworkCore;

namespace Memory.Infrastructure;

public sealed class MemoryDbContext(DbContextOptions<MemoryDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresEnum<Membership>(); b.HasPostgresEnum<MediaKind>(); b.HasPostgresEnum<MediaStatus>();
        b.Entity<User>(e => { e.ToTable("users"); e.HasKey(x => x.Id); e.HasIndex(x => x.NormalizedEmail).IsUnique(); e.Property(x => x.DisplayName).HasMaxLength(80); e.Property(x => x.Email).HasMaxLength(320); e.Property(x => x.NormalizedEmail).HasMaxLength(320); e.HasQueryFilter(x => x.DeletedAt == null); });
        b.Entity<Post>(e => { e.ToTable("posts"); e.HasKey(x => x.Id); e.Property(x => x.Caption).HasMaxLength(2000); e.HasIndex(x => new { x.UserId, x.CreatedAt }); e.HasIndex(x => new { x.UserId, x.OccurredOn, x.CreatedAt }); e.HasQueryFilter(x => x.DeletedAt == null); });
        b.Entity<MediaAsset>(e => { e.ToTable("media_assets"); e.HasKey(x => x.Id); e.HasIndex(x => x.StorageKey).IsUnique(); e.HasOne(x => x.Post).WithMany(x => x.Media).HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.Cascade); e.HasQueryFilter(x => x.Post.DeletedAt == null); });
        b.Entity<RefreshToken>(e => { e.ToTable("refresh_tokens"); e.HasKey(x => x.Id); e.HasIndex(x => x.TokenHash).IsUnique(); });
    }
}
