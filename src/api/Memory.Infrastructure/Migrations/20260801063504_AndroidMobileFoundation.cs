using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Memory.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AndroidMobileFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AnniversarySetupCompleted",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastAnniversaryChangedAt",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreferredLanguage",
                table: "users",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "ja");

            migrationBuilder.AddColumn<Guid>(
                name: "AnniversarySettingId",
                table: "posts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CancelableUntil",
                table: "posts",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<int>(
                name: "DailySequence",
                table: "posts",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "SuppressionReason",
                table: "posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "UnlockOn",
                table: "posts",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            // 既存Web版の投稿を、同日の作成順で採番し、1年後の解禁ルールへ移行する。
            migrationBuilder.Sql("""
                UPDATE posts AS target
                SET "DailySequence" = ranked.sequence
                FROM (
                    SELECT "Id", ROW_NUMBER() OVER (
                        PARTITION BY "UserId", "OccurredOn"
                        ORDER BY "CreatedAt", "Id"
                    )::integer AS sequence
                    FROM posts
                    WHERE "DeletedAt" IS NULL
                ) AS ranked
                WHERE target."Id" = ranked."Id";

                UPDATE posts
                SET "CancelableUntil" = "CreatedAt" + INTERVAL '10 minutes',
                    "UnlockOn" = ("OccurredOn" + INTERVAL '1 year')::date;
                """);

            migrationBuilder.CreateTable(
                name: "anniversary_settings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Day = table.Column<int>(type: "integer", nullable: false),
                    EffectiveFrom = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EffectiveTo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_anniversary_settings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_anniversary_settings_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_posts_AnniversarySettingId",
                table: "posts",
                column: "AnniversarySettingId");

            migrationBuilder.CreateIndex(
                name: "IX_posts_UserId_OccurredOn_DailySequence",
                table: "posts",
                columns: new[] { "UserId", "OccurredOn", "DailySequence" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_anniversary_settings_UserId",
                table: "anniversary_settings",
                column: "UserId",
                unique: true,
                filter: "\"EffectiveTo\" IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_posts_anniversary_settings_AnniversarySettingId",
                table: "posts",
                column: "AnniversarySettingId",
                principalTable: "anniversary_settings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_posts_anniversary_settings_AnniversarySettingId",
                table: "posts");

            migrationBuilder.DropTable(
                name: "anniversary_settings");

            migrationBuilder.DropIndex(
                name: "IX_posts_AnniversarySettingId",
                table: "posts");

            migrationBuilder.DropIndex(
                name: "IX_posts_UserId_OccurredOn_DailySequence",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "AnniversarySetupCompleted",
                table: "users");

            migrationBuilder.DropColumn(
                name: "LastAnniversaryChangedAt",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreferredLanguage",
                table: "users");

            migrationBuilder.DropColumn(
                name: "AnniversarySettingId",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "CancelableUntil",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "DailySequence",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "SuppressionReason",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "UnlockOn",
                table: "posts");
        }
    }
}
