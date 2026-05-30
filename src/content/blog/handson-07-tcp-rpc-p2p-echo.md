---
title: 07. TCP上のRPCによるP2Pエコー
description: C#で最小RPCプロトコルを作りP2Pでエコー応答する
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## 目標

*フレームワークに頼らず、TCP上に最小限のRPCを自力で実装します。プロトコルが何をしているかを理解するための単元です。*

JSON 1行を1メッセージとして扱う簡易RPCを作り、Peer間でエコーします。

## サーバー側（Peer A）

*接続を待ち受け、受信したJSONをデシリアライズしてエコーを返します。*

```csharp
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

var listener = new TcpListener(IPAddress.Any, 7000);
listener.Start();
Console.WriteLine("Peer A listening on :7000");

while (true)
{
    using var client = await listener.AcceptTcpClientAsync();
    using var stream = client.GetStream();
    using var reader = new StreamReader(stream, Encoding.UTF8);
    using var writer = new StreamWriter(stream, Encoding.UTF8) { AutoFlush = true };

    var line = await reader.ReadLineAsync();
    if (line is null) continue;

    var req = JsonSerializer.Deserialize<EchoRequest>(line);
    var res = JsonSerializer.Serialize(new { result = req?.message ?? string.Empty });
    await writer.WriteLineAsync(res);
}

record EchoRequest(string method, string message);
```

## クライアント側（Peer B）

*サーバーに接続し、JSONメッセージを1行送信してレスポンスを受け取ります。*

```csharp
using System.Net.Sockets;
using System.Text;

using var client = new TcpClient();
await client.ConnectAsync("127.0.0.1", 7000);
using var stream = client.GetStream();
using var reader = new StreamReader(stream, Encoding.UTF8);
using var writer = new StreamWriter(stream, Encoding.UTF8) { AutoFlush = true };

await writer.WriteLineAsync("{\"method\":\"echo\",\"message\":\"hello\"}");
var line = await reader.ReadLineAsync();
Console.WriteLine(line);
```

## 実装ポイント

*このコードをそのまま本番に持ち込む前に、最低限ここだけは対処しておいてください。*

- 区切りは改行（フレーミング簡易化）
- `ReadLineAsync` のタイムアウトを設定
- 例外時に `TcpClient` を確実に破棄
