const GoombaController = require('GoombaController');
const WorldFreezeController = require('WorldFreezeController');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        walkSpriteFrame1: cc.SpriteFrame,
        walkSpriteFrame2: cc.SpriteFrame,
        shellSpriteFrame1: cc.SpriteFrame,
        shellSpriteFrame2: cc.SpriteFrame,
        moveSpeed: {
            default: 70
        },
        shellSpeed: {
            default: 280
        },
        frameInterval: {
            default: 0.12
        }
    },

    onLoad() {
        this.game = this.gameNode ? this.gameNode.getComponent('Game') : null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.moveDirection = -1;
        this.reverseCooldown = 0;
        this.frameIndex = 0;
        this.frameElapsed = 0;
        this.baseScaleX = Math.abs(this.node.scaleX || 1);
        this.state = 'walking';

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
        }

        this.applyCurrentFrame(0, true);
    },

    update(dt) {
        if (!this.body) {
            return;
        }

        if (this.reverseCooldown > 0) {
            this.reverseCooldown -= dt;
        }

        if ((this.game && this.game.isWorldFrozen && this.game.isWorldFrozen()) || WorldFreezeController.isFrozen()) {
            this.body.linearVelocity = cc.v2(0, 0);
            return;
        }

        if (this.state === 'walking') {
            this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
            this.node.scaleX = this.moveDirection < 0 ? this.baseScaleX : -this.baseScaleX;
        } else if (this.state === 'shellMoving') {
            this.body.linearVelocity = cc.v2(this.moveDirection * this.shellSpeed, this.body.linearVelocity.y);
        } else {
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
        }

        this.applyCurrentFrame(dt);
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        if (!otherCollider || otherCollider.sensor) {
            return;
        }

        const player = otherCollider.node.getComponent('SimplePlayerController');
        if (player) {
            return;
        }

        const goomba = otherCollider.node.getComponent(GoombaController);
        if (goomba && this.state === 'shellMoving') {
            goomba.stomp();
            if (this.game) {
                this.game.stompEnemy();
            }
            return;
        }

        const normal = contact.getWorldManifold().normal;
        const otherX = otherCollider.node.x;
        const collidedOnSide = Math.abs(normal.x) > 0.05;
        const hitWallInFront =
            (this.moveDirection > 0 && otherX >= this.node.x) ||
            (this.moveDirection < 0 && otherX <= this.node.x);

        if (this.state === 'walking' && (collidedOnSide || hitWallInFront)) {
            this.reverseDirection();
            return;
        }

        if (this.state === 'shellMoving' && (collidedOnSide || hitWallInFront)) {
            this.breakShell();
        }
    },

    onPlayerStomp() {
        if (this.state === 'walking') {
            this.enterShellIdle();
            return {
                bounce: true,
                defeatedEnemy: true
            };
        }

        if (this.state === 'shellMoving') {
            this.enterShellIdle();
        }

        return {
            bounce: true,
            defeatedEnemy: false
        };
    },

    onPlayerSideContact(playerNode, normal) {
        const sideContact = !normal || Math.abs(normal.x) > 0.05;

        if (this.state === 'shellIdle' && sideContact) {
            this.kickShell(playerNode);
            return 'kick';
        }

        return 'damage';
    },

    enterShellIdle() {
        this.state = 'shellIdle';
        this.frameIndex = 0;
        this.frameElapsed = 0;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
        }

        this.applyCurrentFrame(0, true);
    },

    kickShell(playerNode) {
        const playerIsOnLeft = playerNode && playerNode.x <= this.node.x;
        this.moveDirection = playerIsOnLeft ? 1 : -1;
        this.state = 'shellMoving';
        this.frameIndex = 0;
        this.frameElapsed = 0;
        this.applyCurrentFrame(0, true);
    },

    reverseDirection(force) {
        if (!force && this.reverseCooldown > 0) {
            return;
        }

        this.moveDirection *= -1;
        this.reverseCooldown = 0.1;

        if (!this.body) {
            return;
        }

        if (this.state === 'walking') {
            this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
            this.node.scaleX = this.moveDirection < 0 ? this.baseScaleX : -this.baseScaleX;
            return;
        }

        if (this.state === 'shellMoving') {
            this.body.linearVelocity = cc.v2(this.moveDirection * this.shellSpeed, this.body.linearVelocity.y);
        }
    },

    breakShell() {
        if (!cc.isValid(this.node)) {
            return;
        }

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
        }

        this.node.destroy();
    },

    getFramesForState() {
        if (this.state === 'walking') {
            return this.collectFrames(this.walkSpriteFrame1, this.walkSpriteFrame2);
        }

        if (this.state === 'shellMoving') {
            return this.collectFrames(this.shellSpriteFrame1, this.shellSpriteFrame2);
        }

        return this.shellSpriteFrame1 ? [this.shellSpriteFrame1] : [];
    },

    collectFrames(frame1, frame2) {
        const frames = [];

        if (frame1) {
            frames.push(frame1);
        }

        if (frame2) {
            frames.push(frame2);
        }

        return frames;
    },

    applyCurrentFrame(dt, force) {
        if (!this.sprite) {
            return;
        }

        const frames = this.getFramesForState();
        if (!frames.length) {
            return;
        }

        if (frames.length === 1) {
            if (force || this.sprite.spriteFrame !== frames[0]) {
                this.sprite.spriteFrame = frames[0];
            }
            return;
        }

        if (force) {
            this.sprite.spriteFrame = frames[this.frameIndex];
            return;
        }

        this.frameElapsed += dt;
        if (this.frameElapsed < this.frameInterval) {
            return;
        }

        this.frameElapsed = 0;
        this.frameIndex = (this.frameIndex + 1) % frames.length;
        this.sprite.spriteFrame = frames[this.frameIndex];
    }
});
