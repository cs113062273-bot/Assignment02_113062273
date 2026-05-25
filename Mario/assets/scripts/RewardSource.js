cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        readySpriteFrame: cc.SpriteFrame,
        rewardType: {
            default: 0,
            type: cc.Enum({
                Coin: 0,
                Mushroom: 1
            })
        },
        rewardNode: cc.Node,
        rewardPrefab: cc.Prefab,
        coinSpriteFrame: cc.SpriteFrame,
        usedSpriteFrame: cc.SpriteFrame,
        coinSfx: {
            default: null,
            type: cc.AudioClip
        },
        rewardAppearSfx: {
            default: null,
            type: cc.AudioClip
        },
        rewardScore: 100,
        startsUsed: false,
        bounceHeight: 10,
        bounceDuration: 0.08,
        coinRiseHeight: 42,
        coinLifetime: 0.35,
        rewardSpawnOffsetY: 0
    },

    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        this.used = this.startsUsed;
        this.homePosition = this.node.position.clone();
        this.isBouncing = false;
        this.bounceTimer = 0;
        this.bounceCompleteCallback = null;

        if (this.sprite) {
            if (this.used && this.usedSpriteFrame) {
                this.sprite.spriteFrame = this.usedSpriteFrame;
            } else if (!this.used && this.readySpriteFrame) {
                this.sprite.spriteFrame = this.readySpriteFrame;
            }
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

    getGame() {
        const gameNode = this.gameNode || cc.find('Game');
        if (!gameNode) {
            return null;
        }

        return gameNode.getComponent('Game') || gameNode.getComponent('SimpleStageController');
    },

    playBounce(onComplete) {
        this.isBouncing = true;
        this.bounceTimer = 0;
        this.bounceCompleteCallback = onComplete || null;
    },

    finishBounce() {
        this.setBlockPosition(this.homePosition.y);
        this.isBouncing = false;

        const onComplete = this.bounceCompleteCallback;
        this.bounceCompleteCallback = null;
        if (onComplete) {
            onComplete();
        }
    },

    setBlockPosition(y) {
        this.node.setPosition(this.homePosition.x, y);
    },

    getTopPositionInParent(offsetY) {
        const parent = this.node.parent;
        if (!parent) {
            return this.node.position.add(cc.v2(0, offsetY));
        }

        const worldTop = this.node.convertToWorldSpaceAR(cc.v2(0, offsetY));
        return parent.convertToNodeSpaceAR(worldTop);
    },

    spawnCoinPopup() {
        if (!this.coinSpriteFrame) {
            return;
        }

        const game = this.getGame();
        const popupParent = (game && game.scorePopupRoot)
            || (game && game.playerNode && game.playerNode.parent)
            || this.node.parent;
        if (!popupParent) {
            return;
        }

        const worldPosition = this.node.convertToWorldSpaceAR(
            cc.v2(0, this.node.height * 0.5)
        );
        const coinNode = new cc.Node('CoinPopup');
        coinNode.parent = popupParent;
        coinNode.setPosition(popupParent.convertToNodeSpaceAR(worldPosition));
        coinNode.opacity = 255;
        coinNode.zIndex = 999;

        const sprite = coinNode.addComponent(cc.Sprite);
        sprite.spriteFrame = this.coinSpriteFrame;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.type = cc.Sprite.Type.SIMPLE;

        const frameSize = this.coinSpriteFrame.getOriginalSize
            ? this.coinSpriteFrame.getOriginalSize()
            : this.coinSpriteFrame.getRect();
        if (frameSize) {
            coinNode.setContentSize(frameSize);
            coinNode.width = frameSize.width;
            coinNode.height = frameSize.height;
        }

        coinNode.scaleX = Math.abs(this.node.scaleX || 1);
        coinNode.scaleY = Math.abs(this.node.scaleY || 1);

        coinNode.runAction(
            cc.sequence(
                cc.spawn(
                    cc.moveBy(this.coinLifetime, 0, this.coinRiseHeight),
                    cc.rotateBy(this.coinLifetime, 360),
                    cc.fadeOut(this.coinLifetime)
                ),
                cc.removeSelf()
            )
        );
    },

    spawnMushroomReward() {
        if (this.rewardNode) {
            const mushroomNode = this.rewardNode;
            mushroomNode.active = true;

            const mushroom = mushroomNode.getComponent('PowerMushroom');
            if (mushroom && mushroom.spawnFromRewardSource) {
                mushroom.spawnFromRewardSource(this.node, this.gameNode, this.rewardSpawnOffsetY);
                return;
            }

            mushroomNode.setPosition(this.getTopPositionInParent(this.rewardSpawnOffsetY));
            return;
        }

        if (!this.rewardPrefab || !this.node.parent) {
            return;
        }

        const reward = cc.instantiate(this.rewardPrefab);
        reward.parent = this.node.parent;

        const mushroom = reward.getComponent('PowerMushroom');
        if (mushroom && mushroom.spawnFromRewardSource) {
            mushroom.spawnFromRewardSource(this.node, this.gameNode, this.rewardSpawnOffsetY);
            return;
        }

        const spawnPosition = this.getTopPositionInParent(this.rewardSpawnOffsetY);
        reward.setPosition(spawnPosition);

        if (mushroom && mushroom.setGameNode) {
            mushroom.setGameNode(this.gameNode);
        }
    },

    activateReward() {
        if (this.used) {
            return false;
        }

        try {
            this.used = true;
            this.playBounce(() => {
                if (this.usedSpriteFrame && this.sprite) {
                    this.sprite.spriteFrame = this.usedSpriteFrame;
                }
            });

            if (this.rewardType === 0) {
                this.playSfx(this.coinSfx);
                this.spawnCoinPopup();
            } else {
                this.playSfx(this.rewardAppearSfx);
                this.spawnMushroomReward();
            }

            const game = this.getGame();
            if (game) {
                try {
                    if (game.addScore) {
                        game.addScore(this.rewardScore, this.node, this.node.height);
                    }
                    if (this.rewardType === 0 && game.collectCoin) {
                        game.collectCoin();
                    }
                } catch (gameError) {
                    cc.error(gameError);
                }
            }

            return true;
        } catch (error) {
            cc.error(error);
            return false;
        }
    },

    tryActivateFromBelow() {
        return this.activateReward();
    },

    playSfx(clip) {
        if (!clip) {
            return;
        }

        cc.audioEngine.playEffect(clip, false);
    }
});
