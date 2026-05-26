let persistentBgm = null;

cc.Class({
    extends: cc.Component,

    properties: {
        clip: cc.AudioClip,
        trackKey: {
            default: 'menu-stage-bgm'
        },
        volume: {
            default: 0.7
        }
    },

    onLoad() {
        if (persistentBgm && cc.isValid(persistentBgm.node)) {
            if (persistentBgm.trackKey === this.trackKey) {
                persistentBgm.setVolume(this.volume);
                this.node.destroy();
                return;
            }

            persistentBgm.play(this.clip, this.trackKey, this.volume);
            this.node.destroy();
            return;
        }

        persistentBgm = this;
        cc.game.addPersistRootNode(this.node);
        this.audioSource = this.getComponent(cc.AudioSource);
        if (!this.audioSource) {
            this.audioSource = this.addComponent(cc.AudioSource);
        }
        this.audioSource.loop = true;
        this.play(this.clip, this.trackKey, this.volume);
    },

    play(clip, trackKey, volume) {
        this.trackKey = trackKey;
        this.setVolume(volume);

        if (!clip || !this.audioSource) {
            return;
        }

        if (this.audioSource.clip === clip && this.audioSource.isPlaying) {
            return;
        }

        this.audioSource.stop();
        this.audioSource.clip = clip;
        this.audioSource.play();
    },

    setVolume(volume) {
        if (this.audioSource) {
            this.audioSource.volume = volume;
        }
    },

    stop() {
        if (this.audioSource) {
            this.audioSource.stop();
        }
    },

    pause() {
        if (this.audioSource) {
            this.audioSource.pause();
        }
    },

    resume() {
        if (this.audioSource) {
            this.audioSource.resume();
        }
    },

    onDestroy() {
        if (persistentBgm === this) {
            persistentBgm = null;
        }
    }
});
