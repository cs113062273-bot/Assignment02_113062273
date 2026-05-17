cc.Class({
    extends: cc.Component,

    properties: {},

    onLoad() {
        this.viewWidth = 960;
        this.viewHeight = 640;
        this.groundHeight = 64;
        this.gravity = -2200;
        this.moveSpeed = 310;
        this.jumpSpeed = 760;
        this.maxFallSpeed = -1200;
        this.worldWidth = 4800;
        this.worldHeight = 860;
        this.stageTime = 120;
        this.state = 'boot';
        this.levelIndex = 0;
        this.score = 0;
        this.lives = 3;
        this.timer = this.stageTime;
        this.cameraX = 0;
        this.keys = {
            left: false,
            right: false,
            jump: false,
            jumpQueued: false
        };
        this.assets = {
            atlases: {},
            frames: {},
            audio: {}
        };
        this.solids = [];
        this.questionBlocks = [];
        this.enemies = [];
        this.items = [];
        this.goal = null;
        this.menuButtons = [];
        this.player = null;
        this.hudNodes = {};
        this._updateAccumulator = 0;
        this._cameraShake = 0;
        this._bgmStarted = false;
        this._playerStateTimer = 0;

        this._boundKeyDown = this.onKeyDown.bind(this);
        this._boundKeyUp = this.onKeyUp.bind(this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._boundKeyDown);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._boundKeyUp);

        this.loadAssets(() => {
            this.buildLayers();
            this.showStartMenu();
        });
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._boundKeyDown);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._boundKeyUp);
    },

    loadAssets(done) {
        const tasks = [
            this.loadRes('player/mario_small', cc.SpriteAtlas, (asset) => { this.assets.atlases.marioSmall = asset; }),
            this.loadRes('player/mario_big', cc.SpriteAtlas, (asset) => { this.assets.atlases.marioBig = asset; }),
            this.loadRes('enemies/Goomba', cc.SpriteAtlas, (asset) => { this.assets.atlases.goomba = asset; }),
            this.loadRes('ui/menu_bg', cc.SpriteFrame, (asset) => { this.assets.frames.menuBg = asset; }),
            this.loadRes('ui/flag', cc.SpriteFrame, (asset) => { this.assets.frames.flag = asset; }),
            this.loadRes('ui/world', cc.SpriteFrame, (asset) => { this.assets.frames.world = asset; }),
            this.loadRes('audio/bgm_1', cc.AudioClip, (asset) => { this.assets.audio.bgm = asset; }),
            this.loadRes('audio/jump', cc.AudioClip, (asset) => { this.assets.audio.jump = asset; }),
            this.loadRes('audio/loseOneLife', cc.AudioClip, (asset) => { this.assets.audio.die = asset; }),
            this.loadRes('audio/stomp', cc.AudioClip, (asset) => { this.assets.audio.stomp = asset; }),
            this.loadRes('audio/powerUpAppear', cc.AudioClip, (asset) => { this.assets.audio.block = asset; }),
            this.loadRes('audio/PowerUp', cc.AudioClip, (asset) => { this.assets.audio.power = asset; }),
            this.loadRes('audio/coin', cc.AudioClip, (asset) => { this.assets.audio.coin = asset; }),
            this.loadRes('audio/levelClear', cc.AudioClip, (asset) => { this.assets.audio.clear = asset; })
        ];

        Promise.all(tasks).then(() => done());
    },

    loadRes(path, type, setter) {
        return new Promise((resolve) => {
            cc.loader.loadRes(path, type, (err, asset) => {
                if (!err && asset) {
                    setter(asset);
                }
                resolve();
            });
        });
    },

    buildLayers() {
        this.backgroundLayer = this.ensureLayer('BackgroundLayer');
        this.worldRoot = this.ensureLayer('WorldRoot');
        this.uiLayer = this.ensureLayer('UILayer');
        this.overlayLayer = this.ensureLayer('OverlayLayer');

        this.worldRoot.setAnchorPoint(0, 0);
        this.worldRoot.setPosition(-this.viewWidth / 2, -this.viewHeight / 2);

        this.buildStaticHud();
        this.buildBackground();
    },

    ensureLayer(name) {
        let node = this.node.getChildByName(name);
        if (!node) {
            node = new cc.Node(name);
            node.parent = this.node;
        } else {
            node.removeAllChildren();
            const graphics = node.getComponent(cc.Graphics);
            if (graphics) {
                graphics.clear();
            }
        }
        return node;
    },

    buildBackground() {
        this.backgroundLayer.removeAllChildren();

        let base = this.backgroundLayer.getComponent(cc.Graphics);
        if (!base) {
            base = this.backgroundLayer.addComponent(cc.Graphics);
        }
        base.clear();
        base.fillColor = new cc.Color(92, 148, 252, 255);
        base.rect(-this.viewWidth / 2, -this.viewHeight / 2, this.viewWidth, this.viewHeight);
        base.fill();

        if (this.assets.frames.menuBg) {
            for (let i = 0; i < 4; i++) {
                const bg = new cc.Node(`Bg${i}`);
                bg.parent = this.backgroundLayer;
                bg.setPosition(-this.viewWidth / 2 + i * 240, 0);
                const sprite = bg.addComponent(cc.Sprite);
                sprite.spriteFrame = this.assets.frames.menuBg;
                bg.scaleX = 2.1;
                bg.scaleY = 2.1;
                bg.opacity = i % 2 === 0 ? 210 : 170;
            }
        }
    },

    buildStaticHud() {
        this.uiLayer.removeAllChildren();

        const panel = new cc.Node('HudPanel');
        panel.parent = this.uiLayer;
        panel.y = this.viewHeight / 2 - 38;
        const panelGraphics = panel.addComponent(cc.Graphics);
        panelGraphics.fillColor = new cc.Color(0, 0, 0, 120);
        panelGraphics.roundRect(-450, -20, 900, 42, 10);
        panelGraphics.fill();

        this.hudNodes.life = this.createText('LIFE 3', 24, new cc.Color(255, 255, 255), this.uiLayer, cc.v2(-360, this.viewHeight / 2 - 38));
        this.hudNodes.score = this.createText('SCORE 000000', 24, new cc.Color(255, 255, 255), this.uiLayer, cc.v2(-80, this.viewHeight / 2 - 38));
        this.hudNodes.timer = this.createText('TIME 120', 24, new cc.Color(255, 255, 255), this.uiLayer, cc.v2(280, this.viewHeight / 2 - 38));
        this.hudNodes.status = this.createText('', 22, new cc.Color(255, 242, 171), this.uiLayer, cc.v2(0, this.viewHeight / 2 - 74));
        this.setHudVisible(false);
    },

    setHudVisible(visible) {
        Object.keys(this.hudNodes).forEach((key) => {
            this.hudNodes[key].active = visible || key === 'status';
        });
        if (!visible) {
            this.hudNodes.status.active = false;
        }
    },

    createText(text, size, color, parent, position, bold) {
        const node = new cc.Node('Text');
        node.parent = parent;
        node.setPosition(position);
        const label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.NONE;
        node.color = color;
        if (bold) {
            node.scale = 1.05;
        }
        return node;
    },

    createButton(text, position, callback, width, height, fillColor) {
        const node = new cc.Node(`Button_${text}`);
        node.parent = this.overlayLayer;
        node.setPosition(position);
        const g = node.addComponent(cc.Graphics);
        const color = fillColor || new cc.Color(255, 169, 59, 255);
        g.fillColor = color;
        g.strokeColor = new cc.Color(106, 53, 18, 255);
        g.lineWidth = 4;
        g.roundRect(-width / 2, -height / 2, width, height, 14);
        g.fill();
        g.stroke();

        const labelNode = this.createText(text, 28, new cc.Color(73, 33, 10), node, cc.v2(0, 0), true);
        labelNode.getComponent(cc.Label).fontSize = 26;
        node.width = width;
        node.height = height;
        node.on(cc.Node.EventType.TOUCH_END, callback, this);
        node.on(cc.Node.EventType.MOUSE_ENTER, () => {
            node.scale = 1.05;
        });
        node.on(cc.Node.EventType.MOUSE_LEAVE, () => {
            node.scale = 1;
        });
        this.menuButtons.push(node);
        return node;
    },

    clearOverlay() {
        this.overlayLayer.removeAllChildren();
        this.menuButtons = [];
    },

    showStartMenu() {
        this.cleanupStage();
        this.state = 'menu';
        this.setHudVisible(false);
        this.clearOverlay();
        this.stopMusic();

        this.createTitle('MARIO WEB', 60, 180);
        this.createSubtitle('Cocos Creator 2.4 Assignment Stage', 24, 120);
        this.createButton('Start Game', cc.v2(0, 20), this.showLevelSelect, 260, 68);
        this.createButton('How To Play', cc.v2(0, -70), this.showHowToPlay, 260, 68, new cc.Color(109, 192, 255, 255));
    },

    showHowToPlay() {
        this.clearOverlay();
        this.createTitle('How To Play', 46, 180);
        const lines = [
            'Move: A / D or Left / Right',
            'Jump: W / Up / Space',
            'Hit question blocks from below',
            'Jump on Goomba heads to defeat them',
            'Reach the flag before the timer ends'
        ];

        lines.forEach((line, index) => {
            this.createText(line, 24, new cc.Color(255, 255, 255), this.overlayLayer, cc.v2(0, 80 - index * 42));
        });

        this.createButton('Back', cc.v2(0, -150), this.showStartMenu, 220, 64, new cc.Color(255, 169, 59, 255));
    },

    showLevelSelect() {
        this.state = 'level-select';
        this.clearOverlay();
        this.createTitle('Select Level', 50, 200);
        this.createSubtitle('Assignment requires at least one playable stage', 22, 150);

        const card = new cc.Node('StageCard');
        card.parent = this.overlayLayer;
        card.setPosition(0, 20);
        const g = card.addComponent(cc.Graphics);
        g.fillColor = new cc.Color(255, 255, 255, 220);
        g.strokeColor = new cc.Color(75, 46, 16, 255);
        g.lineWidth = 4;
        g.roundRect(-170, -110, 340, 220, 20);
        g.fill();
        g.stroke();

        if (this.assets.frames.world) {
            const thumb = new cc.Node('WorldThumb');
            thumb.parent = card;
            thumb.setPosition(0, 18);
            const sprite = thumb.addComponent(cc.Sprite);
            sprite.spriteFrame = this.assets.frames.world;
            thumb.scale = 0.55;
        }

        this.createText('World 1-1', 34, new cc.Color(78, 44, 18), card, cc.v2(0, -68), true);
        this.createText('Goomba, question blocks, timer, score, lives', 18, new cc.Color(98, 73, 44), card, cc.v2(0, -92));

        this.createButton('Play 1-1', cc.v2(0, -170), () => {
            this.startGame(0);
        }, 230, 64);
        this.createButton('Back', cc.v2(0, -250), this.showStartMenu, 180, 56, new cc.Color(109, 192, 255, 255));
    },

    createTitle(text, size, y) {
        const title = this.createText(text, size, new cc.Color(255, 255, 255), this.overlayLayer, cc.v2(0, y), true);
        title.scale = 1.08;
    },

    createSubtitle(text, size, y) {
        this.createText(text, size, new cc.Color(246, 245, 219), this.overlayLayer, cc.v2(0, y));
    },

    startGame(levelIndex) {
        this.levelIndex = levelIndex;
        this.clearOverlay();
        this.cleanupStage();
        this.buildStage();
        this.spawnPlayer();
        this.state = 'playing';
        this.timer = this.stageTime;
        this.score = 0;
        this.lives = 3;
        this.setHudVisible(true);
        this.playMusic();
        this.showStatus('Stage 1-1');
        this.refreshHud();
    },

    buildStage() {
        this.worldRoot.removeAllChildren();
        this.solids = [];
        this.questionBlocks = [];
        this.enemies = [];
        this.items = [];
        this.goal = null;
        this.cameraX = 0;

        const bgGround = new cc.Node('BackdropGround');
        bgGround.parent = this.worldRoot;
        bgGround.setPosition(0, 0);
        const bgGraphics = bgGround.addComponent(cc.Graphics);
        bgGraphics.fillColor = new cc.Color(124, 196, 96, 255);
        bgGraphics.rect(0, 0, this.worldWidth, this.groundHeight);
        bgGraphics.fill();

        this.createHill(160, 100, 120, 90, new cc.Color(143, 217, 129));
        this.createHill(560, 90, 160, 110, new cc.Color(126, 207, 114));
        this.createHill(1100, 94, 180, 120, new cc.Color(147, 220, 135));
        this.createHill(1720, 90, 160, 110, new cc.Color(126, 207, 114));
        this.createHill(2350, 96, 190, 126, new cc.Color(150, 224, 143));
        this.createHill(3100, 94, 170, 118, new cc.Color(130, 210, 120));
        this.createHill(3800, 98, 210, 130, new cc.Color(150, 224, 143));

        this.createCloud(260, 520, 1.1);
        this.createCloud(900, 580, 1.4);
        this.createCloud(1600, 540, 1.2);
        this.createCloud(2550, 575, 1.3);
        this.createCloud(3350, 545, 1.15);
        this.createCloud(4300, 590, 1.35);

        this.createSolid(0, 0, 1480, this.groundHeight, 'ground');
        this.createSolid(1710, 0, 1160, this.groundHeight, 'ground');
        this.createSolid(2960, 0, 1840, this.groundHeight, 'ground');

        this.createSolid(260, 180, 140, 26, 'brick');
        this.createSolid(520, 250, 100, 26, 'brick');
        this.createSolid(980, 190, 160, 26, 'brick');
        this.createSolid(1960, 190, 180, 26, 'brick');
        this.createSolid(2380, 290, 120, 26, 'brick');
        this.createSolid(3320, 180, 140, 26, 'brick');

        this.createQuestionBlock(430, 220, 'mushroom');
        this.createQuestionBlock(462, 220, 'coin');
        this.createQuestionBlock(494, 220, 'coin');
        this.createQuestionBlock(1210, 240, 'coin');
        this.createQuestionBlock(2140, 232, 'coin');

        this.createStairs(3560, 0, 5);
        this.createStairs(3950, 0, 4, true);

        this.spawnEnemy(740, 80);
        this.spawnEnemy(1360, 80);
        this.spawnEnemy(2200, 80);
        this.spawnEnemy(3200, 80);

        this.createGoal(4470, this.groundHeight);
    },

    createHill(x, y, width, height, color) {
        const node = new cc.Node('Hill');
        node.parent = this.worldRoot;
        node.setPosition(x, y);
        const g = node.addComponent(cc.Graphics);
        g.fillColor = color;
        g.moveTo(-width / 2, 0);
        g.quadraticCurveTo(0, height, width / 2, 0);
        g.lineTo(-width / 2, 0);
        g.fill();
    },

    createCloud(x, y, scale) {
        const node = new cc.Node('Cloud');
        node.parent = this.worldRoot;
        node.setPosition(x, y);
        node.scale = scale || 1;
        const g = node.addComponent(cc.Graphics);
        g.fillColor = new cc.Color(255, 255, 255, 220);
        this.drawCircle(g, -30, 0, 24);
        this.drawCircle(g, 0, 10, 32);
        this.drawCircle(g, 34, 0, 24);
        g.fill();
    },

    drawCircle(graphics, x, y, radius) {
        graphics.circle(x, y, radius);
    },

    createSolid(x, y, width, height, kind) {
        const solid = {
            x,
            y,
            width,
            height,
            kind,
            active: true
        };

        solid.node = new cc.Node(`Solid_${kind}`);
        solid.node.parent = this.worldRoot;
        solid.node.setAnchorPoint(0, 0);
        solid.node.setPosition(x, y);
        solid.node.width = width;
        solid.node.height = height;
        this.drawSolid(solid);
        this.solids.push(solid);
        return solid;
    },

    drawSolid(solid) {
        solid.node.removeAllChildren();
        let g = solid.node.getComponent(cc.Graphics);
        if (!g) {
            g = solid.node.addComponent(cc.Graphics);
        }
        g.clear();

        if (solid.kind === 'ground') {
            g.fillColor = new cc.Color(176, 110, 62, 255);
            g.rect(0, 0, solid.width, solid.height);
            g.fill();
            g.fillColor = new cc.Color(230, 200, 125, 255);
            g.rect(0, solid.height - 10, solid.width, 10);
            g.fill();
        } else if (solid.kind === 'brick') {
            g.fillColor = new cc.Color(170, 103, 56, 255);
            g.rect(0, 0, solid.width, solid.height);
            g.fill();
            g.strokeColor = new cc.Color(119, 63, 26, 255);
            g.lineWidth = 2;
            const brickWidth = 28;
            for (let i = 0; i <= solid.width; i += brickWidth) {
                g.moveTo(i, 0);
                g.lineTo(i, solid.height);
            }
            g.moveTo(0, solid.height / 2);
            g.lineTo(solid.width, solid.height / 2);
            g.stroke();
        } else if (solid.kind === 'stair') {
            g.fillColor = new cc.Color(147, 96, 51, 255);
            g.rect(0, 0, solid.width, solid.height);
            g.fill();
            g.strokeColor = new cc.Color(106, 64, 30, 255);
            g.lineWidth = 3;
            g.rect(1, 1, solid.width - 2, solid.height - 2);
            g.stroke();
        } else if (solid.kind === 'question' || solid.kind === 'used') {
            const isUsed = solid.kind === 'used' || !solid.active;
            g.fillColor = isUsed ? new cc.Color(148, 120, 78, 255) : new cc.Color(245, 193, 60, 255);
            g.rect(0, 0, solid.width, solid.height);
            g.fill();
            g.strokeColor = isUsed ? new cc.Color(102, 80, 44, 255) : new cc.Color(177, 98, 15, 255);
            g.lineWidth = 3;
            g.rect(1, 1, solid.width - 2, solid.height - 2);
            g.stroke();
            if (!isUsed) {
                const label = this.createText('?', 22, new cc.Color(120, 60, 10), solid.node, cc.v2(solid.width / 2, solid.height / 2));
                label.y -= 1;
            }
        }
    },

    createQuestionBlock(x, y, rewardType) {
        const block = this.createSolid(x, y, 28, 28, 'question');
        block.rewardType = rewardType;
        this.questionBlocks.push(block);
        return block;
    },

    createStairs(startX, startY, steps, descending) {
        for (let i = 0; i < steps; i++) {
            const height = (i + 1) * 32;
            const x = startX + i * 32;
            const stepIndex = descending ? (steps - 1 - i) : i;
            this.createSolid(x, startY, 32, (stepIndex + 1) * 32, 'stair');
        }
    },

    createGoal(x, y) {
        const pole = new cc.Node('GoalPole');
        pole.parent = this.worldRoot;
        pole.setPosition(x, y);
        const g = pole.addComponent(cc.Graphics);
        g.fillColor = new cc.Color(237, 241, 234, 255);
        g.rect(0, 0, 8, 280);
        g.fill();
        g.fillColor = new cc.Color(50, 170, 74, 255);
        g.circle(4, 286, 10);
        g.fill();

        const marker = new cc.Node('GoalFlag');
        marker.parent = this.worldRoot;
        marker.setPosition(x + 20, y + 220);
        if (this.assets.frames.flag) {
            const sprite = marker.addComponent(cc.Sprite);
            sprite.spriteFrame = this.assets.frames.flag;
            marker.scale = 0.9;
        } else {
            const fg = marker.addComponent(cc.Graphics);
            fg.fillColor = new cc.Color(42, 190, 84, 255);
            fg.moveTo(0, 0);
            fg.lineTo(42, -16);
            fg.lineTo(0, -32);
            fg.close();
            fg.fill();
        }

        this.goal = {
            x: x - 18,
            y,
            width: 52,
            height: 280,
            marker
        };
    },

    spawnPlayer() {
        const node = new cc.Node('Player');
        node.parent = this.worldRoot;
        node.setAnchorPoint(0, 0);
        node.setPosition(90, this.groundHeight);

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        node.width = 52;
        node.height = 58;

        const graphics = node.addComponent(cc.Graphics);
        graphics.enabled = false;

        this.player = {
            node,
            sprite,
            graphics,
            x: 90,
            y: this.groundHeight,
            width: 38,
            height: 54,
            vx: 0,
            vy: 0,
            onGround: false,
            facing: 1,
            big: false,
            hurtTimer: 0,
            invincibleTimer: 0,
            animTime: 0,
            dead: false,
            jumpLocked: false
        };

        this.applyPlayerVisual();
        this.syncActorNode(this.player);
        this.centerCamera(true);
    },

    spawnEnemy(x, y) {
        const node = new cc.Node('Goomba');
        node.parent = this.worldRoot;
        node.setAnchorPoint(0, 0);
        node.setPosition(x, y);

        const sprite = node.addComponent(cc.Sprite);
        const graphics = node.addComponent(cc.Graphics);
        graphics.enabled = false;

        const enemy = {
            node,
            sprite,
            graphics,
            x,
            y,
            width: 38,
            height: 34,
            vx: -90,
            vy: 0,
            onGround: false,
            alive: true,
            squashed: false,
            removeTimer: 0,
            animTime: 0
        };

        this.applyEnemyVisual(enemy);
        this.syncActorNode(enemy);
        this.enemies.push(enemy);
        return enemy;
    },

    spawnMushroom(x, y) {
        const node = new cc.Node('Mushroom');
        node.parent = this.worldRoot;
        node.setAnchorPoint(0, 0);
        node.setPosition(x, y);
        const g = node.addComponent(cc.Graphics);

        const item = {
            node,
            graphics: g,
            x,
            y,
            width: 28,
            height: 28,
            vx: 110,
            vy: 0,
            onGround: false,
            riseLeft: 22,
            active: true
        };

        this.drawMushroom(item);
        this.items.push(item);
        return item;
    },

    drawMushroom(item) {
        const g = item.graphics;
        g.clear();
        g.fillColor = new cc.Color(255, 78, 61, 255);
        g.roundRect(0, 10, item.width, 18, 9);
        g.fill();
        g.fillColor = new cc.Color(255, 233, 202, 255);
        g.rect(7, 0, 14, 14);
        g.fill();
        g.fillColor = new cc.Color(255, 255, 255, 255);
        this.drawCircle(g, 8, 21, 3);
        this.drawCircle(g, 20, 19, 3);
        g.fill();
    },

    update(dt) {
        if (!this.player || this.state === 'boot' || this.state === 'menu' || this.state === 'level-select') {
            return;
        }

        if (this.state === 'playing') {
            this.timer = Math.max(0, this.timer - dt);
            if (this.timer <= 0) {
                this.killPlayer();
            }

            this.updatePlayer(dt);
            this.updateEnemies(dt);
            this.updateItems(dt);
            this.updateGoal();
            this.centerCamera(false);
            this.refreshHud();
        } else if (this.state === 'player-died') {
            this._playerStateTimer -= dt;
            this.player.node.rotation += 420 * dt;
            this.player.vy += this.gravity * dt * 0.35;
            this.player.y += this.player.vy * dt;
            this.syncActorNode(this.player);
            if (this._playerStateTimer <= 0) {
                if (this.lives > 0) {
                    this.respawnPlayer();
                } else {
                    this.showGameOver();
                }
            }
        } else if (this.state === 'stage-clear') {
            this._playerStateTimer -= dt;
            if (this._playerStateTimer <= 0) {
                this.showStageClearScreen();
            }
        }
    },

    updatePlayer(dt) {
        if (this.player.dead) {
            return;
        }

        const player = this.player;
        player.animTime += dt;

        if (player.invincibleTimer > 0) {
            player.invincibleTimer -= dt;
            player.node.opacity = Math.floor(player.invincibleTimer * 16) % 2 === 0 ? 110 : 255;
        } else {
            player.node.opacity = 255;
        }

        let move = 0;
        if (this.keys.left) {
            move -= 1;
        }
        if (this.keys.right) {
            move += 1;
        }

        player.vx = move * this.moveSpeed;
        if (move !== 0) {
            player.facing = move > 0 ? 1 : -1;
        }

        if (this.keys.jumpQueued && player.onGround) {
            player.vy = this.jumpSpeed;
            player.onGround = false;
            this.playEffect('jump');
        }
        this.keys.jumpQueued = false;

        player.vy += this.gravity * dt;
        if (player.vy < this.maxFallSpeed) {
            player.vy = this.maxFallSpeed;
        }

        const previousX = player.x;
        const previousY = player.y;

        player.x += player.vx * dt;
        this.resolveHorizontal(player, previousX);

        player.y += player.vy * dt;
        player.onGround = false;
        this.resolveVertical(player, previousY);

        this.syncActorNode(player);
        this.applyPlayerVisual();
        this.checkEnemyTouches(previousY);

        if (player.y < -120) {
            this.killPlayer();
        }
    },

    resolveHorizontal(actor, previousX) {
        const nextRect = this.getRect(actor);
        for (let i = 0; i < this.solids.length; i++) {
            const solid = this.solids[i];
            if (!this.overlaps(nextRect, solid)) {
                continue;
            }
            if (actor.vx > 0 && previousX + actor.width <= solid.x + 4) {
                actor.x = solid.x - actor.width;
                actor.vx = 0;
            } else if (actor.vx < 0 && previousX >= solid.x + solid.width - 4) {
                actor.x = solid.x + solid.width;
                actor.vx = 0;
            }
            nextRect.x = actor.x;
        }

        actor.x = Math.max(0, Math.min(this.worldWidth - actor.width, actor.x));
    },

    resolveVertical(actor, previousY) {
        const nextRect = this.getRect(actor);
        for (let i = 0; i < this.solids.length; i++) {
            const solid = this.solids[i];
            if (!this.overlaps(nextRect, solid)) {
                continue;
            }
            if (actor.vy <= 0 && previousY >= solid.y + solid.height - 4) {
                actor.y = solid.y + solid.height;
                actor.vy = 0;
                actor.onGround = true;
            } else if (actor.vy > 0 && previousY + actor.height <= solid.y + 6) {
                actor.y = solid.y - actor.height;
                actor.vy = 0;
                if (solid.kind === 'question') {
                    this.triggerQuestionBlock(solid);
                }
            }
            nextRect.y = actor.y;
        }
    },

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.alive) {
                enemy.removeTimer -= dt;
                if (enemy.removeTimer <= 0) {
                    enemy.node.destroy();
                    this.enemies.splice(i, 1);
                }
                continue;
            }

            enemy.animTime += dt;
            enemy.vy += this.gravity * dt;
            if (enemy.vy < this.maxFallSpeed) {
                enemy.vy = this.maxFallSpeed;
            }

            const previousX = enemy.x;
            const previousY = enemy.y;

            enemy.x += enemy.vx * dt;
            const beforeResolveX = enemy.x;
            this.resolveHorizontal(enemy, previousX);
            if (Math.abs(enemy.x - beforeResolveX) > 0.001) {
                enemy.vx *= -1;
            }

            enemy.y += enemy.vy * dt;
            enemy.onGround = false;
            this.resolveVertical(enemy, previousY);

            if (enemy.y < -120) {
                enemy.node.destroy();
                this.enemies.splice(i, 1);
                continue;
            }

            this.applyEnemyVisual(enemy);
            this.syncActorNode(enemy);
        }
    },

    updateItems(dt) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (!item.active) {
                item.node.destroy();
                this.items.splice(i, 1);
                continue;
            }

            if (item.riseLeft > 0) {
                item.y += 54 * dt;
                item.riseLeft -= 54 * dt;
            } else {
                const previousX = item.x;
                const previousY = item.y;
                item.vy += this.gravity * dt;
                if (item.vy < this.maxFallSpeed) {
                    item.vy = this.maxFallSpeed;
                }
                item.x += item.vx * dt;
                const rawX = item.x;
                this.resolveHorizontal(item, previousX);
                if (Math.abs(rawX - item.x) > 0.001) {
                    item.vx *= -1;
                }
                item.y += item.vy * dt;
                item.onGround = false;
                this.resolveVertical(item, previousY);
            }

            this.syncActorNode(item);
            if (this.overlaps(this.getRect(item), this.getRect(this.player))) {
                item.active = false;
                this.applyPowerUp();
            }
        }
    },

    updateGoal() {
        if (!this.goal || this.state !== 'playing') {
            return;
        }
        if (this.overlaps(this.getRect(this.player), this.goal)) {
            this.finishStage();
        }
    },

    checkEnemyTouches(previousPlayerY) {
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy.alive) {
                continue;
            }
            if (!this.overlaps(this.getRect(this.player), this.getRect(enemy))) {
                continue;
            }

            const stompThreshold = enemy.y + enemy.height - 8;
            const playerBottomBefore = previousPlayerY;
            const playerBottomNow = this.player.y;
            const isStomp = this.player.vy <= 0 && playerBottomBefore >= stompThreshold && playerBottomNow <= stompThreshold + 12;

            if (isStomp) {
                this.stompEnemy(enemy);
                this.player.vy = this.jumpSpeed * 0.55;
                this.player.onGround = false;
            } else {
                this.handlePlayerHit();
            }
        }
    },

    stompEnemy(enemy) {
        enemy.alive = false;
        enemy.squashed = true;
        enemy.removeTimer = 0.55;
        enemy.vx = 0;
        enemy.vy = 0;
        this.score += 200;
        this.playEffect('stomp');
        this.applyEnemyVisual(enemy);
    },

    handlePlayerHit() {
        if (this.player.invincibleTimer > 0 || this.state !== 'playing') {
            return;
        }

        if (this.player.big) {
            this.player.big = false;
            this.player.invincibleTimer = 2.5;
            this.playEffect('die');
            this.applyPlayerVisual();
            this.showStatus('Mario shrank!');
            return;
        }

        this.killPlayer();
    },

    killPlayer() {
        if (!this.player || this.state !== 'playing') {
            return;
        }
        this.state = 'player-died';
        this.player.dead = true;
        this.player.vx = 0;
        this.player.vy = 680;
        this.player.node.rotation = 0;
        this.lives -= 1;
        this.playEffect('die');
        this.showStatus(this.lives > 0 ? 'You lost a life' : 'No lives left');
        this.refreshHud();
        this._playerStateTimer = 1.7;
    },

    respawnPlayer() {
        if (!this.player) {
            return;
        }
        this.player.dead = false;
        this.player.big = false;
        this.player.invincibleTimer = 2;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.x = 90;
        this.player.y = this.groundHeight;
        this.player.onGround = false;
        this.player.node.rotation = 0;
        this.syncActorNode(this.player);
        this.applyPlayerVisual();
        this.state = 'playing';
        this.showStatus(`Respawn! Lives: ${this.lives}`);
    },

    applyPowerUp() {
        this.player.big = true;
        this.player.invincibleTimer = 1.4;
        this.score += 1000;
        this.applyPlayerVisual();
        this.playEffect('power');
        this.showStatus('Super Mushroom!');
        this.refreshHud();
    },

    triggerQuestionBlock(block) {
        if (!block.active) {
            return;
        }

        block.active = false;
        block.kind = 'used';
        this.drawSolid(block);
        this.score += 100;
        this.playEffect(block.rewardType === 'mushroom' ? 'block' : 'coin');

        if (block.rewardType === 'mushroom') {
            this.spawnMushroom(block.x + 2, block.y + block.height);
        }

        this.refreshHud();
    },

    finishStage() {
        if (this.state !== 'playing') {
            return;
        }
        this.state = 'stage-clear';
        this._playerStateTimer = 1.6;
        this.score += Math.max(0, Math.floor(this.timer)) * 10 + 1000;
        this.refreshHud();
        this.playEffect('clear');
        this.showStatus('Stage Clear!');
    },

    showStageClearScreen() {
        this.clearOverlay();
        this.state = 'stage-summary';
        this.createTitle('Stage Clear', 56, 170);
        this.createSubtitle(`Final Score ${this.padScore(this.score)}`, 28, 110);
        this.createSubtitle(`Time Left ${Math.ceil(this.timer)}`, 24, 70);
        this.createButton('Play Again', cc.v2(0, -10), () => {
            this.startGame(0);
        }, 240, 64);
        this.createButton('Main Menu', cc.v2(0, -90), this.showStartMenu, 240, 64, new cc.Color(109, 192, 255, 255));
    },

    showGameOver() {
        this.clearOverlay();
        this.state = 'game-over';
        this.setHudVisible(true);
        this.createTitle('Game Over', 58, 150);
        this.createSubtitle(`Score ${this.padScore(this.score)}`, 28, 95);
        this.createButton('Retry Stage', cc.v2(0, 10), () => {
            this.startGame(0);
        }, 240, 64);
        this.createButton('Main Menu', cc.v2(0, -70), this.showStartMenu, 240, 64, new cc.Color(109, 192, 255, 255));
    },

    showStatus(text) {
        if (!this.hudNodes.status) {
            return;
        }
        const label = this.hudNodes.status.getComponent(cc.Label);
        label.string = text;
        this.hudNodes.status.active = true;
        this.hudNodes.status.opacity = 255;
        this.hudNodes.status.stopAllActions();
        this.hudNodes.status.runAction(
            cc.sequence(
                cc.delayTime(1.2),
                cc.fadeOut(0.35),
                cc.callFunc(() => {
                    this.hudNodes.status.active = false;
                })
            )
        );
    },

    refreshHud() {
        if (!this.hudNodes.life) {
            return;
        }
        this.hudNodes.life.getComponent(cc.Label).string = `LIFE ${Math.max(this.lives, 0)}`;
        this.hudNodes.score.getComponent(cc.Label).string = `SCORE ${this.padScore(this.score)}`;
        this.hudNodes.timer.getComponent(cc.Label).string = `TIME ${Math.ceil(this.timer)}`;
    },

    centerCamera(force) {
        if (!this.player) {
            return;
        }
        const target = cc.misc.clampf(this.player.x - this.viewWidth * 0.35, 0, this.worldWidth - this.viewWidth);
        this.cameraX = force ? target : this.cameraX + (target - this.cameraX) * 0.12;
        this.worldRoot.x = -this.cameraX - this.viewWidth / 2;
        this.worldRoot.y = -this.viewHeight / 2;
        this.backgroundLayer.x = -(this.cameraX * 0.15);
    },

    syncActorNode(actor) {
        actor.node.setPosition(actor.x, actor.y);
        if (actor === this.player) {
            actor.node.scaleX = actor.facing;
        }
    },

    applyPlayerVisual() {
        if (!this.player) {
            return;
        }

        const player = this.player;
        const atlas = player.big ? this.assets.atlases.marioBig : this.assets.atlases.marioSmall;
        const idle = player.big ? 'mario_big_0.png' : 'mario_small_0.png';
        const walkFrames = player.big
            ? ['mario_big_1.png', 'mario_big_2.png', 'mario_big_3.png']
            : ['mario_small_1.png', 'mario_small_2.png', 'mario_small_3.png'];
        const jumpFrame = player.big ? 'mario_big_10.png' : 'mario_small_10.png';

        let frameName = idle;
        if (!player.onGround) {
            frameName = jumpFrame;
        } else if (Math.abs(player.vx) > 10) {
            const index = Math.floor(player.animTime * 10) % walkFrames.length;
            frameName = walkFrames[index];
        }

        if (atlas && atlas.getSpriteFrame(frameName)) {
            player.sprite.enabled = true;
            player.graphics.enabled = false;
            player.sprite.spriteFrame = atlas.getSpriteFrame(frameName);
            player.node.width = player.big ? 56 : 46;
            player.node.height = player.big ? 78 : 58;
        } else {
            player.sprite.enabled = false;
            player.graphics.enabled = true;
            this.drawFallbackMario(player);
        }

        player.width = player.big ? 42 : 38;
        player.height = player.big ? 72 : 54;
    },

    drawFallbackMario(player) {
        const g = player.graphics;
        g.clear();
        const scale = player.big ? 1.25 : 1;
        g.fillColor = new cc.Color(225, 41, 41, 255);
        g.rect(6, 28 * scale, 26 * scale, 14 * scale);
        g.fill();
        g.fillColor = new cc.Color(254, 209, 174, 255);
        g.rect(10, 14 * scale, 18 * scale, 18 * scale);
        g.fill();
        g.fillColor = new cc.Color(37, 93, 188, 255);
        g.rect(8, 0, 22 * scale, 18 * scale);
        g.fill();
    },

    applyEnemyVisual(enemy) {
        const atlas = this.assets.atlases.goomba;
        let frameName = enemy.squashed ? 'Goomba_4.png' : (Math.floor(enemy.animTime * 7) % 2 === 0 ? 'Goomba_0.png' : 'Goomba_1.png');
        if (atlas && atlas.getSpriteFrame(frameName)) {
            enemy.sprite.enabled = true;
            enemy.graphics.enabled = false;
            enemy.sprite.spriteFrame = atlas.getSpriteFrame(frameName);
            enemy.node.width = 42;
            enemy.node.height = enemy.squashed ? 22 : 34;
        } else {
            enemy.sprite.enabled = false;
            enemy.graphics.enabled = true;
            this.drawFallbackGoomba(enemy);
        }

        enemy.height = enemy.squashed ? 18 : 34;
    },

    drawFallbackGoomba(enemy) {
        const g = enemy.graphics;
        g.clear();
        g.fillColor = new cc.Color(139, 88, 47, 255);
        g.roundRect(0, 8, enemy.width, enemy.squashed ? 12 : 22, 8);
        g.fill();
        g.fillColor = new cc.Color(236, 226, 207, 255);
        g.rect(8, 0, 8, 10);
        g.rect(enemy.width - 16, 0, 8, 10);
        g.fill();
    },

    getRect(actor) {
        return {
            x: actor.x,
            y: actor.y,
            width: actor.width,
            height: actor.height
        };
    },

    overlaps(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    },

    padScore(value) {
        const safe = Math.max(0, Math.floor(value));
        return (`000000${safe}`).slice(-6);
    },

    playMusic() {
        if (this.assets.audio.bgm && !this._bgmStarted) {
            cc.audioEngine.playMusic(this.assets.audio.bgm, true);
            cc.audioEngine.setMusicVolume(0.35);
            this._bgmStarted = true;
        }
    },

    stopMusic() {
        if (this._bgmStarted) {
            cc.audioEngine.stopMusic();
            this._bgmStarted = false;
        }
    },

    playEffect(key) {
        const clip = this.assets.audio[key];
        if (clip) {
            cc.audioEngine.playEffect(clip, false);
        }
    },

    cleanupStage() {
        this.worldRoot && this.worldRoot.removeAllChildren();
        this.player = null;
        this.solids = [];
        this.questionBlocks = [];
        this.enemies = [];
        this.items = [];
        this.goal = null;
    },

    onKeyDown(event) {
        if (!this.player && this.state !== 'level-select' && this.state !== 'menu') {
            return;
        }
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.keys.left = true;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.keys.right = true;
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
            case cc.macro.KEY.space:
                this.keys.jump = true;
                this.keys.jumpQueued = true;
                break;
            default:
                break;
        }
    },

    onKeyUp(event) {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.keys.left = false;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.keys.right = false;
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
            case cc.macro.KEY.space:
                this.keys.jump = false;
                break;
            default:
                break;
        }
    }
});
