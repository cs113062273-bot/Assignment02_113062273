cc.Class({
    extends: cc.Component,

    properties: {
        resultRoot: {
            default: null,
            type: cc.Node
        },
        goalPoleSfx: {
            default: null,
            type: cc.AudioClip
        }
    },

    onLoad() {
        this.triggered = false;
        this.game = this.findGameController();
    },

    triggerGoal() {
        if (this.triggered) {
            return false;
        }

        this.triggered = true;
        if (this.game && this.game.pauseStageBgm) {
            this.game.pauseStageBgm();
        }
        this.playSfx(this.goalPoleSfx);
        this.setRevealNodesActive(true);
        return true;
    },

    findGameController() {
        const scene = cc.director.getScene();
        if (!scene) {
            return null;
        }

        const candidates = [
            cc.find('Canvas/Game', scene),
            cc.find('Canvas', scene),
            cc.find('Game', scene)
        ];

        for (let i = 0; i < candidates.length; i += 1) {
            const node = candidates[i];
            if (!node) {
                continue;
            }

            const controller = node.getComponent('Game') || node.getComponent('SimpleStageController');
            if (controller) {
                return controller;
            }
        }

        return null;
    },

    setRevealNodesActive(active) {
        const nodes = this.getRevealNodes();
        for (let i = 0; i < nodes.length; i += 1) {
            nodes[i].active = active;
        }
    },

    getRevealNodes() {
        const root = this.resultRoot || this.node.parent;
        if (!root) {
            return [];
        }

        return root.children.filter((child) => child && child !== this.node);
    },

    playSfx(clip) {
        if (!clip) {
            return;
        }

        cc.audioEngine.playEffect(clip, false);
    }
});
