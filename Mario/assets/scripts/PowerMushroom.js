cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        speed: 110
    },

    onLoad() {
        this.body = this.getComponent(cc.RigidBody);
        this.direction = 1;
    },

    update() {
        if (this.body) {
            this.body.linearVelocity = cc.v2(this.direction * this.speed, this.body.linearVelocity.y);
        }
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        const normal = contact.getWorldManifold().normal;
        if (Math.abs(normal.x) > 0.5) {
            this.direction *= -1;
        }
    },

    collect(playerController) {
        if (playerController) {
            playerController.growBig();
        }

        const game = this.gameNode ? this.gameNode.getComponent('Game') : null;
        if (game) {
            game.collectPowerUp();
        }

        this.node.destroy();
    }
});
