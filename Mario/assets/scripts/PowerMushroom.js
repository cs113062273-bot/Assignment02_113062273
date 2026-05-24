const WorldFreezeController = require('WorldFreezeController');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        moveSpeed: {
            default: 90
        },
        emergeHeight: {
            default: 0
        },
        emergeDuration: {
            default: 0.4
        },
        waitAfterEmerge: {
            default: 0.18
        },
        moveDirection: {
            default: 1
        },
        gravityScaleWhenActive: {
            default: 1
        },
        reverseCooldownDuration: {
            default: 0.12
        }
    },

    onLoad() {
        this.game = this.gameNode ? (this.gameNode.getComponent('Game') || this.gameNode.getComponent('SimpleStageController')) : null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.hiddenY = this.node.y;
        this.visibleY = this.hiddenY + this.getDefaultEmergeHeight();
        this.state = 'emerging';
        this.phaseTimer = this.emergeDuration;
        this.reverseCooldown = 0;
        this.isCollected = false;
        this.baseScaleX = Math.abs(this.node.scaleX || 1);

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
            this.body.gravityScale = 0;
            this.body.linearVelocity = cc.v2(0, 0);
        }
    },

    setGameNode(gameNode) {
        this.gameNode = gameNode;
        this.game = gameNode ? (gameNode.getComponent('Game') || gameNode.getComponent('SimpleStageController')) : null;
    },

    spawnFromQuestionBlock(blockNode, gameNode, offsetY) {
        this.setGameNode(gameNode);

        if (!blockNode || !blockNode.parent) {
            this.node.setPosition(this.node.position.x, this.node.position.y + (offsetY || 0));
            this.hiddenY = this.node.y;
            this.visibleY = this.hiddenY + this.getDefaultEmergeHeight();
            return;
        }

        if (this.node.parent !== blockNode.parent) {
            this.node.parent = blockNode.parent;
        }

        const blockPosition = blockNode.position.clone ? blockNode.position.clone() : cc.v2(blockNode.x, blockNode.y);
        const localCenter = blockPosition.add(cc.v2(0, offsetY || 0));
        const emergeHeight = this.getEmergeHeightForBlock(blockNode);

        this.node.setPosition(localCenter);
        this.hiddenY = localCenter.y;
        this.visibleY = this.hiddenY + emergeHeight;
        this.state = 'emerging';
        this.phaseTimer = this.emergeDuration;

        if (this.body) {
            this.body.gravityScale = 0;
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.awake = true;
        }
    },

    update(dt) {
        if (this.isCollected) {
            return;
        }

        if (this.reverseCooldown > 0) {
            this.reverseCooldown -= dt;
        }

        if ((this.game && this.game.isWorldFrozen && this.game.isWorldFrozen()) || WorldFreezeController.isFrozen()) {
            if (this.body) {
                this.body.linearVelocity = cc.v2(0, 0);
            }
            return;
        }

        switch (this.state) {
            case 'emerging':
                this.updateEmerging(dt);
                break;
            case 'waiting':
                this.updateWaiting(dt);
                break;
            case 'moving':
                this.updateMoving();
                break;
            default:
                break;
        }
    },

    updateEmerging(dt) {
        this.phaseTimer -= dt;
        const duration = Math.max(this.emergeDuration, 0.01);
        const progress = cc.misc.clampf(1 - (this.phaseTimer / duration), 0, 1);
        this.node.y = this.hiddenY + ((this.visibleY - this.hiddenY) * progress);

        if (this.phaseTimer > 0) {
            return;
        }

        this.node.y = this.visibleY;
        this.state = 'waiting';
        this.phaseTimer = this.waitAfterEmerge;
    },

    updateWaiting(dt) {
        this.phaseTimer -= dt;
        if (this.phaseTimer > 0) {
            return;
        }

        this.state = 'moving';
        if (this.body) {
            this.body.gravityScale = this.gravityScaleWhenActive;
            this.body.awake = true;
        }
    },

    updateMoving() {
        if (!this.body) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
        this.node.scaleX = this.moveDirection >= 0 ? this.baseScaleX : -this.baseScaleX;
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (this.isCollected || !otherCollider || otherCollider.sensor) {
            return;
        }

        const player = otherCollider.node.getComponent('SimplePlayerController');
        if (player) {
            this.collect(player);
            return;
        }

        if (this.state !== 'moving') {
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
        this.reverseCooldown = this.reverseCooldownDuration;
    },

    getDefaultEmergeHeight() {
        if (this.emergeHeight > 0) {
            return this.emergeHeight;
        }

        return Math.max(this.node.height || 16, 16);
    },

    getEmergeHeightForBlock(blockNode) {
        if (this.emergeHeight > 0) {
            return this.emergeHeight;
        }

        const blockHeight = blockNode && blockNode.height ? blockNode.height : 16;
        const mushroomHeight = this.node.height || 16;
        return Math.max((blockHeight * 0.5) + (mushroomHeight * 0.5), 16);
    },

    collect(player) {
        if (this.isCollected) {
            return;
        }

        this.isCollected = true;

        if (this.game && this.game.collectPowerUp) {
            this.game.collectPowerUp();
        }

        if (player && player.growBig) {
            player.growBig();
        }

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.enabled = false;
        }

        const colliders = this.node.getComponents(cc.PhysicsCollider);
        for (let i = 0; i < colliders.length; i += 1) {
            colliders[i].enabled = false;
        }

        this.node.destroy();
    }
});
