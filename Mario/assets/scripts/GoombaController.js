cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        moveSpriteFrame: {
            default: null,
            type: cc.SpriteFrame,
            visible: false
        },
        moveSpriteFrame1: cc.SpriteFrame,
        moveSpriteFrame2: cc.SpriteFrame,
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
        this.moveFrameIndex = 0;
        this.moveFrameElapsed = 0;
        this.moveFrameInterval = 0.12;

        if (!this.moveSpriteFrame1 && this.moveSpriteFrame) {
            this.moveSpriteFrame1 = this.moveSpriteFrame;
        }

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
        }

        const initialMoveFrame = this.getCurrentMoveFrames()[0];
        if (this.sprite && initialMoveFrame) {
            this.sprite.spriteFrame = initialMoveFrame;
        }
    },

    update(dt) {
        if (!this.body || this.isDead) {
            return;
        }

        if (this.reverseCooldown > 0) {
            this.reverseCooldown -= dt;
        }

        if (this.game && this.game.isWorldFrozen()) {
            this.body.linearVelocity = cc.v2(0, 0);
            return;
        }

        this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
        this.node.scaleX = this.moveDirection < 0 ? this.baseScaleX : -this.baseScaleX;
        this.updateMoveFrame(dt);
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

    getCurrentMoveFrames() {
        const frames = [];

        if (this.moveSpriteFrame1) {
            frames.push(this.moveSpriteFrame1);
        }

        if (this.moveSpriteFrame2) {
            frames.push(this.moveSpriteFrame2);
        }

        if (!frames.length && this.moveSpriteFrame) {
            frames.push(this.moveSpriteFrame);
        }

        return frames;
    },

    updateMoveFrame(dt) {
        if (!this.sprite) {
            return;
        }

        const frames = this.getCurrentMoveFrames();
        if (!frames.length) {
            return;
        }

        if (frames.length === 1) {
            if (this.sprite.spriteFrame !== frames[0]) {
                this.sprite.spriteFrame = frames[0];
            }
            return;
        }

        this.moveFrameElapsed += dt;
        if (this.moveFrameElapsed < this.moveFrameInterval) {
            return;
        }

        this.moveFrameElapsed = 0;
        this.moveFrameIndex = (this.moveFrameIndex + 1) % frames.length;
        this.sprite.spriteFrame = frames[this.moveFrameIndex];
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
