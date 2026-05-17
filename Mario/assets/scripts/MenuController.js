cc.Class({
    extends: cc.Component,

    properties: {
        loginPopup: cc.Node,
        signupPopup: cc.Node,
        nextScene: {
            default: 'stageSelect'
        }
    },

    onLoad() {
        this.hideAllPopups();
    },

    hideAllPopups() {
        if (this.loginPopup) {
            this.loginPopup.active = false;
        }
        if (this.signupPopup) {
            this.signupPopup.active = false;
        }
    },

    onClickLogin() {
        this.hideAllPopups();
        if (this.loginPopup) {
            this.loginPopup.active = true;
        }
    },

    onClickSignup() {
        this.hideAllPopups();
        if (this.signupPopup) {
            this.signupPopup.active = true;
        }
    },

    onClickCloseLogin() {
        if (this.loginPopup) {
            this.loginPopup.active = false;
        }
    },

    onClickCloseSignup() {
        if (this.signupPopup) {
            this.signupPopup.active = false;
        }
    },

    onClickEnter() {
        cc.director.loadScene(this.nextScene);
    }
});
