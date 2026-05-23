const PowerMushroom = require('PowerMushroom');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        visualNode: cc.Node,
        questionSpriteFrame: cc.SpriteFrame,
        rewardPrefab: cc.Prefab,
        coinSpriteFrame: cc.SpriteFrame,
        usedSpriteFrame: cc.SpriteFrame,
        rewardScore: 100,
        startsUsed: false,
        bounceHeight: 10,
        bounceDuration: 0.08,
        coinRiseHeight: 42,
        coinLifetime: 0.35
    },

    onLoad() {
        this.visual = this.visualNode || this.node.children[0] || this.node;
        this.sprite = this.visual.getComponent(cc.Sprite) || this.getComponent(cc.Sprite);
        this.used = this.startsUsed;

        if (this.sprite) {
            if (this.used && this.usedSpriteFrame) {
                this.sprite.spriteFrame = this.usedSpriteFrame;
            } else if (!this.used && this.questionSpriteFrame) {
                this.sprite.spriteFrame = this.questionSpriteFrame;
            }
        }
    },

    getGame() {
        return this.gameNode ? this.gameNode.getComponent('Game') : null;
    },

    playBounce() {
        this.visual.stopAllActions();
        this.visual.setPosition(cc.v2());
        this.visual.runAction(
            cc.sequence(
                cc.moveBy(this.bounceDuration, 0, this.bounceHeight),
                cc.moveBy(this.bounceDuration, 0, -this.bounceHeight)
            )
        );
    },

    spawnCoinPopup() {
        if (!this.coinSpriteFrame) {
            return;
        }

        const coinNode = new cc.Node('CoinPopup');
        coinNode.parent = this.node.parent;
        coinNode.setPosition(this.node.x, this.node.y + this.node.height * 0.5);

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

    hitFromBelow() {
        this.playBounce();

        if (this.used) {
            return;
        }

        this.used = true;
        if (this.usedSpriteFrame && this.sprite) {
            this.sprite.spriteFrame = this.usedSpriteFrame;
        }

        const game = this.getGame();
        if (game) {
            game.hitQuestionBlock();
            game.addScore(this.rewardScore);
        }

        this.spawnCoinPopup();

        if (this.rewardPrefab) {
            const reward = cc.instantiate(this.rewardPrefab);
            reward.parent = this.node.parent;
            reward.setPosition(this.node.x, this.node.y + 40);
            const mushroom = reward.getComponent(PowerMushroom);
            if (mushroom && this.gameNode) {
                mushroom.gameNode = this.gameNode;
            }
        }
    }
});
