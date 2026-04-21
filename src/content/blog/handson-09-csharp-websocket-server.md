---
title: 09. C#によるWebSocketサーバーの構築
description: ASP.NET Coreで双方向エコーWebSocketを実装
pubDate: 2026-04-21
---

## Program.cs

```csharp
using System.Net.WebSockets;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

app.Map("/ws", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var ws = await context.WebSockets.AcceptWebSocketAsync();
    var buffer = new byte[4096];

    while (true)
    {
        var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
        if (result.MessageType == WebSocketMessageType.Close)
        {
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None);
            break;
        }

        var received = Encoding.UTF8.GetString(buffer, 0, result.Count);
        var send = Encoding.UTF8.GetBytes($"echo:{received}");
        await ws.SendAsync(send, WebSocketMessageType.Text, true, CancellationToken.None);
    }
});

app.Run("http://0.0.0.0:5001");
```

## 動作確認

```bash
dotnet run
npx wscat -c ws://localhost:5001/ws
```

送信した文字列に `echo:` が付いて返れば成功です。
