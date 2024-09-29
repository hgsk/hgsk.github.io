# Verse

Verse は、ゲーム「RimWorld」の基盤となるフレームワークであり、ゲームのロジック、データ構造、イベントシステムなどを提供します。以下に、Verse の全体像を説明します。

主なコンポーネント
データ定義 (Defs):

ゲーム内のアイテム、能力、建物、キャラクターなどのデータ定義を管理します。これには、ThingDef、PawnKindDef、AbilityDef などが含まれます。
エンティティ (Things):

ゲーム内の物理的なオブジェクトを表します。これには、Pawn（キャラクター）、Building（建物）、Item（アイテム）などが含まれます。
マップ (Map):

ゲームのプレイフィールドを管理します。地形、天候、時間の経過などを含みます。
イベントシステム (Events):

ゲーム内で発生するイベントやインシデントを管理します。これには、レイド、天候の変化、キャラクターの行動などが含まれます。
AI (AI):

キャラクターや敵の行動を制御する人工知能システムです。これには、パスファインディング、目標設定、行動決定などが含まれます。
ユーザーインターフェース (UI):

プレイヤーとゲームのインタラクションを管理します。これには、メニュー、インベントリ、ステータス表示などが含まれます。

```mermaid
classDiagram
    class Def {
        string defName
        string label
        string description
    }

    class ThingDef extends Def {
        List~CompProperties~ comps
    }

    class PawnKindDef extends Def {
        List~TraitDef~ traits
        List~SkillDef~ skills
    }

    class AbilityDef extends Def {
        Type abilityClass
        Type gizmoClass
        List~AbilityCompProperties~ comps
        AbilityCategoryDef category
        List~StatModifier~ statBases
        VerbProperties verbProperties
        KeyBindingDef hotKey
        JobDef jobDef
        ThingDef warmupMote
        SoundDef warmupStartSound
        SoundDef warmupSound
        SoundDef warmupPreEndSound
    }

    class Thing {
        ThingDef def
        int hitPoints
        Map map
    }

    class Pawn extends Thing {
        PawnKindDef kindDef
        List~Ability~ abilities
    }

    class Building extends Thing {
        BuildingDef def
    }

    class Item extends Thing {
        ItemDef def
    }

    class Map {
        List~Thing~ things
        TerrainGrid terrainGrid
        WeatherManager weatherManager
    }

    class Event {
        string eventType
        Map map
        List~Thing~ affectedThings
    }

    class Incident extends Event {
        string incidentType
    }

    class AI {
        Pawn pawn
        Job currentJob
        List~Job~ jobQueue
    }

    class UI {
        List~Window~ windows
        void Draw()
    }

    Def <|-- ThingDef
    Def <|-- PawnKindDef
    Def <|-- AbilityDef
    Thing <|-- Pawn
    Thing <|-- Building
    Thing <|-- Item
    Map --> Thing
    Event --> Map
    Event --> Thing
    Incident --> Event
    AI --> Pawn
    UI --> Window
```
