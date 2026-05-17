const firebaseAuth = require('FirebaseAuth');

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
        questionBoxNode: cc.Node,
        stage1ButtonNode: cc.Node,
        stage2ButtonNode: cc.Node,
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
        stage1Scene: {
            default: 'stage1'
        },
        stage2Scene: {
            default: ''
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
    },

    preloadStageScenes() {
        [this.stage1Scene, this.stage2Scene].forEach((sceneName) => {
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
        const raw = cc.sys.localStorage.getItem('mario-auth');
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
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
        cc.sys.localStorage.setItem('mario-auth', JSON.stringify(session));
    },

    gotoNextScene() {
        if (this.stageSelectLayer) {
            this.hideAllPopups();
            this.setEnterLayerVisible(false);
            this.setRuleVisible(false);
            this.setStageSelectVisible(false);
            this.setLoadingVisible(true);

            this.scheduleOnce(function () {
                this.setLoadingVisible(false);
                this.setStageSelectVisible(true);
                this.updateStageSelectUser(this.currentSession);
            }, this.loadingDelay);
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
        this.loadSceneWithLoading(this.stage1Scene || this.nextScene);
    },

    onClickStage2() {
        if (!this.stage2Scene) {
            cc.warn('Stage 2 scene is not configured yet.');
            return;
        }

        this.loadSceneWithLoading(this.stage2Scene);
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
