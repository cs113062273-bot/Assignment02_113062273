cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        questionSpriteFrame: cc.SpriteFrame,
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
        questionCoinSfx: {
            default: null,
            type: cc.AudioClip
        },
        powerUpAppearSfx: {
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

        if (this.sprite) {
            if (this.used && this.usedSpriteFrame) {
                this.sprite.spriteFrame = this.usedSpriteFrame;
            } else if (!this.used && this.questionSpriteFrame) {
                this.sprite.spriteFrame = this.questionSpriteFrame;
            }
        }
    },

    getGame() {
        return this.gameNode ? (this.gameNode.getComponent('Game') || this.gameNode.getComponent('SimpleStageController')) : null;
    },

    playBounce() {
        this.node.stopAllActions();
        this.node.setPosition(this.homePosition);
        this.node.runAction(
            cc.sequence(
                cc.moveBy(this.bounceDuration, 0, this.bounceHeight),
                cc.moveBy(this.bounceDuration, 0, -this.bounceHeight),
                cc.callFunc(() => {
                    this.node.setPosition(this.homePosition);
                })
            )
        );
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
        if (!this.coinSpriteFrame || !this.node.parent) {
            return;
        }

        const coinNode = new cc.Node('CoinPopup');
        coinNode.parent = this.node.parent;
        coinNode.setPosition(this.getTopPositionInParent(this.node.height * 0.5));

        const sprite = coinNode.addComponent(cc.Sprite);
        sprite.spriteFrame = this.coinSpriteFrame;

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
            if (mushroom && mushroom.spawnFromQuestionBlock) {
                mushroom.spawnFromQuestionBlock(this.node, this.gameNode, this.rewardSpawnOffsetY);
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
        if (mushroom && mushroom.spawnFromQuestionBlock) {
            mushroom.spawnFromQuestionBlock(this.node, this.gameNode, this.rewardSpawnOffsetY);
            return;
        }

        const spawnPosition = this.getTopPositionInParent(this.rewardSpawnOffsetY);
        reward.setPosition(spawnPosition);

        if (mushroom && mushroom.setGameNode) {
            mushroom.setGameNode(this.gameNode);
        }
    },

    hitFromBelow() {
        if (this.used) {
            return;
        }

        this.playBounce();

        this.used = true;
        if (this.usedSpriteFrame && this.sprite) {
            this.sprite.spriteFrame = this.usedSpriteFrame;
        }

        const game = this.getGame();
        if (game) {
            game.hitQuestionBlock();
            game.addScore(this.rewardScore, this.node, this.node.height);
            if (this.rewardType === 0) {
                if (game.collectCoin) {
                    game.collectCoin();
                }
            }
        }

        if (this.rewardType === 0) {
            this.playSfx(this.questionCoinSfx);
            this.spawnCoinPopup();
            return;
        }

        this.playSfx(this.powerUpAppearSfx);
        this.spawnMushroomReward();
    },

    playSfx(clip) {
        if (!clip) {
            return;
        }

        cc.audioEngine.playEffect(clip, false);
    }
});
