cc.Class({
    extends: cc.Component,

    properties: {
        atlas: cc.SpriteAtlas,
        speed: 90
    },

    onLoad() {
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.direction = -1;
        this.dead = false;
        this.animTimer = 0;
    },

    update(dt) {
        if (this.dead) {
            return;
        }

        this.animTimer += dt;
        if (this.body) {
            this.body.linearVelocity = cc.v2(this.direction * this.speed, this.body.linearVelocity.y);
        }

        if (this.atlas && this.sprite) {
            const frameName = Math.floor(this.animTimer * 8) % 2 === 0 ? 'Goomba_0.png' : 'Goomba_1.png';
            const frame = this.atlas.getSpriteFrame(frameName);
            if (frame) {
                this.sprite.spriteFrame = frame;
            }
        }
    },

    onBeginContact(contact) {
        if (this.dead) {
            return;
        }

        const normal = contact.getWorldManifold().normal;
        if (Math.abs(normal.x) > 0.5) {
            this.direction *= -1;
        }
    },

    stomp() {
        if (this.dead) {
            return;
        }
        this.dead = true;
        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.type = cc.RigidBodyType.Static;
        }
        if (this.atlas && this.sprite) {
            const frame = this.atlas.getSpriteFrame('Goomba_4.png');
            if (frame) {
                this.sprite.spriteFrame = frame;
            }
        }
        this.scheduleOnce(() => {
            this.node.destroy();
        }, 0.6);
    }
});
