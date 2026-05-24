const STATE_KEY = 'mario-runtime-state';
const NEXT_STAGE_KEY = 'mario-next-stage-scene';
const GAME_OVER_KEY = 'mario-game-over-scene';

cc.Class({
    extends: cc.Component,

    properties: {
        gravity: {
            default: -2000
        },
        debugDraw: {
            default: false
        },
        initialLives: {
            default: 5
        },
        initialTime: {
            default: 300
        },
        deathRestartDelay: {
            default: 0.45
        },
        gameStartScene: {
            default: 'gameStart'
        },
        defaultGameOverScene: {
            default: 'gameOver'
        },
        deathSensorNode: {
            default: null,
            type: cc.Node
        },
        fallDeathY: {
            default: -420
        }
    },

    onLoad() {
        this.setupPhysics();
        this.sceneName = cc.director.getScene() ? cc.director.getScene().name : '';
        this.playerDying = false;
        this.worldFrozen = false;
        this.levelCleared = false;
        this.timerAccumulator = 0;
        this.remainingTime = this.initialTime;

        this.resolveSceneReferences();
        this.restoreRuntimeState();
        this.bindPlayerController();
        this.updateAllUi();
        this.persistRuntimeState();
    },

    update(dt) {
        if (this.levelCleared || this.playerDying) {
            return;
        }

        this.checkFallDeath();
        if (this.playerDying) {
            return;
        }

        this.updateTimer(dt);
    },

    setupPhysics() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, this.gravity);
        physicsManager.debugDrawFlags = this.debugDraw ? 1 : 0;
    },

    resolveSceneReferences() {
        this.playerNode = this.findNodeByPaths([
            'Canvas/Player',
            'Canvas/World/Player',
            'Player'
        ]);
        this.lifeLabel = this.getLabelFromPaths([
            'Canvas/Status/Life num',
            'Status/Life num'
        ]);
        this.timerLabel = this.getLabelFromPaths([
            'Canvas/Status/time left',
            'Status/time left'
        ]);
        this.coinLabel = this.getLabelFromPaths([
            'Canvas/Status/Coin get',
            'Status/Coin get'
        ]);
        this.scoreLabel = this.getLabelFromPaths([
            'Canvas/Status/Score',
            'Status/Score'
        ]);
        this.stageBgmNode = this.findNodeByPaths([
            'Canvas/stagebgm',
            'stagebgm'
        ]);
        this.stageBgm = this.stageBgmNode ? this.stageBgmNode.getComponent('BgmController') : null;
        this.scoreDigits = this.scoreLabel && this.scoreLabel.string
            ? Math.max(String(this.scoreLabel.string).length, 1)
            : 7;
    },

    findNodeByPaths(paths) {
        for (let i = 0; i < paths.length; i += 1) {
            const node = cc.find(paths[i]);
            if (node) {
                return node;
            }
        }

        return null;
    },

    getLabelFromPaths(paths) {
        const node = this.findNodeByPaths(paths);
        return node ? node.getComponent(cc.Label) : null;
    },

    restoreRuntimeState() {
        const fallbackState = {
            sceneName: this.sceneName,
            lives: this.initialLives,
            coins: 0,
            score: 0
        };
        const raw = cc.sys.localStorage.getItem(STATE_KEY);
        if (!raw) {
            this.applyRuntimeState(fallbackState);
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.sceneName !== this.sceneName) {
                this.applyRuntimeState(fallbackState);
                return;
            }

            this.applyRuntimeState(parsed);
        } catch (error) {
            this.applyRuntimeState(fallbackState);
        }
    },

    applyRuntimeState(state) {
        this.lives = this.sanitizeNumber(state && state.lives, this.initialLives);
        this.coins = this.sanitizeNumber(state && state.coins, 0);
        this.score = this.sanitizeNumber(state && state.score, 0);
        this.remainingTime = this.initialTime;
        this.timerAccumulator = 0;
    },

    sanitizeNumber(value, fallback) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return fallback;
        }

        return Math.max(0, Math.floor(numeric));
    },

    bindPlayerController() {
        const player = this.getPlayerController();
        if (player && player.setGame) {
            player.setGame(this);
        }
    },

    getPlayerController() {
        return this.playerNode ? this.playerNode.getComponent('SimplePlayerController') : null;
    },

    updateTimer(dt) {
        if (this.worldFrozen) {
            return;
        }

        this.timerAccumulator += dt;
        while (this.timerAccumulator >= 1) {
            this.timerAccumulator -= 1;
            this.remainingTime = Math.max(0, this.remainingTime - 1);
            this.updateTimerUi();

            if (this.remainingTime <= 0) {
                this.triggerLifeLoss();
                return;
            }
        }
    },

    checkFallDeath() {
        const player = this.playerNode;
        if (!player || !cc.isValid(player)) {
            return;
        }

        const playerBottomY = this.getPlayerBottomY(player);
        const deathLineY = this.getFallDeathLineY();
        if (playerBottomY > deathLineY) {
            return;
        }

        this.triggerLifeLoss();
    },

    getPlayerBottomY(player) {
        if (!player || !cc.isValid(player)) {
            return Number.POSITIVE_INFINITY;
        }

        const bounds = player.getBoundingBoxToWorld ? player.getBoundingBoxToWorld() : null;
        if (bounds) {
            return bounds.y;
        }

        return player.y;
    },

    getFallDeathLineY() {
        if (this.deathSensorNode && cc.isValid(this.deathSensorNode)) {
            const worldPosition = this.deathSensorNode.convertToWorldSpaceAR(cc.v2(0, 0));
            return worldPosition.y;
        }

        return this.fallDeathY;
    },

    isWorldFrozen() {
        return this.worldFrozen || this.playerDying || this.levelCleared;
    },

    hitQuestionBlock() {
    },

    collectCoin() {
        this.coins += 1;
        this.updateCoinUi();
        this.persistRuntimeState();
    },

    collectPowerUp() {
    },

    stompEnemy() {
    },

    addScore(amount) {
        const delta = this.sanitizeNumber(amount, 0);
        if (delta <= 0) {
            return;
        }

        this.score += delta;
        this.updateScoreUi();
        this.persistRuntimeState();
    },

    clearLevel() {
        this.levelCleared = true;
        this.pauseStageBgm();
        this.persistRuntimeState();
    },

    loseLife() {
        this.triggerLifeLoss();
    },

    triggerLifeLoss() {
        if (this.playerDying) {
            return;
        }

        this.playerDying = true;
        this.worldFrozen = true;
        this.pauseStageBgm();
        this.lives = Math.max(0, this.lives - 1);
        this.updateLifeUi();
        this.persistRuntimeState();

        const player = this.getPlayerController();
        if (player && player.playDeathAnimation) {
            player.playDeathAnimation(this.finishLifeLoss.bind(this));
            return;
        }

        this.finishLifeLoss();
    },

    finishLifeLoss() {
        this.scheduleOnce(() => {
            if (this.lives > 0) {
                this.restartSceneFromGameStart();
                return;
            }

            this.goToGameOverScene();
        }, this.deathRestartDelay);
    },

    restartSceneFromGameStart() {
        this.persistRuntimeState();
        cc.sys.localStorage.setItem(NEXT_STAGE_KEY, this.sceneName);
        cc.director.loadScene(this.gameStartScene || this.sceneName);
    },

    goToGameOverScene() {
        cc.sys.localStorage.removeItem(STATE_KEY);
        const gameOverScene = cc.sys.localStorage.getItem(GAME_OVER_KEY) || this.defaultGameOverScene;
        cc.director.loadScene(gameOverScene || 'menu');
    },

    pauseStageBgm() {
        if (this.stageBgm && this.stageBgm.pause) {
            this.stageBgm.pause();
        }
    },

    persistRuntimeState() {
        const payload = {
            sceneName: this.sceneName,
            lives: this.lives,
            coins: this.coins,
            score: this.score
        };
        cc.sys.localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    },

    updateAllUi() {
        this.updateLifeUi();
        this.updateTimerUi();
        this.updateCoinUi();
        this.updateScoreUi();
    },

    updateLifeUi() {
        if (this.lifeLabel) {
            this.lifeLabel.string = String(this.lives);
        }
    },

    updateTimerUi() {
        if (this.timerLabel) {
            this.timerLabel.string = String(this.remainingTime);
        }
    },

    updateCoinUi() {
        if (this.coinLabel) {
            this.coinLabel.string = String(this.coins);
        }
    },

    updateScoreUi() {
        if (this.scoreLabel) {
            this.scoreLabel.string = String(this.score).padStart(this.scoreDigits, '0');
        }
    }
});
