---
title: 10. C#によるgRPC APIサーバーの構築
description: proto定義からC#サービス実装までの最小構成
pubDate: 2026-04-21
---

## プロジェクト作成

```bash
dotnet new grpc -n GrpcServerSample
cd GrpcServerSample
```

## `Protos/echo.proto`

```proto
syntax = "proto3";
option csharp_namespace = "GrpcServerSample";

package echo;

service EchoService {
  rpc Echo (EchoRequest) returns (EchoReply);
}

message EchoRequest {
  string message = 1;
}

message EchoReply {
  string message = 1;
}
```

## サービス実装

```csharp
using Grpc.Core;

public class EchoServiceImpl : EchoService.EchoServiceBase
{
    public override Task<EchoReply> Echo(EchoRequest request, ServerCallContext context)
    {
        return Task.FromResult(new EchoReply { Message = request.Message });
    }
}
```

## `Program.cs` への登録

```csharp
builder.Services.AddGrpc();

var app = builder.Build();
app.MapGrpcService<EchoServiceImpl>();
app.Run();
```

## 動作確認

```bash
grpcurl -plaintext -d '{"message":"hello"}' localhost:5000 echo.EchoService/Echo
```
