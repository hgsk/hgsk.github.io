# Rimworld Decompiled


## Ability

Ability（能力）はAttackなどのキャラクターの能力です。

主にAbilityとAbilityDefで構成されています。

AbilityクラスとAbilityDefクラスの関係は、AbilityDefがAbilityの定義を提供し、Abilityがその定義に基づいて動作するというものです。

Abilityは能力の発動主体であるPawnへの参照を持っています。

```mermaid
classDiagram
    class AbilityDef {
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

    class Ability {
        Pawn pawn
        AbilityDef def
        +Ability(Pawn, AbilityDef)
        +Activate()
    }

    class AbilityCompProperties
    class AbilityCategoryDef {
        string defName
        string label
        string description
    }
    class StatModifier {
        StatDef stat
        float value
    }
    class StatDef {
        string defName
    }
    class VerbProperties {
        float range
    }
    class KeyBindingDef {
        string defName
    }
    class JobDef {
        string defName
    }
    class ThingDef {
        string defName
    }
    class SoundDef {
        string defName
    }
    class Pawn {
        string Name
    }
    class Command_Ability

    AbilityDef --> AbilityCompProperties
    AbilityDef --> AbilityCategoryDef
    AbilityDef --> StatModifier
    AbilityDef --> VerbProperties
    AbilityDef --> KeyBindingDef
    AbilityDef --> JobDef
    AbilityDef --> ThingDef
    AbilityDef --> SoundDef
    Ability --> AbilityDef
    StatModifier --> StatDef
    Ability --> Pawn
    AbilityDef --> Command_Ability
```

```
public class Ability
{
    public Pawn pawn;
    public AbilityDef def;

    public Ability(Pawn pawn, AbilityDef def)
    {
        this.pawn = pawn;
        this.def = def;
        Initialize();
    }

    private void Initialize()
    {
        // defのプロパティを使用して初期化
        VerbProperties verbProps = def.verbProperties;
        List<StatModifier> statModifiers = def.statBases;
        // その他の初期化処理
    }

    public void Activate()
    {
        // defのプロパティに基づいて能力を発動
        if (def.warmupStartSound != null)
        {
            // サウンドを再生
        }
        // その他の発動処理
    }
}
```
