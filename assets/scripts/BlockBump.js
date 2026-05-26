cc.Class({
    extends: cc.Component,

    properties: {
        readySpriteFrame: cc.SpriteFrame,
        usedSpriteFrame: cc.SpriteFrame,
        bounceHeight: {
            default: 10
        },
        bounceDuration: {
            default: 0.08
        }
    },

    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        this.homePosition = this.node.position.clone();
        this.used = false;
        this.isBouncing = false;
        this.bounceTimer = 0;

        if (this.sprite && this.readySpriteFrame) {
            this.sprite.spriteFrame = this.readySpriteFrame;
        }
    },

    update(dt) {
        if (!this.isBouncing) {
            return;
        }

        this.bounceTimer += dt;
        const halfDuration = Math.max(this.bounceDuration, 0.01);
        const totalDuration = halfDuration * 2;

        if (this.bounceTimer >= totalDuration) {
            this.finishBounce();
            return;
        }

        let offsetY = 0;
        if (this.bounceTimer <= halfDuration) {
            offsetY = this.bounceHeight * (this.bounceTimer / halfDuration);
        } else {
            const fallProgress = (this.bounceTimer - halfDuration) / halfDuration;
            offsetY = this.bounceHeight * (1 - fallProgress);
        }

        this.setBlockPosition(this.homePosition.y + offsetY);
    },

    tryActivateFromBelow() {
        if (this.used || this.isBouncing) {
            return false;
        }

        this.used = true;
        this.isBouncing = true;
        this.bounceTimer = 0;

        return true;
    },

    finishBounce() {
        this.setBlockPosition(this.homePosition.y);
        if (this.sprite && this.usedSpriteFrame) {
            this.sprite.spriteFrame = this.usedSpriteFrame;
        }
        this.isBouncing = false;
    },

    setBlockPosition(y) {
        this.node.setPosition(this.homePosition.x, y);
    }
});
