const state = {
    freezeCount: 0,
    pausedTargets: []
};

function traverseNode(node, visit) {
    if (!node || !cc.isValid(node)) {
        return;
    }

    visit(node);

    const children = node.children || [];
    for (let i = 0; i < children.length; i += 1) {
        traverseNode(children[i], visit);
    }
}

function pauseSceneActions() {
    const actionManager = cc.director && cc.director.getActionManager ? cc.director.getActionManager() : null;
    const scene = cc.director && cc.director.getScene ? cc.director.getScene() : null;

    state.pausedTargets = [];

    if (!actionManager || !scene) {
        return;
    }

    traverseNode(scene, (node) => {
        state.pausedTargets.push(node);
        actionManager.pauseTarget(node);
    });
}

function resumeSceneActions() {
    const actionManager = cc.director && cc.director.getActionManager ? cc.director.getActionManager() : null;

    if (!actionManager) {
        state.pausedTargets = [];
        return;
    }

    for (let i = 0; i < state.pausedTargets.length; i += 1) {
        const node = state.pausedTargets[i];
        if (node && cc.isValid(node)) {
            actionManager.resumeTarget(node);
        }
    }

    state.pausedTargets = [];
}

module.exports = {
    begin() {
        state.freezeCount += 1;
        if (state.freezeCount === 1) {
            pauseSceneActions();
        }
    },

    end() {
        if (state.freezeCount <= 0) {
            state.freezeCount = 0;
            return;
        }

        state.freezeCount -= 1;
        if (state.freezeCount === 0) {
            resumeSceneActions();
        }
    },

    reset() {
        state.freezeCount = 0;
        resumeSceneActions();
    },

    isFrozen() {
        return state.freezeCount > 0;
    }
};
