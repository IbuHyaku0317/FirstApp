using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Memory.Application;
using Memory.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Memory.Infrastructure;

/// <summary>JWT発行とリフレッシュトークンのローテーションを実装するInfrastructureアダプター。</summary>
public sealed class JwtTokenService(MemoryDbContext db, IConfiguration config) : ITokenService
{
    public async Task<AuthResult> IssueAsync(User user, string? device, CancellationToken ct)
    {
        // 生トークンはクライアントへ一度だけ返し、DBにはSHA-256ハッシュだけを残す。
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        db.RefreshTokens.Add(new RefreshToken(user.Id, Hash(raw), DateTimeOffset.UtcNow.AddDays(30), device));
        await db.SaveChangesAsync(ct);
        return CreateAccessToken(user, raw);
    }
    public async Task<AuthResult?> RotateAsync(string rawToken, CancellationToken ct)
    {
        var current = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == Hash(rawToken), ct);
        if (current is null || !current.IsActive(DateTimeOffset.UtcNow)) return null;
        var user = await db.Users.SingleAsync(x => x.Id == current.UserId, ct);
        var nextRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var next = new RefreshToken(user.Id, Hash(nextRaw), DateTimeOffset.UtcNow.AddDays(30), current.Device);
        current.Revoke(next.Id);
        db.RefreshTokens.Add(next);
        await db.SaveChangesAsync(ct);
        return CreateAccessToken(user, nextRaw);
    }
    public async Task RevokeAsync(string rawToken, CancellationToken ct)
    {
        var token = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == Hash(rawToken), ct);
        if (token is null)
        {
            return;
        }

        token.Revoke();
        await db.SaveChangesAsync(ct);
    }
    private AuthResult CreateAccessToken(User user, string refreshToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expires = now.AddMinutes(10);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:SigningKey"]!));
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], [new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim("membership", user.Membership.ToString().ToLowerInvariant())], now.UtcDateTime, expires.UtcDateTime, new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new(new JwtSecurityTokenHandler().WriteToken(token), expires, refreshToken);
    }
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
