const WorldFreezeController = require('WorldFreezeController');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        pipeNode: cc.Node,
        pipeSpriteFrame: cc.SpriteFrame,
        closedSpriteFrame: cc.SpriteFrame,
        openSpriteFrame: cc.SpriteFrame,
        emergeHeight: {
            default: 64
        },
        moveDuration: {
            default: 0.8
        },
        waitAtTop: {
            default: 1
        },
        waitAtBottom: {
            default: 1
        },
        damageCooldown: {
            default: 0.2
        }
    },

    onLoad() {
        this.game = this.gameNode ? (this.gameNode.getComponent('Game') || this.gameNode.getComponent('SimpleStageController')) : null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.pipeSprite = this.pipeNode ? this.pipeNode.getComponent(cc.Sprite) : null;
        this.hiddenY = this.node.y;
        this.visibleY = this.hiddenY + this.emergeHeight;
        this.phase = 'wait-bottom';
        this.phaseTimer = this.waitAtBottom;
        this.damageLocked = false;

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
            this.body.gravityScale = 0;
            this.body.linearVelocity = cc.v2(0, 0);
        }

        if (this.pipeSprite && this.pipeSpriteFrame) {
            this.pipeSprite.spriteFrame = this.pipeSpriteFrame;
        }

        this.applyFlowerSprite(false);
        this.node.y = this.hiddenY;
    },

    update(dt) {
        if ((this.game && this.game.isWorldFrozen && this.game.isWorldFrozen()) || WorldFreezeController.isFrozen()) {
            return;
        }

        switch (this.phase) {
            case 'wait-bottom':
                this.runWaitPhase(dt, 'rising');
                break;
            case 'rising':
                this.runMovePhase(dt, this.hiddenY, this.visibleY, 'wait-top', true);
                break;
            case 'wait-top':
                this.runWaitPhase(dt, 'falling');
                break;
            case 'falling':
                this.runMovePhase(dt, this.visibleY, this.hiddenY, 'wait-bottom', false);
                break;
            default:
                break;
        }
    },

    runWaitPhase(dt, nextPhase) {
        this.phaseTimer -= dt;
        if (this.phaseTimer > 0) {
            return;
        }

        this.phase = nextPhase;
        this.phaseTimer = this.moveDuration;
    },

    runMovePhase(dt, startY, endY, nextPhase, isOpen) {
        this.phaseTimer -= dt;
        const duration = Math.max(this.moveDuration, 0.01);
        const progress = cc.misc.clampf(1 - (this.phaseTimer / duration), 0, 1);
        this.node.y = startY + ((endY - startY) * progress);
        this.applyFlowerSprite(isOpen);

        if (this.phaseTimer > 0) {
            return;
        }

        this.node.y = endY;
        this.phase = nextPhase;
        this.phaseTimer = nextPhase === 'wait-top' ? this.waitAtTop : this.waitAtBottom;
        this.applyFlowerSprite(nextPhase === 'wait-top');
    },

    applyFlowerSprite(isOpen) {
        if (!this.sprite) {
            return;
        }

        if (isOpen && this.openSpriteFrame) {
            this.sprite.spriteFrame = this.openSpriteFrame;
            return;
        }

        if (!isOpen && this.closedSpriteFrame) {
            this.sprite.spriteFrame = this.closedSpriteFrame;
        }
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (this.damageLocked || !otherCollider || otherCollider.sensor) {
            return;
        }

        const player = otherCollider.node.getComponent('SimplePlayerController');
        if (!player) {
            return;
        }

        this.damageLocked = true;
        player.takeDamage(this.node);

        this.scheduleOnce(() => {
            this.damageLocked = false;
        }, this.damageCooldown);
    }
});
