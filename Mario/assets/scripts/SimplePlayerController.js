const GoombaController = require('GoombaController');
const QuestionBlock = require('QuestionBlock');
const PowerMushroom = require('PowerMushroom');
const GoalPole = require('GoalPole');

cc.Class({
    extends: cc.Component,

    properties: {
        spawnPoint: cc.Node,
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
        this.game = null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.keys = {
            left: false,
            right: false
        };
        this.groundContacts = 0;
        this.groundContactIds = new Set();
        this.onGround = false;
        this.frameTimer = 0;
        this.frameIndex = 0;
        this.lastWorldX = this.node.x;
        this.controlEnabled = true;
        this.baseScaleX = Math.abs(this.node.scaleX || 1);
        this.baseScaleY = Math.abs(this.node.scaleY || 1);
        this.sizeMultiplier = 1;
        this.spawnPosition = this.spawnPoint ? this.spawnPoint.position.clone() : this.node.position.clone();

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

    setGame(game) {
        this.game = game;
    },

    resetPlayer() {
        const spawn = this.spawnPoint ? this.spawnPoint.position : this.spawnPosition;
        this.node.setPosition(spawn);
        this.node.angle = 0;
        this.sizeMultiplier = 1;
        this.node.scaleX = this.baseScaleX;
        this.node.scaleY = this.baseScaleY;
        this.keys.left = false;
        this.keys.right = false;
        this.groundContacts = 0;
        this.groundContactIds.clear();
        this.onGround = false;
        this.frameTimer = 0;
        this.frameIndex = 0;
        this.lastWorldX = this.node.x;
        this.node.active = true;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.angularVelocity = 0;
            this.body.awake = true;
        }

        if (this.sprite && this.runFrames.length > 0) {
            this.sprite.spriteFrame = this.runFrames[0];
        }
    },

    enableControl(enabled) {
        this.controlEnabled = enabled;
        this.keys.left = false;
        this.keys.right = false;

        if (!enabled && this.body) {
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
        }
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);
    },

    update(dt) {
        if (!this.body) {
            return;
        }

        const movedX = dt > 0 ? (this.node.x - this.lastWorldX) / dt : 0;
        this.lastWorldX = this.node.x;
        this.onGround = this.groundContactIds.size > 0;

        if (!this.controlEnabled) {
            this.updateAnimation(0);
            return;
        }

        let vx = 0;
        if (this.keys.left) {
            vx -= this.moveSpeed;
            this.node.scaleX = -this.baseScaleX * this.sizeMultiplier;
        }
        if (this.keys.right) {
            vx += this.moveSpeed;
            this.node.scaleX = this.baseScaleX * this.sizeMultiplier;
        }

        this.body.linearVelocity = cc.v2(vx, this.body.linearVelocity.y);
        this.updateAnimation(movedX);

        if (this.node.y < -120 && this.game) {
            this.game.loseLife();
        }
    },

    onKeyDown(event) {
        if (!this.controlEnabled) {
            return;
        }

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
        this.groundContactIds.clear();
        this.onGround = false;
    },

    isGroundContact(contact) {
        const normal = contact.getWorldManifold().normal;
        return Math.abs(normal.y) > 0.4;
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        const otherNode = otherCollider.node;
        const enemy = otherNode.getComponent(GoombaController);
        const block = otherNode.getComponent(QuestionBlock);
        const mushroom = otherNode.getComponent(PowerMushroom);
        const goal = otherNode.getComponent(GoalPole);

        if (enemy) {
            const myBottom = this.node.y - this.node.height * this.node.anchorY;
            const enemyTop = enemy.node.y + enemy.node.height / 2;
            const falling = this.body && this.body.linearVelocity.y < -10;

            if (falling && myBottom > enemyTop - 8) {
                enemy.stomp();
                this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed * 0.55);
                if (this.game) {
                    this.game.stompEnemy();
                }
            } else if (this.game) {
                this.game.loseLife();
            }
            return;
        }

        if (mushroom) {
            mushroom.collect(this);
            return;
        }

        if (goal) {
            if (this.game) {
                this.game.clearLevel();
            }
            return;
        }

        if (otherCollider && !otherCollider.sensor && this.isGroundContact(contact)) {
            const contactId = this.getContactId(otherCollider);
            this.groundContactIds.add(contactId);
            this.groundContacts = this.groundContactIds.size;
            this.onGround = true;
        }

        if (block) {
            const normal = contact.getWorldManifold().normal;
            if (normal.y > 0.4 && this.body && this.body.linearVelocity.y > 0) {
                block.hitFromBelow();
            }
        }
    },

    onEndContact(contact, selfCollider, otherCollider) {
        const otherNode = otherCollider.node;
        const enemy = otherNode.getComponent(GoombaController);
        const mushroom = otherNode.getComponent(PowerMushroom);
        const goal = otherNode.getComponent(GoalPole);
        if (enemy || mushroom || goal) {
            return;
        }

        if (otherCollider && !otherCollider.sensor && this.isGroundContact(contact)) {
            const contactId = this.getContactId(otherCollider);
            this.groundContactIds.delete(contactId);
            this.groundContacts = this.groundContactIds.size;
            this.onGround = this.groundContactIds.size > 0;
        }
    },

    updateAnimation(actualSpeedX) {
        if (!this.sprite) {
            return;
        }

        if (!this.onGround) {
            this.updateJumpAnimation();
            return;
        }

        this.updateRunAnimation(actualSpeedX);
    },

    updateRunAnimation(actualSpeedX) {
        if (this.runFrames.length === 0) {
            return;
        }

        if (Math.abs(actualSpeedX) < 5) {
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
    },

    getContactId(collider) {
        const nodeId = collider && collider.node ? collider.node.uuid : 'unknown-node';
        const tag = collider ? collider.tag : 'unknown-tag';
        return `${nodeId}:${tag}`;
    },

    growBig() {
        this.sizeMultiplier = 1.2;
        const facing = this.node.scaleX < 0 ? -1 : 1;
        this.node.scaleX = this.baseScaleX * this.sizeMultiplier * facing;
        this.node.scaleY = this.baseScaleY * this.sizeMultiplier;
    }
});
