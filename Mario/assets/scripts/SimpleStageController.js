const firebaseAuth = require('FirebaseAuth');
const STATE_KEY = 'mario-runtime-state';
const NEXT_STAGE_KEY = 'mario-next-stage-scene';
const GAME_OVER_KEY = 'mario-game-over-scene';
const MENU_STAGE_SELECT_KEY = 'mario-open-stage-select';
const AUTH_KEY = 'mario-auth';
const FIRESTORE_ERROR_KEY = 'mario-firestore-last-error';

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
        levelClearReturnDelay: {
            default: 5
        },
        gameStartScene: {
            default: 'gameStart'
        },
        menuScene: {
            default: 'menu'
        },
        stage1SceneName: {
            default: 'stage1'
        },
        defaultGameOverScene: {
            default: 'gameOver'
        },
        stompScore: {
            default: 100
        },
        shellKickScore: {
            default: 100
        },
        powerUpScore: {
            default: 1000
        },
        clearTimeBonusMultiplier: {
            default: 50
        },
        scorePopupRoot: {
            default: null,
            type: cc.Node
        },
        scorePopupFont: {
            default: null,
            type: cc.Font
        },
        scorePopupFontSize: {
            default: 28
        },
        scorePopupRiseHeight: {
            default: 56
        },
        scorePopupDuration: {
            default: 0.55
        },
        scorePopupOffsetY: {
            default: 24
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
        this.commitLifeStartState();
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
        const fallbackState = this.getDefaultRuntimeState();
        const raw = cc.sys.localStorage.getItem(STATE_KEY);
        if (!raw) {
            this.applyRuntimeState(fallbackState);
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed) {
                this.applyRuntimeState(fallbackState);
                return;
            }

            this.applyRuntimeState(this.buildRuntimeState(parsed));
        } catch (error) {
            this.applyRuntimeState(fallbackState);
        }
    },

    getDefaultRuntimeState() {
        return {
            lives: this.initialLives,
            coins: 0,
            score: 0,
            stage1Cleared: false
        };
    },

    buildRuntimeState(state) {
        const fallbackState = this.getDefaultRuntimeState();
        const source = state || {};
        return {
            lives: this.sanitizeNumber(source.lives, fallbackState.lives),
            coins: this.sanitizeNumber(source.coins, fallbackState.coins),
            score: this.sanitizeNumber(source.score, fallbackState.score),
            stage1Cleared: !!source.stage1Cleared
        };
    },

    applyRuntimeState(state) {
        const runtimeState = this.buildRuntimeState(state);
        this.lives = runtimeState.lives;
        this.coins = runtimeState.coins;
        this.score = runtimeState.score;
        this.stage1Cleared = runtimeState.stage1Cleared;
        this.remainingTime = this.initialTime;
        this.timerAccumulator = 0;
        this.lifeStartState = runtimeState;
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
    },

    collectPowerUp(source) {
        this.addScore(this.powerUpScore, source);
    },

    stompEnemy(source) {
        this.addScore(this.stompScore, source);
    },

    kickShell(source) {
        this.addScore(this.shellKickScore, source);
    },

    addScore(amount, source, offsetY) {
        const delta = this.sanitizeNumber(amount, 0);
        if (delta <= 0) {
            return;
        }

        this.score += delta;
        this.updateScoreUi();

        if (source) {
            this.spawnScorePopup(delta, source, offsetY);
        }
    },

    clearLevel() {
        if (this.levelCleared) {
            return;
        }

        this.levelCleared = true;
        if (this.sceneName === this.stage1SceneName) {
            this.stage1Cleared = true;
        }
        this.pauseStageBgm();
        this.addScore(this.remainingTime * this.clearTimeBonusMultiplier);
        this.commitProgressState(this.getCurrentRuntimeState());
        this.scheduleOnce(() => {
            this.goToStageSelectMenu();
        }, this.levelClearReturnDelay);
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
        const nextLifeState = this.getCurrentRuntimeState();
        nextLifeState.lives = Math.max(0, nextLifeState.lives - 1);

        this.lives = nextLifeState.lives;
        this.updateLifeUi();

        if (nextLifeState.lives > 0) {
            this.commitProgressState(nextLifeState);
        } else {
            cc.sys.localStorage.removeItem(STATE_KEY);
            this.clearCloudProgress();
        }

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
        cc.sys.localStorage.setItem(NEXT_STAGE_KEY, this.sceneName);
        cc.director.loadScene(this.gameStartScene || this.sceneName);
    },

    goToGameOverScene() {
        cc.sys.localStorage.removeItem(STATE_KEY);
        cc.sys.localStorage.removeItem(NEXT_STAGE_KEY);
        cc.sys.localStorage.setItem(MENU_STAGE_SELECT_KEY, '1');
        const gameOverScene = cc.sys.localStorage.getItem(GAME_OVER_KEY) || this.defaultGameOverScene;
        this.clearCloudProgress().then(() => {
            cc.director.loadScene(gameOverScene || 'menu');
        });
    },

    goToStageSelectMenu() {
        cc.sys.localStorage.removeItem(NEXT_STAGE_KEY);
        this.commitProgressState(this.getCurrentRuntimeState());
        cc.sys.localStorage.setItem(MENU_STAGE_SELECT_KEY, '1');
        cc.director.loadScene(this.menuScene || 'menu');
    },

    pauseStageBgm() {
        if (this.stageBgm && this.stageBgm.pause) {
            this.stageBgm.pause();
        }
    },

    spawnScorePopup(amount, source, offsetY) {
        const parent = this.scorePopupRoot || (this.playerNode ? this.playerNode.parent : null);
        if (!parent || !cc.isValid(parent)) {
            return;
        }

        const worldPosition = this.resolvePopupWorldPosition(source, offsetY);
        if (!worldPosition) {
            return;
        }

        const popupNode = new cc.Node('ScorePopup');
        popupNode.parent = parent;
        popupNode.setPosition(parent.convertToNodeSpaceAR(worldPosition));

        const label = popupNode.addComponent(cc.Label);
        label.string = String(amount);
        label.fontSize = this.scorePopupFontSize;
        label.lineHeight = this.scorePopupFontSize;
        if (this.scorePopupFont) {
            label.font = this.scorePopupFont;
        }

        popupNode.opacity = 255;
        popupNode.runAction(
            cc.sequence(
                cc.spawn(
                    cc.moveBy(this.scorePopupDuration, 0, this.scorePopupRiseHeight),
                    cc.fadeOut(this.scorePopupDuration)
                ),
                cc.removeSelf()
            )
        );
    },

    resolvePopupWorldPosition(source, offsetY) {
        const lift = typeof offsetY === 'number' ? offsetY : this.scorePopupOffsetY;

        if (source instanceof cc.Node) {
            if (!cc.isValid(source)) {
                return null;
            }

            return source.convertToWorldSpaceAR(cc.v2(0, lift));
        }

        if (source && typeof source.x === 'number' && typeof source.y === 'number') {
            return cc.v2(source.x, source.y + lift);
        }

        return null;
    },

    getCurrentRuntimeState() {
        return this.buildRuntimeState({
            lives: this.lives,
            coins: this.coins,
            score: this.score,
            stage1Cleared: this.stage1Cleared
        });
    },

    readSession() {
        const raw = cc.sys.localStorage.getItem(AUTH_KEY);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    },

    saveSession(session) {
        if (!session) {
            return;
        }

        cc.sys.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    },

    commitLifeStartState() {
        this.commitProgressState(this.getCurrentRuntimeState());
    },

    commitProgressState(state) {
        const payload = this.buildRuntimeState(state);
        this.lifeStartState = payload;
        cc.sys.localStorage.setItem(STATE_KEY, JSON.stringify(payload));

        const session = this.readSession();
        if (!session) {
            return Promise.resolve(payload);
        }

        return firebaseAuth.saveProgress(session, payload)
            .then((freshSession) => {
                this.saveSession(freshSession);
                cc.sys.localStorage.removeItem(FIRESTORE_ERROR_KEY);
                return payload;
            })
            .catch((error) => {
                cc.sys.localStorage.setItem(FIRESTORE_ERROR_KEY, String(error && (error.userMessage || error.message || error)));
                cc.warn('Failed to save cloud progress:', error);
                return payload;
            });
    },

    clearCloudProgress() {
        const session = this.readSession();
        if (!session) {
            return Promise.resolve();
        }

        return firebaseAuth.clearProgress(session)
            .then((freshSession) => {
                this.saveSession(freshSession);
                cc.sys.localStorage.removeItem(FIRESTORE_ERROR_KEY);
            })
            .catch((error) => {
                cc.sys.localStorage.setItem(FIRESTORE_ERROR_KEY, String(error && (error.userMessage || error.message || error)));
                cc.warn('Failed to clear cloud progress:', error);
            });
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
