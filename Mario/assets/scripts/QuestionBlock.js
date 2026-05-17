const PowerMushroom = require('PowerMushroom');

cc.Class({
    extends: cc.Component,

    properties: {
        gameNode: cc.Node,
        rewardPrefab: cc.Prefab,
        usedSpriteFrame: cc.SpriteFrame,
        rewardScore: 100
    },

    onLoad() {
        this.used = false;
        this.sprite = this.getComponent(cc.Sprite);
    },

    getGame() {
        return this.gameNode ? this.gameNode.getComponent('Game') : null;
    },

    hitFromBelow() {
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

        this.node.runAction(
            cc.sequence(
                cc.moveBy(0.08, 0, 10),
                cc.moveBy(0.08, 0, -10)
            )
        );

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
