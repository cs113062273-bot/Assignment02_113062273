cc.Class({
    extends: cc.Component,

    properties: {
        gravity: {
            default: -2000
        },
        debugDraw: {
            default: false
        }
    },

    onLoad() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, this.gravity);

        if (this.debugDraw) {
            physicsManager.debugDrawFlags = 1;
        } else {
            physicsManager.debugDrawFlags = 0;
        }
    }
});
