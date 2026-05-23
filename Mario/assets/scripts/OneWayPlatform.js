cc.Class({
    extends: cc.Component,

    properties: {
        allowedPlayerComponent: {
            default: 'SimplePlayerController',
            tooltip: 'Only nodes with this component can use the one-way platform rules.'
        },
        topSurfacePadding: {
            default: 8,
            tooltip: 'How far below the platform top the player feet can be and still snap onto it.'
        },
        sidePassPadding: {
            default: 4,
            tooltip: 'Small tolerance used to avoid side collisions becoming solid.'
        }
    },

    onLoad() {
        const body = this.getComponent(cc.RigidBody);
        if (body) {
            body.enabledContactListener = true;
        }

        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider && !collider.sensor) {
            collider.sensor = true;
            if (collider.apply) {
                collider.apply();
            }
        }
    },

    onPreSolve(contact, selfCollider, otherCollider) {
        const playerController = this.getAllowedPlayerController(otherCollider);
        if (!playerController) {
            return;
        }

        const otherBody = otherCollider.body;
        if (!otherBody) {
            contact.disabled = true;
            return;
        }

        const playerBounds = playerController.getCurrentWorldBounds
            ? playerController.getCurrentWorldBounds()
            : this.getWorldAabb(otherCollider);
        const previousPlayerBounds = playerController.getPreviousWorldBounds
            ? playerController.getPreviousWorldBounds()
            : playerBounds;
        const platformBounds = this.getWorldAabb(selfCollider);
        const playerBottom = playerBounds.y;
        const playerLeft = playerBounds.x;
        const playerRight = playerBounds.x + playerBounds.width;
        const previousPlayerBottom = previousPlayerBounds.y;
        const platformTop = platformBounds.y + platformBounds.height;
        const platformLeft = platformBounds.x;
        const platformRight = platformBounds.x + platformBounds.width;
        const velocityY = otherBody.linearVelocity ? otherBody.linearVelocity.y : 0;

        const horizontalOverlap =
            playerRight > platformLeft + this.sidePassPadding &&
            playerLeft < platformRight - this.sidePassPadding;
        const wasAbovePlatform = previousPlayerBottom >= platformTop - this.topSurfacePadding;
        const playerFeetReachedTop = playerBottom >= platformTop - this.topSurfacePadding;
        const fallingOrStill = velocityY <= 0;

        contact.disabled = !(horizontalOverlap && wasAbovePlatform && playerFeetReachedTop && fallingOrStill);
    },

    getWorldAabb(collider) {
        if (collider && collider.world && collider.world.aabb) {
            return collider.world.aabb;
        }

        if (collider && collider.node) {
            return collider.node.getBoundingBoxToWorld();
        }

        return cc.rect();
    },

    getPlatformBounds() {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        return this.getWorldAabb(collider);
    },

    getAllowedPlayerController(otherCollider) {
        if (!otherCollider || !otherCollider.node) {
            return null;
        }

        return otherCollider.node.getComponent(this.allowedPlayerComponent);
    }
});
