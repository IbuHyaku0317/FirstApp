using Memory.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Memory.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Infrastructureの実装をApplicationで定義されたポートへ結び付ける。</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MediaOptions>(configuration.GetSection("Media"));
        services.AddDbContext<MemoryDbContext>(options => options.UseNpgsql(configuration.GetConnectionString("Database")));
        services.AddScoped<MemoryRepository>();
        services.AddScoped<IUserRepository>(provider => provider.GetRequiredService<MemoryRepository>());
        services.AddScoped<IPostRepository>(provider => provider.GetRequiredService<MemoryRepository>());
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<MemoryRepository>());
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IMediaStorage, LocalMediaStorage>();
        return services;
    }
}
