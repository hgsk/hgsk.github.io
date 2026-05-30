---
title: 10. C#によるgRPC APIサーバーの構築
description: proto定義からC#サービス実装までの最小構成
pubDate: 2026-04-21
updatedDate: 2026-05-30
---

## プロジェクト作成

*gRPC テンプレートからプロジェクトを生成します。`.proto` ファイルから<punch-line>コードが自動生成される仕組み</punch-line>を確認します。*

```bash
dotnet new grpc -n GrpcServerSample
cd GrpcServerSample
```

## `Protos/echo.proto`

*サービスの契約を IDL で定義します。<punch-line>ここが型安全性の出発点</punch-line>です。*

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

*自動生成された基底クラスを継承し、<punch-line>RPC本体のロジック</punch-line>を実装します。*

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

*DI コンテナにサービスを登録し、<punch-line>ルーティングを有効</punch-line>にします。*

```csharp
builder.Services.AddGrpc();

var app = builder.Build();
app.MapGrpcService<EchoServiceImpl>();
app.Run();
```

## 動作確認

*grpcurl で RPC を直接呼び出し、<punch-line>レスポンスを確認</punch-line>します。*

```bash
grpcurl -plaintext -d '{"message":"hello"}' localhost:5000 echo.EchoService/Echo
```
