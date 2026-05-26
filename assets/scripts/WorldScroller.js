cc.Class({
    extends: cc.Component,

    properties: {
        target: cc.Node,
        leftLimit: 0,
        rightLimit: 4800,
        viewWidth: 960
    },

    lateUpdate() {
        if (!this.target) {
            return;
        }

        const halfWidth = this.viewWidth * 0.5;
        const minCameraX = this.leftLimit + halfWidth;
        const maxCameraX = this.rightLimit - halfWidth;
        this.node.x = cc.misc.clampf(this.target.x, minCameraX, maxCameraX);
    }
});
