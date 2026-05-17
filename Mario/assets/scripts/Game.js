const PlayerController = require('PlayerController');

cc.Class({
    extends: cc.Component,

    properties: {
        startMenu: cc.Node,
        levelSelectMenu: cc.Node,
        gameLayer: cc.Node,
        hudLayer: cc.Node,
        gameOverMenu: cc.Node,
        clearMenu: cc.Node,

        player: cc.Node,

        lifeLabel: cc.Label,
        scoreLabel: cc.Label,
        timerLabel: cc.Label,
        statusLabel: cc.Label,
        clearScoreLabel: cc.Label,

        bgm: cc.AudioClip,
        jumpSfx: cc.AudioClip,
        dieSfx: cc.AudioClip,
        stompSfx: cc.AudioClip,
        coinSfx: cc.AudioClip,
        powerSfx: cc.AudioClip,
        clearSfx: cc.AudioClip,
        blockSfx: cc.AudioClip,

        startLives: 3,
        startTime: 120
    },

    onLoad() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -2000);

        this.state = 'menu';
        this.score = 0;
        this.lives = this.startLives;
        this.timeLeft = this.startTime;
        this.countdownScheduled = false;
        this.musicId = -1;

        this.playerController = this.player ? this.player.getComponent(PlayerController) : null;
        if (this.playerController) {
            this.playerController.setGame(this);
        }

        this.showStartMenu();
    },

    setPanel(node, visible) {
        if (node) {
            node.active = visible;
        }
    },

    showStartMenu() {
        this.state = 'menu';
        this.stopMusic();
        this.setPanel(this.startMenu, true);
        this.setPanel(this.levelSelectMenu, false);
        this.setPanel(this.gameLayer, false);
        this.setPanel(this.hudLayer, false);
        this.setPanel(this.gameOverMenu, false);
        this.setPanel(this.clearMenu, false);
        this.setPlayerActive(false);
    },

    onClickStart() {
        this.state = 'level-select';
        this.setPanel(this.startMenu, false);
        this.setPanel(this.levelSelectMenu, true);
    },

    onClickBackToStart() {
        this.showStartMenu();
    },

    onClickPlayLevel1() {
        this.beginGame();
    },

    onClickRetry() {
        this.beginGame();
    },

    onClickReturnMenu() {
        this.showStartMenu();
    },

    beginGame() {
        this.state = 'playing';
        this.score = 0;
        this.lives = this.startLives;
        this.timeLeft = this.startTime;

        this.setPanel(this.startMenu, false);
        this.setPanel(this.levelSelectMenu, false);
        this.setPanel(this.gameLayer, true);
        this.setPanel(this.hudLayer, true);
        this.setPanel(this.gameOverMenu, false);
        this.setPanel(this.clearMenu, false);
        this.setPlayerActive(true);

        if (this.playerController) {
            this.playerController.resetPlayer();
            this.playerController.enableControl(true);
        }

        this.refreshUI();
        this.showStatus('Stage 1-1');
        this.startCountdown();
        this.playMusic();
    },

    setPlayerActive(active) {
        if (this.player) {
            this.player.active = active;
        }
    },

    startCountdown() {
        this.unschedule(this.tickCountdown);
        this.schedule(this.tickCountdown, 1);
        this.countdownScheduled = true;
    },

    stopCountdown() {
        this.unschedule(this.tickCountdown);
        this.countdownScheduled = false;
    },

    tickCountdown() {
        if (this.state !== 'playing') {
            return;
        }

        this.timeLeft -= 1;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.refreshUI();
            this.loseLife();
            return;
        }

        this.refreshUI();
    },

    addScore(value) {
        this.score += value;
        this.refreshUI();
    },

    showStatus(text) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
    },

    refreshUI() {
        if (this.lifeLabel) {
            this.lifeLabel.string = `LIFE ${this.lives}`;
        }
        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE ${(`000000${this.score}`).slice(-6)}`;
        }
        if (this.timerLabel) {
            this.timerLabel.string = `TIME ${this.timeLeft}`;
        }
        if (this.clearScoreLabel) {
            this.clearScoreLabel.string = `FINAL SCORE ${(`000000${this.score}`).slice(-6)}`;
        }
    },

    loseLife() {
        if (this.state !== 'playing') {
            return;
        }

        this.lives -= 1;
        this.playEffect(this.dieSfx);
        this.refreshUI();

        if (this.playerController) {
            this.playerController.enableControl(false);
        }

        if (this.lives > 0) {
            this.showStatus(`Respawn! Lives: ${this.lives}`);
            this.scheduleOnce(() => {
                if (this.playerController) {
                    this.playerController.resetPlayer();
                    this.playerController.enableControl(true);
                }
            }, 1);
        } else {
            this.gameOver();
        }
    },

    gameOver() {
        this.state = 'game-over';
        this.stopCountdown();
        this.stopMusic();
        this.setPanel(this.gameOverMenu, true);
        this.setPlayerActive(false);
        this.showStatus('Game Over');
    },

    clearLevel() {
        if (this.state !== 'playing') {
            return;
        }

        this.state = 'clear';
        this.stopCountdown();
        this.stopMusic();
        this.addScore(this.timeLeft * 10 + 1000);
        this.playEffect(this.clearSfx);
        this.setPanel(this.clearMenu, true);
        if (this.playerController) {
            this.playerController.enableControl(false);
        }
        this.showStatus('Stage Clear!');
    },

    collectPowerUp() {
        this.addScore(1000);
        this.playEffect(this.powerSfx);
        this.showStatus('Super Mushroom!');
    },

    collectCoin() {
        this.addScore(100);
        this.playEffect(this.coinSfx);
    },

    hitQuestionBlock() {
        this.playEffect(this.blockSfx || this.coinSfx);
    },

    stompEnemy() {
        this.addScore(200);
        this.playEffect(this.stompSfx);
    },

    playJump() {
        this.playEffect(this.jumpSfx);
    },

    playMusic() {
        this.stopMusic();
        if (this.bgm) {
            this.musicId = cc.audioEngine.playMusic(this.bgm, true);
            cc.audioEngine.setMusicVolume(0.35);
        }
    },

    stopMusic() {
        cc.audioEngine.stopMusic();
        this.musicId = -1;
    },

    playEffect(clip) {
        if (clip) {
            cc.audioEngine.playEffect(clip, false);
        }
    }
});
