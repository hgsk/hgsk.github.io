---
title: 08. C#によるHTTPサーバーの構築
description: ASP.NET Core最小APIでhealthとechoを実装
pubDate: 2026-04-21
---

## プロジェクト作成

```bash
dotnet new web -n HttpServerSample
cd HttpServerSample
```

## Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/echo", (string? m) =>
{
    if (string.IsNullOrWhiteSpace(m))
    {
        return Results.BadRequest(new { error = "query parameter 'm' is required" });
    }

    return Results.Ok(new { message = m, at = DateTimeOffset.UtcNow });
});

app.Run("http://0.0.0.0:5000");
```

## 動作確認

```bash
dotnet run
curl http://localhost:5000/health
curl "http://localhost:5000/echo?m=hello"
```
