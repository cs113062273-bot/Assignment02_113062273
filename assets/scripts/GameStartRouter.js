cc.Class({
    extends: cc.Component,

    properties: {
        delaySeconds: {
            default: 1
        },
        defaultScene: {
            default: 'menu'
        },
        stage1Scene: {
            default: 'stage1'
        },
        stage2Scene: {
            default: 'stage2'
        },
        gameOverScene: {
            default: 'gameOver'
        }
    },

    onLoad() {
        const pendingScene = cc.sys.localStorage.getItem('mario-next-stage-scene');
        const targetScene = this.resolveTargetScene(pendingScene);

        this.scheduleOnce(function () {
            cc.director.loadScene(targetScene);
        }, this.delaySeconds);
    },

    resolveTargetScene(sceneName) {
        if (sceneName === this.stage1Scene && this.stage1Scene) {
            return this.stage1Scene;
        }

        if (sceneName === this.stage2Scene && this.stage2Scene) {
            return this.stage2Scene;
        }

        return this.defaultScene;
    }
});
