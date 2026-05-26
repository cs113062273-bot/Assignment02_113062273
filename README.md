# Mario Web 作業說明

https://mario-472fd.web.app
Login 後 Loading會從firebase載入用戶資料，請確保網路通暢
Leaderboard可能會延遲刷新，要等幾秒，資料讀取完以後才會顯示current score前三名。
https://github.com/cs113062273-bot/Assignment02_113062273

## 專案目標

本作業的目標是完成一款可遊玩的 Mario 類型橫向卷軸平台遊戲，內容包含：

- 基本物理與碰撞
- 玩家移動與跳躍控制
- 敵人互動
- 道具與增益效果
- 音效與背景音樂
- UI 顯示
- 完整遊戲流程

此外，專案中也包含 Firebase / Firestore 相關腳本與規則設定，供登入、進度儲存與排行榜功能使用。

## 開啟方式

1. 使用 `Cocos Creator 2.4.8` 開啟根目錄 `Assignment02_113062273/`。
2. 等待編輯器完成資源匯入與快取建立。
3. 開啟需要的場景：
   - `assets/scenes/menu.fire`：主選單
   - `assets/scenes/gameStart.fire`：開始或說明流程
   - `assets/scenes/stage1.fire`：第一關
   - `assets/scenes/stage2.fire`：第二關
   - `assets/scenes/gameOver.fire`：遊戲結束畫面
4. 在 Cocos Creator 中預覽，或建置為 Web 版本執行。

## 操作方式

- 向左移動：`A` 或 `方向鍵左`
- 向右移動：`D` 或 `方向鍵右`
- 跳躍：`W`、`方向鍵上`

## 專案結構

```text
Assignment02_113062273/
├─ assets/                 遊戲資源、場景與腳本
│  ├─ resources/           遊戲素材與資源
│  ├─ scenes/              場景檔
│  └─ scripts/             遊戲邏輯腳本
├─ settings/               Cocos Creator 專案設定
├─ local/                  本機編輯器設定
├─ library/                Cocos 匯入快取
├─ temp/                   暫存編譯檔
├─ packages/               專案套件
├─ AS2_source/             原始素材來源資料夾
├─ firestore.rules         Firestore 安全規則
├─ AI_reference.pdf        AI 使用說明文件
├─ project.json            Cocos Creator 專案資訊
└─ README.md
```

## 主要腳本說明

- `assets/scripts/SimplePlayerController.js`：玩家移動、跳躍、受傷與狀態控制
- `assets/scripts/SimpleStageController.js`：關卡流程、UI 與場景管理
- `assets/scripts/GoombaController.js`：Goomba 敵人行為
- `assets/scripts/TurtleController.js`：烏龜敵人行為
- `assets/scripts/PowerMushroom.js`：蘑菇道具效果
- `assets/scripts/GoalPole.js`：終點旗桿或過關觸發
- `assets/scripts/WorldScroller.js`：鏡頭或背景捲動控制
- `assets/scripts/BgmController.js`：背景音樂與音效管理
- `assets/scripts/FirebaseAuth.js`、`assets/scripts/FirebaseConfig.js`：Firebase 登入與設定相關功能

## Firebase 與 Firestore 規則

專案根目錄包含 `firestore.rules`，目前規則如下：

- `marioProgress/{userId}`：僅允許已登入且 `uid` 相符的使用者讀寫自己的進度
- `marioLeaderboard/{userId}`：已登入使用者可讀取排行榜資料，且只能寫入自己的排行榜紀錄

## Scoring and Bonus

- Complete Game Process (5%)
  - [x] Start menu
  - [x] Level select
  - [x] Game view (including game start / game over)
  - [x] You need to control the game process according to current game & player status

- Basic Rules (50%)
  - World Map (10%)
    - [x] The world must have correct physics properties.
    - [x] Example: objects fall due to gravity, and different objects should collide with each other correctly.
    - [x] Background & Camera should move according to the player's position.
    - [x] At least 1 world map.
      Implemented: 2 world maps (`stage1` and `stage2`).

  - Level Design (5%)
    - [x] The scene should have "Static" wall.
    - [x] The scene should include question blocks which can interact with the player.

  - Player (15%)
    - [x] Player should have correct physics properties.
    - [x] User can control the player to move and jump by keyboard.
    - [x] When player touches enemies or is attacked by enemies, it will get hurt or the number of its life will decrease.
    - [x] When player gets out of the bounds, the number of its life will decrease.
    - [x] When player dies, it can reborn at the initial position.

  - Enemies (15%)
    - [x] Enemies should have correct physics properties.
    - [x] At least 1 type of enemies.
      Implemented: 3 enemy types (Goomba, Turtle, and Flower).
    - [x] Only when player hits on their heads can kill them.

  - Question Blocks (5%)
    - [x] At least 1 type of blocks (super mushroom which makes Mario bigger).
      Implemented: 2 block rewards (coin and mushroom).
    - [x] Blocks can interact with player correctly.

  - Animations (10%)
    - [x] Player has walk & jump animations (5%)
    - [x] Enemies Animation (each for 2%, up to 5%)
      Implemented enemy animations and state changes:
      - Goomba changes appearance while moving.
      - Goomba falls after being stomped.
      - Turtle becomes a shell after being stomped.
      - Turtle shell moves rapidly after being kicked.
      - Flower moves up and down from the pipe.

  - Sound Effects (10%)
    - [x] At least one BGM (2%)
      Implemented: 3 BGMs.
    - [x] Player Jump & die sound effects (3%)
    - [x] Additional sound effects (each for 1%, up to 5%)
      Additional sound effects:
      - Goomba stomp
      - Question block hit with coin appear
      - Question block hit with mushroom appear
      - Mushroom power-up
      - Turtle stomp
      - Level clear
    - [x] All sound effects can't stop BGM

  - UI (10%)
    - [x] Player life (3%)
    - [x] Player score (5%)
    - [x] Timer (2%)

- Appearance (subjective) (10%)

- Bonus (At most 10%)
    Implemented bonus features: Firebase deployment and leaderboard.
  - [x] Firebase (5%)
    - [x] Deploy to Firebase page
    - [x] Membership mechanism
      - [x] Sign up, Login with firebase, save/restore game progress
  - [x] Leaderboard (5%)

- Git (5%)
    [x]Use Git to do version control
    https://github.com/cs113062273-bot/Assignment02_113062273
