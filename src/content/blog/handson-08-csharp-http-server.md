---
title: 08. C#によるHTTPサーバーの構築
description: ASP.NET Core最小APIでhealthとechoを実装
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## プロジェクト作成

*最小構成の ASP.NET Core プロジェクトを生成します。<punch-line>余分なファイルは一切含まれません。</punch-line>*

```bash
dotnet new web -n HttpServerSample
cd HttpServerSample
```

## Program.cs

*2つのエンドポイントを実装します。`/health` は<punch-line>死活確認用、</punch-line>`/echo` は入力の検証を兼ねた動作確認用です。*

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

*curl で各エンドポイントをたたき、<punch-line>期待したレスポンスが返ること</punch-line>を確認します。*

```bash
dotnet run
curl http://localhost:5000/health
curl "http://localhost:5000/echo?m=hello"
```

---

*文責: hyt*
