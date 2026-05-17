const firebaseAuth = require('FirebaseAuth');

cc.Class({
    extends: cc.Component,

    properties: {
        homeBackgroundNode: cc.Node,
        titleNode: cc.Node,
        loginButtonNode: cc.Node,
        signupButtonNode: cc.Node,
        loginPopup: cc.Node,
        signupPopup: cc.Node,
        stageSelectLayer: cc.Node,
        loadingLayer: cc.Node,
        stageSelectUserLabel: cc.Label,
        loginUsernameInput: cc.EditBox,
        loginPasswordInput: cc.EditBox,
        signupEmailInput: cc.EditBox,
        signupUsernameInput: cc.EditBox,
        signupPasswordInput: cc.EditBox,
        loginMessageLabel: cc.Label,
        signupMessageLabel: cc.Label,
        nextScene: {
            default: 'stageSelect'
        }
    },

    onLoad() {
        this.currentSession = this.readSession();
        this.hideAllPopups();
        this.setStageSelectVisible(false);
        this.setLoadingVisible(false);
        this.showLoginMessage('');
        this.showSignupMessage('');
        this.preloadNextScene();
    },

    preloadNextScene() {
        if (!this.nextScene) {
            return;
        }

        cc.director.preloadScene(this.nextScene, function () {});
    },

    hideAllPopups() {
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
        if (!this.stageSelectUserLabel) {
            return;
        }

        const username = session && session.username ? String(session.username).toUpperCase() : 'GUEST';
        this.stageSelectUserLabel.string = 'USER: ' + username;
    },

    onClickLogin() {
        this.setStageSelectVisible(false);
        this.setLoadingVisible(false);
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
            this.setHomeVisible(false);
            this.setLoadingVisible(true);

            this.scheduleOnce(function () {
                this.setLoadingVisible(false);
                this.setStageSelectVisible(true);
                this.updateStageSelectUser(this.currentSession);
            }, 0.45);
            return;
        }

        cc.director.loadScene(this.nextScene);
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
