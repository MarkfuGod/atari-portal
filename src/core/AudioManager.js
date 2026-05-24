import AudioReactive from './AudioReactiveSystem.js';

const SCENE_BGM_MAP = {
  MenuScene:          ['bgm_menu', 'bgm_menu_alt'],
  PacmanScene:        ['bgm_reassurance', 'bgm_reassurance_alt'],
  FroggerScene:       ['bgm_reassurance', 'bgm_reassurance_alt'],
  SpaceInvadersScene: ['bgm_intense', 'bgm_intense_alt'],
  AsteroidsScene:     ['bgm_intense', 'bgm_intense_alt'],
  BreakoutScene:      ['bgm_rock', 'bgm_rock_alt'],
  TetrisScene:        ['bgm_epic', 'bgm_epic_alt'],
  VictoryScene:       ['bgm_epic', 'bgm_epic_alt'],
  TransitionScene:    null,
  ModSelectScene:     null,
  GameOverScene:      null,
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
    const mapping = SCENE_BGM_MAP[sceneKey];
    if (mapping === undefined) {
      console.log('[BGM] no mapping for scene', sceneKey);
      return;
    }

    if (mapping === null) {
      console.log('[BGM] scene intentionally has no BGM', sceneKey);
      return;
    }

    const candidates = (Array.isArray(mapping) ? mapping : [mapping])
      .filter((k) => scene.cache.audio.exists(k));

    if (!candidates.length) {
      console.log('[BGM] no loaded variants for scene', sceneKey, mapping);
      this.stop(scene);
      return;
    }

    if (this._currentKey && candidates.includes(this._currentKey)
        && this._current && this._current.isPlaying) {
      console.log('[BGM] keeping current variant', {
        sceneKey,
        currentKey: this._currentKey,
      });
      return;
    }

    const targetKey = candidates[Math.floor(Math.random() * candidates.length)];
    console.log('[BGM] playForScene', { sceneKey, targetKey, pool: candidates });
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
