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

        const desired = cc.misc.clampf(this.target.x - this.viewWidth * 0.5, this.leftLimit, this.rightLimit - this.viewWidth);
        this.node.x = -desired;
    }
});
