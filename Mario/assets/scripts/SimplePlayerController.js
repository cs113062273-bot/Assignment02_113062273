cc.Class({
    extends: cc.Component,

    properties: {
        moveSpeed: {
            default: 220
        },
        jumpSpeed: {
            default: 720
        },
        runFrames: {
            default: [],
            type: [cc.SpriteFrame]
        },
        jumpFrames: {
            default: [],
            type: [cc.SpriteFrame]
        },
        frameInterval: {
            default: 0.08
        }
    },

    onLoad() {
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.keys = {
            left: false,
            right: false
        };
        this.groundContacts = 0;
        this.onGround = false;
        this.frameTimer = 0;
        this.frameIndex = 0;

        if (this.body) {
            this.body.enabledContactListener = true;
        }

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);

        if (this.sprite && this.runFrames.length > 0) {
            this.sprite.spriteFrame = this.runFrames[0];
        }
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);
    },

    update() {
        if (!this.body) {
            return;
        }

        let vx = 0;
        if (this.keys.left) {
            vx -= this.moveSpeed;
            this.node.scaleX = -Math.abs(this.node.scaleX || 1);
        }
        if (this.keys.right) {
            vx += this.moveSpeed;
            this.node.scaleX = Math.abs(this.node.scaleX || 1);
        }

        this.body.linearVelocity = cc.v2(vx, this.body.linearVelocity.y);
        this.updateAnimation(vx);
    },

    onKeyDown(event) {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.keys.left = true;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.keys.right = true;
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
                this.tryJump();
                break;
            default:
                break;
        }
    },

    onKeyUp(event) {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.keys.left = false;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.keys.right = false;
                break;
            default:
                break;
        }
    },

    tryJump() {
        if (!this.body || !this.onGround) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed);
        this.groundContacts = 0;
        this.onGround = false;
    },

    isGroundContact(contact) {
        const normal = contact.getWorldManifold().normal;
        return Math.abs(normal.y) > 0.4;
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (otherCollider && !otherCollider.sensor && this.isGroundContact(contact)) {
            this.groundContacts += 1;
            this.onGround = true;
        }
    },

    onEndContact(contact, selfCollider, otherCollider) {
        if (otherCollider && !otherCollider.sensor && this.isGroundContact(contact)) {
            this.groundContacts = Math.max(0, this.groundContacts - 1);
            this.onGround = this.groundContacts > 0;
        }
    },

    updateAnimation(vx) {
        if (!this.sprite) {
            return;
        }

        if (!this.onGround) {
            this.updateJumpAnimation();
            return;
        }

        this.updateRunAnimation(vx);
    },

    updateRunAnimation(vx) {
        if (this.runFrames.length === 0) {
            return;
        }

        if (Math.abs(vx) < 1) {
            this.frameTimer = 0;
            this.frameIndex = 0;
            this.sprite.spriteFrame = this.runFrames[0];
            return;
        }

        this.frameTimer += cc.director.getDeltaTime();
        if (this.frameTimer < this.frameInterval) {
            return;
        }

        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % this.runFrames.length;
        this.sprite.spriteFrame = this.runFrames[this.frameIndex];
    },

    updateJumpAnimation() {
        if (!this.body || this.jumpFrames.length === 0) {
            return;
        }

        const vy = this.body.linearVelocity.y;

        if (this.jumpFrames.length === 1) {
            this.sprite.spriteFrame = this.jumpFrames[0];
            return;
        }

        if (this.jumpFrames.length === 2) {
            this.sprite.spriteFrame = vy >= 0 ? this.jumpFrames[0] : this.jumpFrames[1];
            return;
        }

        if (vy > 30) {
            this.sprite.spriteFrame = this.jumpFrames[0];
        } else if (vy < -30) {
            this.sprite.spriteFrame = this.jumpFrames[2];
        } else {
            this.sprite.spriteFrame = this.jumpFrames[1];
        }
    }
});
