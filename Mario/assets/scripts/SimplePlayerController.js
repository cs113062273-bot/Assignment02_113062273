const GoombaController = require('GoombaController');
const TurtleController = require('TurtleController');
const FlowerController = require('FlowerController');
const QuestionBlock = require('QuestionBlock');
const GoalPole = require('GoalPole');
const OneWayPlatform = require('OneWayPlatform');
const WorldFreezeController = require('WorldFreezeController');

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
        bigRunFrames: {
            default: [],
            type: [cc.SpriteFrame]
        },
        bigJumpFrames: {
            default: [],
            type: [cc.SpriteFrame]
        },
        frameInterval: {
            default: 0.08
        },
        transformDuration: {
            default: 0.75
        },
        transformBlinkInterval: {
            default: 0.08
        },
        bigVisualSize: {
            default() {
                return cc.size(0, 0);
            },
            type: cc.Size
        },
        bigColliderOffset: {
            default() {
                return cc.v2(0, 0);
            },
            type: cc.Vec2
        },
        bigColliderSize: {
            default() {
                return cc.size(0, 0);
            },
            type: cc.Size
        }
    },

    onLoad() {
        this.game = null;
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);
        this.boxCollider = this.getComponent(cc.PhysicsBoxCollider);
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
        this.damageBlinkTimer = 0;
        this.damageBlinkDuration = 0;
        this.blinkVisible = true;
        this.localWorldFrozen = false;
        this.freezeDuration = 1;
        this.cachedGravity = cc.v2(0, -2000);
        this.baseScaleX = Math.abs(this.node.scaleX || 1);
        this.baseScaleY = Math.abs(this.node.scaleY || 1);
        this.currentForm = 'small';
        this.isTransforming = false;
        this.transformElapsed = 0;
        this.transformPreviewForm = 'small';
        this.startedWorldFreeze = false;
        this.spawnPosition = this.spawnPoint ? this.spawnPoint.position.clone() : this.node.position.clone();
        this.smallVisualSize = this.cloneSize(this.node.getContentSize ? this.node.getContentSize() : cc.size(this.node.width, this.node.height));
        this.smallColliderOffset = this.boxCollider ? this.cloneVec2(this.boxCollider.offset) : cc.v2(0, 0);
        this.smallColliderSize = this.boxCollider ? this.cloneSize(this.boxCollider.size) : cc.size(0, 0);
        this.currentWorldBounds = this.node.getBoundingBoxToWorld();
        this.previousWorldBounds = cc.rect(
            this.currentWorldBounds.x,
            this.currentWorldBounds.y,
            this.currentWorldBounds.width,
            this.currentWorldBounds.height
        );
        this.oneWayContacts = new Map();
        this.activeOneWayGroundId = null;

        if (this.body) {
            this.body.enabledContactListener = true;
        }

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp);

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }

        this.applyForm('small', false);
    },

    setGame(game) {
        this.game = game;
    },

    resetPlayer() {
        const spawn = this.spawnPoint ? this.spawnPoint.position : this.spawnPosition;
        this.node.setPosition(spawn);
        this.node.angle = 0;
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
        this.setSpriteVisible(true);
        this.damageBlinkTimer = 0;
        this.damageBlinkDuration = 0;
        this.blinkVisible = true;
        this.localWorldFrozen = false;
        this.isTransforming = false;
        this.transformElapsed = 0;
        this.transformPreviewForm = 'small';
        this.startedWorldFreeze = false;
        this.currentWorldBounds = this.node.getBoundingBoxToWorld();
        this.previousWorldBounds = cc.rect(
            this.currentWorldBounds.x,
            this.currentWorldBounds.y,
            this.currentWorldBounds.width,
            this.currentWorldBounds.height
        );
        this.oneWayContacts.clear();
        this.activeOneWayGroundId = null;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.angularVelocity = 0;
            this.body.awake = true;
        }

        this.applyForm('small', false);
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

        if (this.startedWorldFreeze) {
            this.startedWorldFreeze = false;
            this.resumePhysics();
            WorldFreezeController.end();
        }
    },

    update(dt) {
        this.updateDamageBlink(dt);
        this.updateTransformBlink(dt);
        this.previousWorldBounds = this.cloneRect(this.currentWorldBounds || this.node.getBoundingBoxToWorld());
        this.currentWorldBounds = this.node.getBoundingBoxToWorld();

        if (!this.body) {
            return;
        }

        if (this.isWorldFrozen()) {
            if (this.body) {
                this.body.linearVelocity = cc.v2(0, 0);
            }
            this.lastWorldX = this.node.x;
            this.updateAnimation(0);
            return;
        }

        const movedX = dt > 0 ? (this.node.x - this.lastWorldX) / dt : 0;
        this.lastWorldX = this.node.x;
        this.resolveOneWayPlatformSupport();
        this.onGround = this.groundContactIds.size > 0 || !!this.activeOneWayGroundId;

        if (!this.controlEnabled) {
            this.updateAnimation(0);
            return;
        }

        let vx = 0;
        if (this.keys.left) {
            vx -= this.moveSpeed;
            this.node.scaleX = -this.baseScaleX;
        }
        if (this.keys.right) {
            vx += this.moveSpeed;
            this.node.scaleX = this.baseScaleX;
        }

        this.body.linearVelocity = cc.v2(vx, this.body.linearVelocity.y);
        this.updateAnimation(movedX);
    },

    isWorldFrozen() {
        const gameFrozen = this.game && this.game.isWorldFrozen && this.game.isWorldFrozen();
        return !!gameFrozen || this.localWorldFrozen || WorldFreezeController.isFrozen();
    },

    takeDamage() {
        if (this.game && this.game.loseLife) {
            this.game.loseLife();
            return;
        }

        if (this.localWorldFrozen) {
            return;
        }

        this.localWorldFrozen = true;
        this.cachePhysicsGravity();
        this.pausePhysics();
        this.enableControl(false);
        this.beginDamageBlink(this.freezeDuration);

        this.scheduleOnce(() => {
            this.resumePhysics();
            this.localWorldFrozen = false;
            this.enableControl(true);
        }, this.freezeDuration);
    },

    cachePhysicsGravity() {
        const physicsManager = cc.director.getPhysicsManager();
        if (physicsManager && physicsManager.gravity) {
            this.cachedGravity = physicsManager.gravity.clone ? physicsManager.gravity.clone() : cc.v2(physicsManager.gravity.x, physicsManager.gravity.y);
        }
    },

    pausePhysics() {
        const physicsManager = cc.director.getPhysicsManager();
        if (physicsManager) {
            physicsManager.enabled = false;
        }
    },

    resumePhysics() {
        const physicsManager = cc.director.getPhysicsManager();
        if (physicsManager) {
            physicsManager.enabled = true;
            physicsManager.gravity = this.cachedGravity || cc.v2(0, -2000);
        }
    },

    beginDamageBlink(duration) {
        this.damageBlinkTimer = 0;
        this.damageBlinkDuration = duration;
        this.blinkVisible = false;
        this.setSpriteVisible(false);
    },

    updateDamageBlink(dt) {
        if (!this.sprite || this.damageBlinkDuration <= 0 || this.isTransforming) {
            return;
        }

        this.damageBlinkTimer += dt;
        const shouldShow = Math.floor(this.damageBlinkTimer * 12) % 2 === 0;
        if (shouldShow !== this.blinkVisible) {
            this.blinkVisible = shouldShow;
            this.setSpriteVisible(shouldShow);
        }

        if (this.damageBlinkTimer >= this.damageBlinkDuration) {
            this.damageBlinkTimer = 0;
            this.damageBlinkDuration = 0;
            this.blinkVisible = true;
            this.setSpriteVisible(true);
        }
    },

    setSpriteVisible(visible) {
        if (this.sprite) {
            this.sprite.enabled = visible;
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

    isBlockHitFromBelow(contact, blockNode) {
        if (!this.body || this.body.linearVelocity.y <= 0 || !blockNode) {
            return false;
        }

        const normal = contact.getWorldManifold().normal;
        if (normal.y > 0.3) {
            return true;
        }

        const playerBounds = this.node.getBoundingBoxToWorld();
        const blockBounds = blockNode.getBoundingBoxToWorld();

        const playerLeft = playerBounds.x;
        const playerRight = playerBounds.x + playerBounds.width;
        const playerTop = playerBounds.y + playerBounds.height;
        const blockLeft = blockBounds.x;
        const blockRight = blockBounds.x + blockBounds.width;
        const blockBottom = blockBounds.y;

        const horizontalOverlap = playerRight > blockLeft + 2 && playerLeft < blockRight - 2;
        const isUnderBlock = playerTop <= blockBottom + 8;

        return horizontalOverlap && isUnderBlock;
    },

    onBeginContact(contact, selfCollider, otherCollider) {
        const otherNode = otherCollider.node;
        const goomba = otherNode.getComponent(GoombaController);
        const turtle = otherNode.getComponent(TurtleController);
        const flower = otherNode.getComponent(FlowerController);
        const block = otherNode.getComponent(QuestionBlock);
        const goal = otherNode.getComponent(GoalPole);
        const oneWayPlatform = otherNode.getComponent(OneWayPlatform);

        if (turtle) {
            const falling = this.body && this.body.linearVelocity.y < -10;
            const normal = contact.getWorldManifold().normal;
            const stompedFromAbove = normal.y < -0.3;

            if (stompedFromAbove && (falling || turtle.state !== 'walking')) {
                const stompResult = turtle.onPlayerStomp ? turtle.onPlayerStomp() : null;
                if (this.body) {
                    this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed * 0.55);
                }
                if (stompResult && stompResult.defeatedEnemy && this.game) {
                    this.game.stompEnemy();
                }
            } else {
                const sideResult = turtle.onPlayerSideContact ? turtle.onPlayerSideContact(this.node, normal) : 'damage';
                if (sideResult === 'damage') {
                    this.takeDamage();
                }
            }
            return;
        }

        if (goomba) {
            const falling = this.body && this.body.linearVelocity.y < -10;
            const normal = contact.getWorldManifold().normal;
            const stompedFromAbove = normal.y < -0.3;

            if (falling && stompedFromAbove) {
                goomba.stomp();
                this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed * 0.55);
                if (this.game) {
                    this.game.stompEnemy();
                }
            } else {
                this.takeDamage();
            }
            return;
        }

        if (flower) {
            this.takeDamage();
            return;
        }

        if (oneWayPlatform) {
            this.oneWayContacts.set(this.getContactId(otherCollider), {
                collider: otherCollider,
                platform: oneWayPlatform
            });
            return;
        }

        if (goal) {
            const justTriggered = goal.triggerGoal ? goal.triggerGoal() : true;
            if (justTriggered && this.game) {
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
            if (this.isBlockHitFromBelow(contact, otherNode)) {
                block.hitFromBelow();
            }
        }
    },

    onEndContact(contact, selfCollider, otherCollider) {
        const otherNode = otherCollider.node;
        const goomba = otherNode.getComponent(GoombaController);
        const turtle = otherNode.getComponent(TurtleController);
        const flower = otherNode.getComponent(FlowerController);
        const goal = otherNode.getComponent(GoalPole);
        const oneWayPlatform = otherNode.getComponent(OneWayPlatform);
        if (goomba || turtle || flower || goal) {
            return;
        }

        if (oneWayPlatform) {
            const contactId = this.getContactId(otherCollider);
            this.oneWayContacts.delete(contactId);
            if (this.activeOneWayGroundId === contactId) {
                this.activeOneWayGroundId = null;
            }
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
        const runFrames = this.getRunFramesForCurrentForm();
        if (runFrames.length === 0) {
            return;
        }

        if (Math.abs(actualSpeedX) < 5) {
            this.frameTimer = 0;
            this.frameIndex = 0;
            this.sprite.spriteFrame = runFrames[0];
            return;
        }

        this.frameTimer += cc.director.getDeltaTime();
        if (this.frameTimer < this.frameInterval) {
            return;
        }

        this.frameTimer = 0;
        this.frameIndex = (this.frameIndex + 1) % runFrames.length;
        this.sprite.spriteFrame = runFrames[this.frameIndex];
    },

    updateJumpAnimation() {
        const jumpFrames = this.getJumpFramesForCurrentForm();
        if (!this.body || jumpFrames.length === 0) {
            return;
        }

        const vy = this.body.linearVelocity.y;

        if (jumpFrames.length === 1) {
            this.sprite.spriteFrame = jumpFrames[0];
            return;
        }

        if (jumpFrames.length === 2) {
            this.sprite.spriteFrame = vy >= 0 ? jumpFrames[0] : jumpFrames[1];
            return;
        }

        if (vy > 30) {
            this.sprite.spriteFrame = jumpFrames[0];
        } else if (vy < -30) {
            this.sprite.spriteFrame = jumpFrames[2];
        } else {
            this.sprite.spriteFrame = jumpFrames[1];
        }
    },

    getContactId(collider) {
        const nodeId = collider && collider.node ? collider.node.uuid : 'unknown-node';
        const tag = collider ? collider.tag : 'unknown-tag';
        return `${nodeId}:${tag}`;
    },

    growBig() {
        if (this.isTransforming || this.currentForm === 'big') {
            return;
        }

        this.isTransforming = true;
        this.transformElapsed = 0;
        this.transformPreviewForm = 'small';
        this.enableControl(false);
        this.cachePhysicsGravity();
        this.pausePhysics();
        WorldFreezeController.begin();
        this.startedWorldFreeze = true;
        this.localWorldFrozen = true;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.angularVelocity = 0;
        }

        this.applyForm('small', false);
        this.scheduleOnce(this.finishGrowBig.bind(this), this.transformDuration);
    },

    finishGrowBig() {
        this.isTransforming = false;
        this.transformElapsed = 0;
        this.transformPreviewForm = 'big';
        this.resumePhysics();
        this.scheduleOnce(() => {
            this.applyForm('big', true);

            if (this.body) {
                this.body.awake = true;
            }

            this.localWorldFrozen = false;
            WorldFreezeController.end();
            this.startedWorldFreeze = false;
            this.enableControl(true);
        }, 0);
    },

    updateTransformBlink(dt) {
        if (!this.isTransforming) {
            return;
        }

        this.transformElapsed += dt;
        const blinkStep = Math.floor(this.transformElapsed / Math.max(this.transformBlinkInterval, 0.01));
        const nextForm = blinkStep % 2 === 0 ? 'small' : 'big';
        if (nextForm === this.transformPreviewForm) {
            return;
        }

        this.transformPreviewForm = nextForm;
        this.applyForm(nextForm, true);
    },

    getCurrentWorldBounds() {
        return this.currentWorldBounds || this.node.getBoundingBoxToWorld();
    },

    getPreviousWorldBounds() {
        return this.previousWorldBounds || this.getCurrentWorldBounds();
    },

    cloneRect(rect) {
        return cc.rect(rect.x, rect.y, rect.width, rect.height);
    },

    cloneSize(size) {
        return cc.size(size.width, size.height);
    },

    cloneVec2(vec) {
        return cc.v2(vec.x, vec.y);
    },

    getRunFramesForCurrentForm() {
        if (this.currentForm === 'big' && this.bigRunFrames.length > 0) {
            return this.bigRunFrames;
        }

        return this.runFrames;
    },

    getJumpFramesForCurrentForm() {
        if (this.currentForm === 'big' && this.bigJumpFrames.length > 0) {
            return this.bigJumpFrames;
        }

        return this.jumpFrames;
    },

    getConfiguredBigVisualSize() {
        if (this.bigVisualSize.width > 0 && this.bigVisualSize.height > 0) {
            return this.cloneSize(this.bigVisualSize);
        }

        const fallbackFrame = this.bigRunFrames[0] || this.bigJumpFrames[0];
        if (fallbackFrame) {
            const rawSize = fallbackFrame.getOriginalSize ? fallbackFrame.getOriginalSize() : null;
            if (rawSize && rawSize.width > 0 && rawSize.height > 0) {
                return this.cloneSize(rawSize);
            }
        }

        return this.cloneSize(this.smallVisualSize);
    },

    getConfiguredBigColliderSize() {
        if (this.bigColliderSize.width > 0 && this.bigColliderSize.height > 0) {
            return this.cloneSize(this.bigColliderSize);
        }

        const smallVisualSize = this.smallVisualSize;
        const bigVisualSize = this.getConfiguredBigVisualSize();
        const widthRatio = smallVisualSize.width > 0 ? bigVisualSize.width / smallVisualSize.width : 1;
        const heightRatio = smallVisualSize.height > 0 ? bigVisualSize.height / smallVisualSize.height : 1;

        return cc.size(
            this.smallColliderSize.width * widthRatio,
            this.smallColliderSize.height * heightRatio
        );
    },

    getConfiguredBigColliderOffset() {
        if (this.bigColliderOffset.x !== 0 || this.bigColliderOffset.y !== 0) {
            return this.cloneVec2(this.bigColliderOffset);
        }

        const bigColliderSize = this.getConfiguredBigColliderSize();
        const smallBottom = this.smallColliderOffset.y - (this.smallColliderSize.height * 0.5);
        return cc.v2(
            this.smallColliderOffset.x,
            smallBottom + (bigColliderSize.height * 0.5)
        );
    },

    getFormVisualSize(formName) {
        return formName === 'big' ? this.getConfiguredBigVisualSize() : this.cloneSize(this.smallVisualSize);
    },

    getFormColliderSize(formName) {
        return formName === 'big' ? this.getConfiguredBigColliderSize() : this.cloneSize(this.smallColliderSize);
    },

    getFormColliderOffset(formName) {
        return formName === 'big' ? this.getConfiguredBigColliderOffset() : this.cloneVec2(this.smallColliderOffset);
    },

    getFormBottomLocal(formName) {
        if (this.boxCollider) {
            const size = this.getFormColliderSize(formName);
            const offset = this.getFormColliderOffset(formName);
            return offset.y - (size.height * 0.5);
        }

        const visualSize = this.getFormVisualSize(formName);
        return -visualSize.height * 0.5;
    },

    applyForm(formName, keepFeetPosition) {
        const previousForm = this.currentForm;
        const previousBottom = this.getFormBottomLocal(previousForm);
        const targetBottom = this.getFormBottomLocal(formName);
        const visualSize = this.getFormVisualSize(formName);
        const colliderSize = this.getFormColliderSize(formName);
        const colliderOffset = this.getFormColliderOffset(formName);

        this.currentForm = formName;

        if (keepFeetPosition) {
            this.node.y += previousBottom - targetBottom;
        }

        this.node.setContentSize(visualSize);
        this.node.width = visualSize.width;
        this.node.height = visualSize.height;

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }

        if (this.boxCollider) {
            this.boxCollider.size = cc.size(colliderSize.width, colliderSize.height);
            this.boxCollider.offset = cc.v2(colliderOffset.x, colliderOffset.y);
            this.boxCollider.apply();
        }

        if (this.body) {
            this.body.awake = true;
        }

        this.frameTimer = 0;
        this.frameIndex = 0;
        this.refreshCurrentFrame(false);
        this.currentWorldBounds = this.node.getBoundingBoxToWorld();
        this.previousWorldBounds = this.cloneRect(this.currentWorldBounds);
    },

    refreshCurrentFrame(forceIdle) {
        if (!this.sprite) {
            return;
        }

        const runFrames = this.getRunFramesForCurrentForm();
        if (forceIdle || !this.body || this.onGround) {
            if (runFrames.length > 0) {
                this.sprite.spriteFrame = runFrames[0];
            }
            return;
        }

        this.updateJumpAnimation();
    },

    resolveOneWayPlatformSupport() {
        this.activeOneWayGroundId = null;

        if (!this.body || this.oneWayContacts.size === 0) {
            return;
        }

        const currentBounds = this.getCurrentWorldBounds();
        const previousBounds = this.getPreviousWorldBounds();
        const velocityY = this.body.linearVelocity ? this.body.linearVelocity.y : 0;

        if (velocityY > 0) {
            return;
        }

        let support = null;
        let highestTop = -Infinity;

        for (const [contactId, data] of this.oneWayContacts.entries()) {
            if (!data || !data.platform || !data.platform.node || !cc.isValid(data.platform.node)) {
                continue;
            }

            const platformBounds = data.platform.getPlatformBounds
                ? data.platform.getPlatformBounds()
                : data.collider.node.getBoundingBoxToWorld();
            const platformTop = platformBounds.y + platformBounds.height;
            const horizontalOverlap =
                currentBounds.x + currentBounds.width > platformBounds.x + data.platform.sidePassPadding &&
                currentBounds.x < platformBounds.x + platformBounds.width - data.platform.sidePassPadding;
            const wasAbovePlatform = previousBounds.y >= platformTop - data.platform.topSurfacePadding;
            const reachedPlatformTop = currentBounds.y <= platformTop + data.platform.topSurfacePadding;

            if (!horizontalOverlap || !wasAbovePlatform || !reachedPlatformTop) {
                continue;
            }

            if (platformTop > highestTop) {
                highestTop = platformTop;
                support = {
                    contactId,
                    top: platformTop
                };
            }
        }

        if (!support) {
            return;
        }

        this.node.y += support.top - currentBounds.y;
        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, 0);
        this.currentWorldBounds = this.node.getBoundingBoxToWorld();
        this.activeOneWayGroundId = support.contactId;
    }
});
