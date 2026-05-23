const GoombaController = require('GoombaController');
const QuestionBlock = require('QuestionBlock');
const PowerMushroom = require('PowerMushroom');
const GoalPole = require('GoalPole');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        spawnPoint: cc.Node,
        smallAtlas: cc.SpriteAtlas,
        bigAtlas: cc.SpriteAtlas,
        moveSpeed: 220,
        jumpSpeed: 720,
        groundCheckDistance: 8
    },

    onLoad() {
        this.game = null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.groundContacts = 0;
        this.groundContactIds = new Set();
        this.leftWallContacts = new Set();
        this.rightWallContacts = new Set();
        this.isGrounded = false;
        this.keys = { left: false, right: false };
        this.jumpQueued = false;
        this.isBig = false;
        this.controlEnabled = false;
        this.facing = 1;
        this.animTimer = 0;

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);
    },

    setGame(game) {
        this.game = game;
    },

    resetPlayer() {
        const spawn = this.spawnPoint ? this.spawnPoint.position : cc.v3(120, 140, 0);
        this.node.setPosition(spawn);
        this.node.angle = 0;
        this.node.scaleX = 1;
        this.node.active = true;
        this.groundContacts = 0;
        this.groundContactIds.clear();
        this.leftWallContacts.clear();
        this.rightWallContacts.clear();
        this.isGrounded = false;
        this.isBig = false;
        this.facing = 1;
        this.animTimer = 0;
        this.updateSprite();
        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.angularVelocity = 0;
            this.body.awake = true;
        }
    },

    enableControl(enabled) {
        this.controlEnabled = enabled;
        this.keys.left = false;
        this.keys.right = false;
        this.jumpQueued = false;
        if (!enabled && this.body) {
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
        }
    },

    update(dt) {
        if (!this.controlEnabled || !this.body) {
            return;
        }

        this.animTimer += dt;
        this.isGrounded = this.checkGrounded();

        let vx = 0;
        if (this.keys.left) {
            vx -= this.moveSpeed;
            this.facing = -1;
        }
        if (this.keys.right) {
            vx += this.moveSpeed;
            this.facing = 1;
        }

        if (vx < 0 && this.leftWallContacts.size > 0) {
            vx = 0;
        } else if (vx > 0 && this.rightWallContacts.size > 0) {
            vx = 0;
        }

        const velocity = this.body.linearVelocity;
        this.body.linearVelocity = cc.v2(vx, velocity.y);

        if (this.jumpQueued && this.isGrounded) {
            this.body.linearVelocity = cc.v2(vx, this.jumpSpeed);
            if (this.game) {
                this.game.playJump();
            }
        }
        this.jumpQueued = false;

        this.node.scaleX = this.facing;
        this.updateSprite();

        if (this.node.y < -120 && this.game) {
            this.game.loseLife();
        }
    },

    updateSprite() {
        const atlas = this.isBig ? this.bigAtlas : this.smallAtlas;
        if (!atlas || !this.sprite) {
            return;
        }

        const idle = this.isBig ? 'mario_big_0.png' : 'mario_small_0.png';
        const walkFrames = this.isBig
            ? ['mario_big_1.png', 'mario_big_2.png', 'mario_big_3.png']
            : ['mario_small_1.png', 'mario_small_2.png', 'mario_small_3.png'];
        const jump = this.isBig ? 'mario_big_10.png' : 'mario_small_10.png';

        let frameName = idle;
        const velocity = this.body ? this.body.linearVelocity : cc.v2();
        if (!this.isGrounded) {
            frameName = jump;
        } else if (Math.abs(velocity.x) > 20) {
            frameName = walkFrames[Math.floor(this.animTimer * 10) % walkFrames.length];
        }

        const frame = atlas.getSpriteFrame(frameName);
        if (frame) {
            this.sprite.spriteFrame = frame;
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
            case cc.macro.KEY.space:
                this.jumpQueued = true;
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

    onBeginContact(contact, selfCollider, otherCollider) {
        const otherNode = otherCollider.node;
        const enemy = otherNode.getComponent(GoombaController);
        const block = otherNode.getComponent(QuestionBlock);
        const mushroom = otherNode.getComponent(PowerMushroom);
        const goal = otherNode.getComponent(GoalPole);

        if (enemy) {
            const myBottom = this.node.y - (this.node.height * this.node.anchorY || 0);
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

        const normal = contact.getWorldManifold().normal;
        if (normal.y > 0.4) {
            const contactId = this.getGroundContactId(otherCollider);
            if (!this.groundContactIds.has(contactId)) {
                this.groundContactIds.add(contactId);
                this.groundContacts = this.groundContactIds.size;
            }
        }
        if (normal.x > 0.4) {
            this.leftWallContacts.add(this.getContactId(otherCollider));
        } else if (normal.x < -0.4) {
            this.rightWallContacts.add(this.getContactId(otherCollider));
        }

        if (block && normal.y < -0.4) {
            block.hitFromBelow();
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

        const contactId = this.getGroundContactId(otherCollider);
        if (this.groundContactIds.delete(contactId)) {
            this.groundContacts = this.groundContactIds.size;
        }
        this.leftWallContacts.delete(this.getContactId(otherCollider));
        this.rightWallContacts.delete(this.getContactId(otherCollider));
    },

    getGroundContactId(collider) {
        return this.getContactId(collider);
    },

    getContactId(collider) {
        const nodeId = collider && collider.node ? collider.node.uuid : 'unknown-node';
        const tag = collider ? collider.tag : 'unknown-tag';
        return `${nodeId}:${tag}`;
    },

    checkGrounded() {
        const physicsManager = cc.director.getPhysicsManager();
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!physicsManager || !physicsManager.enabled || !collider) {
            return this.groundContacts > 0;
        }

        const halfWidth = (collider.size.width * Math.abs(this.node.scaleX)) / 2 - 2;
        const halfHeight = (collider.size.height * Math.abs(this.node.scaleY)) / 2;
        const checkDistance = Math.max(2, this.groundCheckDistance);
        const footOffsets = [-halfWidth, 0, halfWidth];

        for (let i = 0; i < footOffsets.length; i += 1) {
            const start = this.node.convertToWorldSpaceAR(cc.v2(footOffsets[i], -halfHeight + 1));
            const end = cc.v2(start.x, start.y - checkDistance);
            const hits = physicsManager.rayCast(start, end, cc.RayCastType.Closest);
            if (hits.some((hit) => hit.collider !== collider && !hit.collider.sensor)) {
                return true;
            }
        }

        return false;
    },

    growBig() {
        this.isBig = true;
        this.updateSprite();
    }
});
