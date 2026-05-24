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
    },

    triggerGoal() {
        if (this.triggered) {
            return false;
        }

        this.triggered = true;
        this.playSfx(this.goalPoleSfx);
        this.setRevealNodesActive(true);
        return true;
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
