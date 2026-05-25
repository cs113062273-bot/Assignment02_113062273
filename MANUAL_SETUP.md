# Cocos Manual Setup

This version is rebuilt for manual scene editing inside Cocos Creator 2.4.8.

## 1. Scene Tree To Create

Create these nodes under `Canvas`:

- `StartMenu`
- `LevelSelectMenu`
- `GameLayer`
- `HudLayer`
- `GameOverMenu`
- `ClearMenu`

Create these nodes under `GameLayer`:

- `Background`
- `WorldRoot`

Create these nodes under `WorldRoot`:

- `Ground`
- `Platforms`
- `Enemies`
- `Items`
- `Goal`
- `PlayerSpawn`
- `Player`

## 2. What To Drag

### `Canvas`

Add component:

- `Widget`

### `Background`

Add component:

- `Sprite`

Drag:

- `resources/ui/menu_bg` into the `SpriteFrame`

Stretch it to cover the screen.

### `WorldRoot`

Add component:

- `WorldScroller`

Drag:

- `Player` -> `target`

Set:

- `leftLimit = 0`
- `rightLimit = 4800`
- `viewWidth = 960`

### `Ground`

This is your static floor. Create one long child node.

Add components:

- `Sprite`
- `RigidBody`
- `PhysicsBoxCollider`

Set:

- `RigidBody Type = Static`

Use any platform / ground sprite you want.

### `Player`

Add components:

- `Sprite`
- `RigidBody`
- `PhysicsBoxCollider`
- `PlayerController`

Set:

- `RigidBody Type = Dynamic`
- `Gravity Scale = 1`
- `Fixed Rotation = true`

Drag into `PlayerController`:

- `Canvas` -> `gameNode`
- `PlayerSpawn` -> `spawnPoint`
- `resources/player/mario_small` -> `smallAtlas`
- `resources/player/mario_big` -> `bigAtlas`

### `Enemy` Goomba

Create a Goomba node under `Enemies`.

Add components:

- `Sprite`
- `RigidBody`
- `PhysicsBoxCollider`
- `GoombaController`

Set:

- `RigidBody Type = Dynamic`
- `Fixed Rotation = true`

Drag:

- `resources/enemies/Goomba` -> `atlas`

Duplicate this node for more enemies.

### `Mushroom Prefab`

Create a node under `Items`, then drag it into `assets/prefabs` to make a prefab.

Add components:

- `Sprite`
- `RigidBody`
- `PhysicsBoxCollider`
- `PowerMushroom`

Set:

- `RigidBody Type = Dynamic`
- `Fixed Rotation = true`

Drag:

- `Canvas` -> `gameNode`

### `Goal`

Create a flag / pole node under `Goal`.

Add components:

- `Sprite`
- `RigidBody`
- `PhysicsBoxCollider`
- `GoalPole`

Set:

- `RigidBody Type = Static`

## 3. UI You Need To Drag

### `StartMenu`

Create:

- Title label
- `Start` button

Button click event:

- Target: `Canvas`
- Component: `Game`
- Handler: `onClickStart`

### `LevelSelectMenu`

Create:

- Title label
- `Play Level 1` button
- `Back` button

Click events:

- `Play Level 1` -> `Canvas / Game / onClickPlayLevel1`
- `Back` -> `Canvas / Game / onClickBackToStart`

### `HudLayer`

Create 4 labels:

- `LifeLabel`
- `ScoreLabel`
- `TimerLabel`
- `StatusLabel`

Drag them into the `Game` script.

### `GameOverMenu`

Create:

- `Game Over` label
- `Retry` button
- `Menu` button

Click events:

- `Retry` -> `Canvas / Game / onClickRetry`
- `Menu` -> `Canvas / Game / onClickReturnMenu`

### `ClearMenu`

Create:

- `Stage Clear` label
- `FinalScoreLabel`
- `Retry` button
- `Menu` button

Click events:

- `Retry` -> `Canvas / Game / onClickRetry`
- `Menu` -> `Canvas / Game / onClickReturnMenu`

## 4. What To Hide At Start

Before running the game:

- `StartMenu` active = true
- `LevelSelectMenu` active = false
- `GameLayer` active = false
- `HudLayer` active = false
- `GameOverMenu` active = false
- `ClearMenu` active = false

## 5. First Things To Build Manually

Do these in order:

1. Build `StartMenu`
2. Build `LevelSelectMenu`
3. Build `GameLayer -> Background`
4. Build `Ground`
5. Build `PlayerSpawn`
6. Build `Player`
7. Build one `Goomba`
8. Build one `Goal`
9. Build `HudLayer`

## 6. Important Notes

- This version is intended for hand-built scene editing inside Cocos.
- The scene editor will only show the nodes you create manually.
- The scripts now control logic only. They do not auto-build the whole level anymore.
