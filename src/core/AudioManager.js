import AudioReactive from './AudioReactiveSystem.js';

const SCENE_BGM_MAP = {
  MenuScene: 'bgm_menu',
  PacmanScene: 'bgm_reassurance',
  FroggerScene: 'bgm_reassurance',
  SpaceInvadersScene: 'bgm_intense',
  AsteroidsScene: 'bgm_intense',
  BreakoutScene: 'bgm_rock',
  TetrisScene: 'bgm_epic',
  TransitionScene: null,
  ModSelectScene: null,
  GameOverScene: null,
  VictoryScene: 'bgm_epic',
};

const BGM = {
  _current: null,
  _currentKey: null,
  _scene: null,
  _volume: 0.35,
  _muted: false,

  get muted() { return this._muted; },
  set muted(v) {
    this._muted = v;
    if (this._current) {
      this._current.setVolume(v ? 0 : this._volume);
    }
  },

  playForScene(scene, sceneKey) {
    const targetKey = SCENE_BGM_MAP[sceneKey];
    if (targetKey === undefined) {
      console.log('[BGM] no mapping for scene', sceneKey);
      return;
    }

    if (targetKey === null) {
      console.log('[BGM] scene intentionally has no BGM', sceneKey);
      return;
    }

    if (this._currentKey === targetKey && this._current && this._current.isPlaying) {
      console.log('[BGM] already playing target track', { sceneKey, targetKey });
      return;
    }

    console.log('[BGM] playForScene', { sceneKey, targetKey });
    this.crossfadeTo(scene, targetKey);
  },

  crossfadeTo(scene, newKey) {
    const fadeMs = 800;
    console.log('[BGM] crossfade start', {
      from: this._currentKey,
      to: newKey,
      scene: scene.scene?.key,
    });

    if (this._current && this._current.isPlaying) {
      const old = this._current;
      scene.tweens.add({
        targets: old,
        volume: 0,
        duration: fadeMs,
        onComplete: () => { old.stop(); },
      });
    }

    this._currentKey = newKey;

    try {
      const track = scene.sound.add(newKey, { loop: true, volume: 0 });
      console.log('[BGM] created track', {
        key: newKey,
        scene: scene.scene?.key,
        muted: this._muted,
        targetVolume: this._volume,
      });
      track.play();
      this._current = track;
      this._scene = scene;
      console.log('[BGM] track.play() called', {
        key: newKey,
        isPlaying: track.isPlaying,
        audioContextState: scene.sound?.context?.state,
      });

      AudioReactive.connect(scene);

      scene.tweens.add({
        targets: track,
        volume: this._muted ? 0 : this._volume,
        duration: fadeMs,
      });
    } catch (error) {
      console.log('[BGM] crossfade failed', error);
      this._current = null;
      this._currentKey = null;
    }
  },

  stop(scene) {
    if (this._current && this._current.isPlaying) {
      const old = this._current;
      if (scene) {
        scene.tweens.add({
          targets: old,
          volume: 0,
          duration: 400,
          onComplete: () => { old.stop(); },
        });
      } else {
        old.stop();
      }
    }
    this._current = null;
    this._currentKey = null;
  },

  setVolume(vol) {
    this._volume = vol;
    if (this._current && !this._muted) {
      this._current.setVolume(vol);
    }
  },
};

export default BGM;
