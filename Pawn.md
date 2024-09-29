# Pawn

Pawn クラスは、ゲーム内のキャラクターを表すクラスです。以下に、Pawn クラスの概要とその関連クラスを説明します。

主なプロパティとメソッド
PawnKindDef kindDef: キャラクターの種類を定義するオブジェクト。
List<Ability> abilities: キャラクターが持つ能力のリスト。
Name name: キャラクターの名前。
Faction faction: キャラクターが所属する派閥。
Health health: キャラクターの健康状態。
Needs needs: キャラクターのニーズ（食事、休息など）。
Jobs jobs: キャラクターのジョブ（仕事）管理。
MindState mindState: キャラクターの精神状態。

```mermaid
classDiagram
    class Thing {
        ThingDef def
        int hitPoints
        Map map
    }

    class Pawn extends Thing {
        PawnKindDef kindDef
        List~Ability~ abilities
        Name name
        Faction faction
        Health health
        Needs needs
        Jobs jobs
        MindState mindState
    }

    class PawnKindDef extends Def {
        List~TraitDef~ traits
        List~SkillDef~ skills
    }

    class Ability {
        Pawn pawn
        AbilityDef def
        +Ability(Pawn, AbilityDef)
        +Activate()
    }

    class Name {
        string firstName
        string lastName
        string nickName
    }

    class Faction {
        string name
        List~Pawn~ members
    }

    class Health {
        float currentHealth
        float maxHealth
    }

    class Needs {
        float food
        float rest
    }

    class Jobs {
        List~Job~ jobQueue
        Job currentJob
    }

    class MindState {
        bool isHappy
        bool isStressed
    }

    class Job {
        string jobName
        int priority
    }

    class Def {
        string defName
        string label
        string description
    }

    class ThingDef extends Def {
        List~CompProperties~ comps
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

    Pawn --> PawnKindDef
    Pawn --> Ability
    Pawn --> Name
    Pawn --> Faction
    Pawn --> Health
    Pawn --> Needs
    Pawn --> Jobs
    Pawn --> MindState
    Jobs --> Job
    Ability --> AbilityDef
    Thing <|-- Pawn
    Def <|-- ThingDef
    Def <|-- PawnKindDef
    Def <|-- AbilityDef
```
