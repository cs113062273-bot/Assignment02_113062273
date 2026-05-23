cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        moveSpriteFrame: cc.SpriteFrame,
        deadSpriteFrame: cc.SpriteFrame,
        moveSpeed: {
            default: 80
        },
        deathDuration: {
            default: 0.35
        }
    },

    onLoad() {
        this.game = this.gameNode ? this.gameNode.getComponent('Game') : null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.moveDirection = -1;
        this.isDead = false;
        this.baseScaleX = Math.abs(this.node.scaleX || 1);
        this.reverseCooldown = 0;

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
        }

        if (this.sprite && this.moveSpriteFrame) {
            this.sprite.spriteFrame = this.moveSpriteFrame;
        }
    },

    update() {
        if (!this.body || this.isDead) {
            return;
        }

        if (this.reverseCooldown > 0) {
            this.reverseCooldown -= cc.director.getDeltaTime();
        }

        if (this.game && this.game.isWorldFrozen()) {
            this.body.linearVelocity = cc.v2(0, 0);
            return;
        }

        this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
        this.node.scaleX = this.moveDirection < 0 ? this.baseScaleX : -this.baseScaleX;
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (this.isDead || !otherCollider || otherCollider.sensor) {
            return;
        }

        const player = otherCollider.node.getComponent('SimplePlayerController');
        if (player) {
            return;
        }

        const normal = contact.getWorldManifold().normal;
        const otherX = otherCollider.node.x;
        const collidedOnSide = Math.abs(normal.x) > 0.05;
        const hitWallInFront =
            (this.moveDirection > 0 && otherX >= this.node.x) ||
            (this.moveDirection < 0 && otherX <= this.node.x);

        if (collidedOnSide || hitWallInFront) {
            this.reverseDirection();
        }
    },

    reverseDirection() {
        if (this.reverseCooldown > 0) {
            return;
        }

        this.moveDirection *= -1;
        this.reverseCooldown = 0.12;
    },

    stomp() {
        if (this.isDead) {
            return;
        }

        this.isDead = true;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.enabled = false;
        }

        const colliders = this.node.getComponents(cc.PhysicsCollider);
        for (let i = 0; i < colliders.length; i += 1) {
            colliders[i].enabled = false;
        }

        if (this.sprite && this.deadSpriteFrame) {
            this.sprite.spriteFrame = this.deadSpriteFrame;
        }

        this.scheduleOnce(() => {
            if (cc.isValid(this.node)) {
                this.node.destroy();
            }
        }, this.deathDuration);
    }
});
