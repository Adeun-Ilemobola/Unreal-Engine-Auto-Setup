# Unreal C++ Class Creation Matrix (17 Templates)

| ID | Label | Prefix | Base Class | Header Include | Output Files | Blueprint Exposures |
|---|---|---|---|---|---|---|
| `struct` | Unreal Struct | `F` | None | None | Header only (`.h`) | native, type |
| `enum` | Unreal Enum | `E` | None | None | Header only (`.h`) | native, type |
| `character` | Character | `A` | `ACharacter` | `GameFramework/Character.h` | `.h` + `.cpp` | native, type, blueprintable |
| `pawn` | Pawn | `A` | `APawn` | `GameFramework/Pawn.h` | `.h` + `.cpp` | native, type, blueprintable |
| `playerController` | Player Controller | `A` | `APlayerController` | `GameFramework/PlayerController.h` | `.h` + `.cpp` | native, type, blueprintable |
| `gameModeBase` | Game Mode Base | `A` | `AGameModeBase` | `GameFramework/GameModeBase.h` | `.h` + `.cpp` | native, type, blueprintable |
| `functionLibrary` | Blueprint Function Library | `U` | `UBlueprintFunctionLibrary` | `Kismet/BlueprintFunctionLibrary.h` | `.h` + `.cpp` | native, type, blueprintable |
| `dataAsset` | Data Asset | `U` | `UDataAsset` | `Engine/DataAsset.h` | `.h` + `.cpp` | native, type, blueprintable |
| `object` | UObject | `U` | `UObject` | `UObject/Object.h` | `.h` + `.cpp` | native, type, blueprintable |
| `actor` | Actor | `A` | `AActor` | `GameFramework/Actor.h` | `.h` + `.cpp` | native, type, blueprintable |
| `actorComponent` | Actor Component | `U` | `UActorComponent` | `Components/ActorComponent.h` | `.h` + `.cpp` | native, type, blueprintable |
| `sceneComponent` | Scene Component | `U` | `USceneComponent` | `Components/SceneComponent.h` | `.h` + `.cpp` | native, type, blueprintable |
| `interface` | Unreal Interface | `U` / `I` | `UInterface` | `UObject/Interface.h` | `.h` + `.cpp` | native, type |
| `gameInstanceSubsystem` | Game Instance Subsystem | `U` | `UGameInstanceSubsystem` | `Subsystems/GameInstanceSubsystem.h` | `.h` + `.cpp` | native, type |
| `worldSubsystem` | World Subsystem | `U` | `UWorldSubsystem` | `Subsystems/WorldSubsystem.h` | `.h` + `.cpp` | native, type |
| `engineSubsystem` | Engine Subsystem | `U` | `UEngineSubsystem` | `Subsystems/EngineSubsystem.h` | `.h` + `.cpp` | native, type |
| `localPlayerSubsystem` | Local Player Subsystem | `U` | `ULocalPlayerSubsystem` | `Subsystems/LocalPlayerSubsystem.h` | `.h` + `.cpp` | native, type |

### Snippet Contributions
- `ustruct`: Reflected struct snippet with `USTRUCT(BlueprintType)` and `GENERATED_BODY()`.
- `uenum`: Reflected scoped enum snippet with `UENUM(BlueprintType)`.
- `uproperty`: Reflected property snippet with `UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "...")`.
- `ufunction`: Reflected function snippet with `UFUNCTION(BlueprintCallable, Category = "...")`.
