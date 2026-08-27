---
title: 08. ASP.NET最小HTTP構成
description: ASP.NET Core最小APIでhealthとechoを実装
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## プロジェクト作成

*最小構成のプロジェクトを生成する。<punch-line>余分なファイルは一切含まれない。</punch-line>余分なものが含まれていないことこそが、ここでの主題である。多いことは強さではない。*

```bash
dotnet new web -n HttpServerSample
cd HttpServerSample
```

## Program.cs

*2つのエンドポイントを実装する。`/health` は<punch-line>死活確認用、</punch-line>`/echo` は入力の検証を兼ねた動作確認用である。*

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

*curl で各エンドポイントを叩き、<punch-line>期待したレスポンスが返ること</punch-line>を確認する。curl 一発で確認できる快適さを、なぜ皆が使わないのか、小生には理解に苦しむ。*

```bash
dotnet run
curl http://localhost:5000/health
curl "http://localhost:5000/echo?m=hello"
```

---

*文責: hyt*
