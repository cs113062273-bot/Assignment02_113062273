# Mario Web Assignment

This repository contains a Cocos Creator 2.4.8 project at `Mario/`.

## Open Project

1. Open `Mario/` with Cocos Creator 2.4.8.
2. Let Creator finish importing the copied resources under `Mario/assets/resources/`.
3. Open `assets/game.fire`.
4. Preview or build the project for Web.

## Controls

- Move left: `A` or `Left Arrow`
- Move right: `D` or `Right Arrow`
- Jump: `W`, `Up Arrow`, or `Space`

## Implemented Items

### Complete Game Process

- Start menu
- How-to-play screen
- Level select screen
- Main game view
- Player death / respawn flow
- Stage clear screen
- Game over screen

### Basic Rules

- One complete playable world map
- Gravity and collision-based platforming
- Camera/background movement following the player
- Static walls / platforms / stairs
- Interactive question blocks
- Keyboard movement and jump
- Life system
- Respawn at initial position after death
- Falling out of bounds costs a life
- One enemy type: Goomba
- Only stomping on enemy heads defeats them
- Super Mushroom power-up that makes Mario bigger

### Animations

- Mario idle / walk / jump frame switching when atlas resources are available
- Goomba walk / squashed animation when atlas resources are available
- Graphic fallback visuals are included if an atlas is unavailable

### Sound Effects

- BGM
- Jump SFX
- Death SFX
- Stomp SFX
- Question block / power-up / coin / stage clear SFX
- Effects use `playEffect`, so they do not stop the BGM

### UI

- Life
- Score
- Timer
- Status message line

## Files Added / Updated

- `Mario/assets/game.fire`
- `Mario/settings/project.json`
- `Mario/assets/resources/*`

## Notes

- The copied source assets come from `AS2_source/AS2_source`.
- The project uses a single scene and builds most gameplay objects dynamically in script.
- Firebase / membership / leaderboard bonus items are not implemented.
