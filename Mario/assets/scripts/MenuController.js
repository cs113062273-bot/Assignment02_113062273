const firebaseAuth = require('FirebaseAuth');
const RUNTIME_STATE_KEY = 'mario-runtime-state';
const MENU_STAGE_SELECT_KEY = 'mario-open-stage-select';
const AUTH_KEY = 'mario-auth';

cc.Class({
    extends: cc.Component,

    properties: {
        enterLayerNode: cc.Node,
        homeBackgroundNode: cc.Node,
        titleNode: cc.Node,
        loginButtonNode: cc.Node,
        signupButtonNode: cc.Node,
        loginPopup: cc.Node,
        signupPopup: cc.Node,
        stageSelectLayer: cc.Node,
        loadingLayer: cc.Node,
        stageSelectUserLabel: cc.Label,
        stageSelectUserValueLabel: cc.Label,
        stageSelectLifeValueLabel: cc.Label,
        stageSelectCoinValueLabel: cc.Label,
        stageSelectScoreValueLabel: cc.Label,
        questionBoxNode: cc.Node,
        stage1ButtonNode: cc.Node,
        stage2ButtonNode: cc.Node,
        stage2LockedSpriteFrame: cc.SpriteFrame,
        ruleNode: cc.Node,
        loginUsernameInput: cc.EditBox,
        loginPasswordInput: cc.EditBox,
        signupEmailInput: cc.EditBox,
        signupUsernameInput: cc.EditBox,
        signupPasswordInput: cc.EditBox,
        loginMessageLabel: cc.Label,
        signupMessageLabel: cc.Label,
        loadingDelay: {
            default: 0.45
        },
        gameStartScene: {
            default: 'gameStart'
        },
        stage1Scene: {
            default: 'stage1'
        },
        stage2Scene: {
            default: ''
        },
        gameOverScene: {
            default: 'gameOver'
        },
        nextScene: {
            default: 'stageSelect'
        }
    },

    onLoad() {
        this.currentSession = this.readSession();
        this.resolveStageSelectReferences();
        this.bindStageSelectButtons();
        this.setEnterLayerVisible(true);
        this.hideAllPopups();
        this.setStageSelectVisible(false);
        this.setLoadingVisible(false);
        this.setRuleVisible(false);
        this.showLoginMessage('');
        this.showSignupMessage('');
        this.preloadStageScenes();

        if (this.consumeStageSelectRequest()) {
            this.showStageSelectDirect();
            this.refreshRunStateFromCloud();
        }
    },

    preloadStageScenes() {
        [this.gameStartScene, this.stage1Scene, this.stage2Scene, this.gameOverScene].forEach((sceneName) => {
            if (!sceneName) {
                return;
            }

            cc.director.preloadScene(sceneName, function () {});
        });
    },

    hideAllPopups() {
        this.setEnterLayerVisible(true);
        if (this.loginPopup) {
            this.loginPopup.active = false;
        }
        if (this.signupPopup) {
            this.signupPopup.active = false;
        }
        this.setHomeVisible(true);
    },

    setHomeVisible(visible) {
        if (this.titleNode) {
            this.titleNode.active = visible;
        }
        if (this.loginButtonNode) {
            this.loginButtonNode.active = visible;
        }
        if (this.signupButtonNode) {
            this.signupButtonNode.active = visible;
        }
    },

    setEnterLayerVisible(visible) {
        if (this.enterLayerNode) {
            this.enterLayerNode.active = visible;
        }
    },

    setStageSelectVisible(visible) {
        if (this.stageSelectLayer) {
            this.stageSelectLayer.active = visible;
        }
    },

    setLoadingVisible(visible) {
        if (this.loadingLayer) {
            this.loadingLayer.active = visible;
        }
    },

    setRuleVisible(visible) {
        if (this.ruleNode) {
            this.ruleNode.active = visible;
        }
    },

    resolveStageSelectReferences() {
        this.enterLayerNode = this.enterLayerNode || this.findNode('EnterLayer');
        this.stageSelectLayer = this.stageSelectLayer || this.findNode('StageSelectLayer');
        this.loadingLayer = this.loadingLayer || this.findNode('LoadingLayer');
        this.questionBoxNode = this.questionBoxNode || this.findNode('StageSelectLayer/QuestionBox');
        this.stage1ButtonNode = this.stage1ButtonNode || this.findNode('StageSelectLayer/Stage1Button');
        this.stage2ButtonNode = this.stage2ButtonNode || this.findNode('StageSelectLayer/Stage2Button');
        this.ruleNode = this.ruleNode || this.findNode('StageSelectLayer/Rule');

        if (!this.enterLayerNode && this.titleNode && this.titleNode.parent) {
            this.enterLayerNode = this.titleNode.parent;
        }

        if (!this.stageSelectUserValueLabel) {
            const userValueNode = this.findNode('StageSelectLayer/User/UserValueLabel');
            this.stageSelectUserValueLabel = userValueNode ? userValueNode.getComponent(cc.Label) : null;
        }

        if (!this.stageSelectUserLabel) {
            const userLabelNode = this.findNode('StageSelectLayer/User/UserLabel');
            this.stageSelectUserLabel = userLabelNode ? userLabelNode.getComponent(cc.Label) : null;
        }

        if (!this.stageSelectLifeValueLabel) {
            const lifeValueNode = this.findNode('StageSelectLayer/Life/LifeValueLabel');
            this.stageSelectLifeValueLabel = lifeValueNode ? lifeValueNode.getComponent(cc.Label) : null;
        }

        if (!this.stageSelectCoinValueLabel) {
            const coinValueNode = this.findNode('StageSelectLayer/Coin/CoinValueLabel');
            this.stageSelectCoinValueLabel = coinValueNode ? coinValueNode.getComponent(cc.Label) : null;
        }

        if (!this.stageSelectScoreValueLabel) {
            const scoreValueNode = this.findNode('StageSelectLayer/Score/ScoreValueLabel');
            this.stageSelectScoreValueLabel = scoreValueNode ? scoreValueNode.getComponent(cc.Label) : null;
        }

        this.stage2Button = this.stage2ButtonNode ? this.stage2ButtonNode.getComponent(cc.Button) : null;
        this.stage2ButtonTargetSprite = this.stage2Button && this.stage2Button.target
            ? this.stage2Button.target.getComponent(cc.Sprite)
            : null;
        this.stage2DefaultSpriteFrame = this.stage2ButtonTargetSprite ? this.stage2ButtonTargetSprite.spriteFrame : null;
    },

    findNode(path) {
        if (!path) {
            return null;
        }

        const parts = String(path).split('/');
        let current = this.node;

        for (let index = 0; index < parts.length; index += 1) {
            if (!current) {
                return null;
            }

            current = current.getChildByName(parts[index]);
        }

        return current || null;
    },

    bindStageSelectButtons() {
        this.bindButtonNode(this.questionBoxNode, this.onClickQuestionBox);
        this.bindButtonNode(this.stage1ButtonNode, this.onClickStage1);
        this.bindButtonNode(this.stage2ButtonNode, this.onClickStage2);
    },

    bindButtonNode(node, handler) {
        if (!node || !handler) {
            return;
        }

        node.off(cc.Node.EventType.TOUCH_END, handler, this);
        node.on(cc.Node.EventType.TOUCH_END, handler, this);
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

    readRunState() {
        const fallbackState = this.getDefaultRunState();
        const raw = cc.sys.localStorage.getItem(RUNTIME_STATE_KEY);
        if (!raw) {
            return fallbackState;
        }

        try {
            return this.normalizeRunState(JSON.parse(raw));
        } catch (error) {
            return fallbackState;
        }
    },

    getDefaultRunState() {
        return {
            lives: 5,
            coins: 0,
            score: 0,
            stage1Cleared: false
        };
    },

    normalizeRunState(state) {
        const fallbackState = this.getDefaultRunState();
        const source = state || {};
        return {
            lives: this.sanitizeNumber(source.lives, fallbackState.lives),
            coins: this.sanitizeNumber(source.coins, fallbackState.coins),
            score: this.sanitizeNumber(source.score, fallbackState.score),
            stage1Cleared: !!source.stage1Cleared
        };
    },

    writeRunState(state) {
        const normalized = this.normalizeRunState(state);
        cc.sys.localStorage.setItem(RUNTIME_STATE_KEY, JSON.stringify(normalized));
        return normalized;
    },

    sanitizeNumber(value, fallback) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return fallback;
        }

        return Math.max(0, Math.floor(numeric));
    },

    consumeStageSelectRequest() {
        const shouldOpen = cc.sys.localStorage.getItem(MENU_STAGE_SELECT_KEY) === '1';
        if (shouldOpen) {
            cc.sys.localStorage.removeItem(MENU_STAGE_SELECT_KEY);
        }
        return shouldOpen;
    },

    updateStageSelectUser(session) {
        const username = session && session.username ? String(session.username).toUpperCase() : 'GUEST';
        if (this.stageSelectUserValueLabel) {
            this.stageSelectUserValueLabel.string = username;
            return;
        }

        if (this.stageSelectUserLabel) {
            this.stageSelectUserLabel.string = 'USER: ' + username;
        }
    },

    updateStageSelectStats(state) {
        const runState = state || this.readRunState();

        if (this.stageSelectLifeValueLabel) {
            this.stageSelectLifeValueLabel.string = String(runState.lives);
        }

        if (this.stageSelectCoinValueLabel) {
            this.stageSelectCoinValueLabel.string = String(runState.coins);
        }

        if (this.stageSelectScoreValueLabel) {
            const digitCount = this.stageSelectScoreValueLabel.string
                ? Math.max(String(this.stageSelectScoreValueLabel.string).length, 1)
                : 7;
            this.stageSelectScoreValueLabel.string = String(runState.score).padStart(digitCount, '0');
        }
    },

    updateStage2Availability(state) {
        const runState = state || this.readRunState();
        const unlocked = !!runState.stage1Cleared;
        this.stage2Unlocked = unlocked;

        if (this.stage2Button) {
            this.stage2Button.interactable = unlocked;
        }

        if (this.stage2ButtonTargetSprite) {
            if (!unlocked && this.stage2LockedSpriteFrame) {
                this.stage2ButtonTargetSprite.spriteFrame = this.stage2LockedSpriteFrame;
            } else if (this.stage2DefaultSpriteFrame) {
                this.stage2ButtonTargetSprite.spriteFrame = this.stage2DefaultSpriteFrame;
            }
        }
    },

    showStageSelectDirect() {
        this.hideAllPopups();
        this.setEnterLayerVisible(false);
        this.setRuleVisible(false);
        this.setLoadingVisible(false);
        this.setStageSelectVisible(true);
        this.updateStageSelectUser(this.currentSession);
        const runState = this.readRunState();
        this.updateStageSelectStats(runState);
        this.updateStage2Availability(runState);
    },

    refreshRunStateFromCloud() {
        if (!this.currentSession) {
            return Promise.resolve(this.readRunState());
        }

        return firebaseAuth.loadProgress(this.currentSession)
            .then((result) => {
                this.saveSession(result.session);
                const runState = this.writeRunState(result.state || this.getDefaultRunState());
                this.updateStageSelectStats(runState);
                this.updateStage2Availability(runState);
                return runState;
            })
            .catch((error) => {
                cc.warn('Failed to restore cloud progress:', error);
                const runState = this.readRunState();
                this.updateStageSelectStats(runState);
                this.updateStage2Availability(runState);
                return runState;
            });
    },

    onClickLogin() {
        this.setStageSelectVisible(false);
        this.setLoadingVisible(false);
        this.setRuleVisible(false);
        this.hideAllPopups();
        this.showLoginMessage('');
        this.setHomeVisible(false);
        if (this.loginPopup) {
            this.loginPopup.active = true;
        }
    },

    onClickSignup() {
        this.setStageSelectVisible(false);
        this.setLoadingVisible(false);
        this.setRuleVisible(false);
        this.hideAllPopups();
        this.showSignupMessage('');
        this.setHomeVisible(false);
        if (this.signupPopup) {
            this.signupPopup.active = true;
        }
    },

    onClickCloseLogin() {
        this.showLoginMessage('');
        this.hideAllPopups();
    },

    onClickCloseSignup() {
        this.showSignupMessage('');
        this.hideAllPopups();
    },

    showLoginMessage(text) {
        if (this.loginMessageLabel) {
            this.loginMessageLabel.string = text || '';
        }
    },

    showSignupMessage(text) {
        if (this.signupMessageLabel) {
            this.signupMessageLabel.string = text || '';
        }
    },

    saveSession(session) {
        if (!session) {
            return;
        }

        this.currentSession = session;
        cc.sys.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    },

    gotoNextScene() {
        if (this.stageSelectLayer) {
            this.hideAllPopups();
            this.setEnterLayerVisible(false);
            this.setRuleVisible(false);
            this.setStageSelectVisible(false);
            this.setLoadingVisible(true);
            this.refreshRunStateFromCloud().then((runState) => {
                this.scheduleOnce(function () {
                    this.setLoadingVisible(false);
                    this.setStageSelectVisible(true);
                    this.updateStageSelectUser(this.currentSession);
                    this.updateStageSelectStats(runState);
                    this.updateStage2Availability(runState);
                }, this.loadingDelay);
            });
            return;
        }

        this.loadSceneWithLoading(this.nextScene);
    },

    loadSceneWithLoading(sceneName) {
        if (!sceneName) {
            return;
        }

        this.hideAllPopups();
        this.setEnterLayerVisible(false);
        this.setRuleVisible(false);
        this.setStageSelectVisible(false);
        this.setLoadingVisible(true);

        this.scheduleOnce(function () {
            cc.director.loadScene(sceneName);
        }, this.loadingDelay);
    },

    onClickQuestionBox() {
        if (!this.ruleNode) {
            return;
        }

        this.setRuleVisible(!this.ruleNode.active);
    },

    onClickStage1() {
        this.gotoGameStart(this.stage1Scene || this.nextScene);
    },

    onClickStage2() {
        if (!this.stage2Scene || !this.stage2Unlocked) {
            cc.warn('Stage 2 scene is not configured yet.');
            return;
        }

        this.gotoGameStart(this.stage2Scene);
    },

    gotoGameStart(targetScene) {
        if (!targetScene) {
            return;
        }

        if (targetScene === this.stage1Scene) {
            const defaultRunState = this.writeRunState(this.getDefaultRunState());
            if (this.currentSession) {
                firebaseAuth.saveProgress(this.currentSession, defaultRunState)
                    .then((freshSession) => {
                        this.saveSession(freshSession);
                    })
                    .catch((error) => {
                        cc.warn('Failed to reset cloud progress for stage 1:', error);
                    });
            }
        }
        cc.sys.localStorage.setItem('mario-next-stage-scene', targetScene);
        if (this.gameOverScene) {
            cc.sys.localStorage.setItem('mario-game-over-scene', this.gameOverScene);
        }

        this.loadSceneWithLoading(this.gameStartScene || targetScene);
    },

    onClickEnterLogin() {
        const username = this.loginUsernameInput ? this.loginUsernameInput.string.trim() : '';
        const password = this.loginPasswordInput ? this.loginPasswordInput.string : '';

        this.showLoginMessage('Signing in...');

        firebaseAuth.login(username, password)
            .then((session) => {
                this.saveSession(session);
                this.showLoginMessage('Login success.');
                this.gotoNextScene();
            })
            .catch((error) => {
                this.showLoginMessage(error.userMessage || error.message || 'Login failed.');
            });
    },

    onClickEnterSignup() {
        const email = this.signupEmailInput ? this.signupEmailInput.string.trim() : '';
        const username = this.signupUsernameInput ? this.signupUsernameInput.string.trim() : '';
        const password = this.signupPasswordInput ? this.signupPasswordInput.string : '';

        this.showSignupMessage('Creating account...');

        firebaseAuth.signUp(email, username, password)
            .then((session) => {
                this.saveSession(session);
                this.showSignupMessage('Signup success.');
                this.gotoNextScene();
            })
            .catch((error) => {
                this.showSignupMessage(error.userMessage || error.message || 'Signup failed.');
            });
    },

    onClickEnter() {
        this.gotoNextScene();
    }
});
