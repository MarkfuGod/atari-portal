import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import SFX from '../core/SFXManager.js';

const ENTRY_VIDEO = '/assets/video/entry.mp4';

export class VideoIntroScene extends Phaser.Scene {
  constructor() {
    super('VideoIntroScene');
  }

  create() {
    this.phase = 'entry';
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor(COLORS.BLACK);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BLACK, 1);
    this.createIntroOverlay();
    this.playVideo(this.entryVideo, true);

    this.events.once('shutdown', this.cleanup, this);
    this.events.once('destroy', this.cleanup, this);
  }

  createIntroOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('aria-label', 'Atari Portal entry video');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      overflow: 'hidden',
      background: '#000',
      zIndex: '20',
      opacity: '1',
      transition: 'opacity 360ms ease, filter 360ms ease',
    });

    this.entryVideo = this.createVideoElement(ENTRY_VIDEO, {
      loop: true,
      muted: true,
      opacity: '1',
    });

    this.scrim = document.createElement('div');
    Object.assign(this.scrim.style, {
      position: 'absolute',
      inset: '0',
      background: 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.08), transparent 34%), linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.52))',
      boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.84)',
      pointerEvents: 'none',
    });

    this.scanlines = document.createElement('div');
    Object.assign(this.scanlines.style, {
      position: 'absolute',
      inset: '0',
      backgroundImage: 'repeating-linear-gradient(180deg, rgba(0, 240, 255, 0.08) 0, rgba(0, 240, 255, 0.08) 1px, transparent 1px, transparent 6px)',
      mixBlendMode: 'screen',
      opacity: '0.42',
      pointerEvents: 'none',
    });

    this.copyPanel = document.createElement('div');
    Object.assign(this.copyPanel.style, {
      position: 'absolute',
      left: '50%',
      bottom: '46px',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px',
      width: 'min(92vw, 720px)',
      color: '#eafdff',
      fontFamily: 'monospace',
      textAlign: 'center',
      textShadow: '0 0 12px rgba(0, 240, 255, 0.72), 0 2px 10px rgba(0, 0, 0, 0.95)',
      transition: 'opacity 220ms ease, transform 220ms ease',
    });

    this.statusText = document.createElement('div');
    this.statusText.textContent = 'ATARI PORTAL // ENTRY SIGNAL LOCKED';
    Object.assign(this.statusText.style, {
      fontSize: 'clamp(12px, 1.7vw, 16px)',
      letterSpacing: '0.22em',
      color: '#eafdff',
    });

    this.enterButton = document.createElement('button');
    this.enterButton.type = 'button';
    this.enterButton.textContent = 'ENTER GAME';
    Object.assign(this.enterButton.style, {
      appearance: 'none',
      border: '1px solid rgba(234, 253, 255, 0.84)',
      borderRadius: '999px',
      padding: '14px 34px',
      minWidth: '220px',
      background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.22), rgba(255, 255, 255, 0.72), rgba(255, 0, 230, 0.24))',
      color: '#041017',
      cursor: 'pointer',
      fontFamily: 'monospace',
      fontSize: 'clamp(16px, 2.4vw, 22px)',
      fontWeight: '700',
      letterSpacing: '0.18em',
      boxShadow: '0 0 28px rgba(255, 255, 255, 0.36), 0 0 48px rgba(0, 240, 255, 0.24)',
      transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
    });

    this.hintText = document.createElement('div');
    this.hintText.textContent = 'Press Enter or Space';
    Object.assign(this.hintText.style, {
      fontSize: '12px',
      color: '#bfefff',
      letterSpacing: '0.16em',
      opacity: '0.82',
      textTransform: 'uppercase',
    });

    this.flash = document.createElement('div');
    Object.assign(this.flash.style, {
      position: 'absolute',
      inset: '0',
      background: '#f7fbff',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '4',
      transition: 'opacity 140ms ease-out',
    });

    this.copyPanel.append(this.statusText, this.enterButton, this.hintText);
    this.overlay.append(this.entryVideo, this.scrim, this.scanlines, this.copyPanel, this.flash);
    document.body.appendChild(this.overlay);

    this.boundBeginLoading = () => this.beginLoading();
    this.boundKeyDown = (event) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.beginLoading();
      }
    };

    this.enterButton.addEventListener('click', this.boundBeginLoading);
    this.enterButton.addEventListener('mouseenter', () => {
      if (this.enterButton.disabled) return;
      this.enterButton.style.transform = 'scale(1.04)';
      this.enterButton.style.boxShadow = '0 0 42px rgba(255, 255, 255, 0.58), 0 0 72px rgba(0, 240, 255, 0.38)';
    });
    this.enterButton.addEventListener('mouseleave', () => {
      this.enterButton.style.transform = 'scale(1)';
      this.enterButton.style.boxShadow = '0 0 28px rgba(255, 255, 255, 0.36), 0 0 48px rgba(0, 240, 255, 0.24)';
    });
    document.addEventListener('keydown', this.boundKeyDown);

    this.time.delayedCall(50, () => this.enterButton.focus({ preventScroll: true }));
  }

  createVideoElement(src, { loop, muted, opacity }) {
    const video = document.createElement('video');
    video.src = src;
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.preload = 'auto';
    Object.assign(video.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      background: '#000',
      opacity,
      filter: 'brightness(0.92) saturate(1.2) contrast(1.08)',
      transform: 'scale(1.01)',
      transition: 'opacity 460ms ease, filter 460ms ease, transform 760ms ease',
      pointerEvents: 'none',
    });
    return video;
  }

  playVideo(video, loop) {
    if (!video) return;

    video.loop = loop;
    try {
      video.currentTime = 0;
    } catch (_) {
      // Some browsers reject seeking until metadata is ready.
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }

  beginLoading() {
    if (this.isTransitioning || this.phase !== 'entry') return;

    this.isTransitioning = true;
    this.phase = 'loading';
    SFX.menuStart();

    this.enterButton.disabled = true;
    this.enterButton.style.cursor = 'default';
    this.enterButton.style.opacity = '0.72';
    this.enterButton.textContent = 'OPENING';
    this.statusText.textContent = 'LINK ACCEPTED // OPENING MEMORY GATE';
    this.hintText.textContent = 'Stand by';

    this.copyPanel.style.opacity = '0';
    this.copyPanel.style.transform = 'translate(-50%, 10px)';
    this.entryVideo.style.filter = 'brightness(1.38) saturate(1.55) contrast(1.2) blur(1.5px)';
    this.entryVideo.style.transform = 'scale(1.055)';
    this.flash.style.transition = 'opacity 120ms ease-out';
    this.flash.style.opacity = '0.88';

    this.time.delayedCall(130, () => {
      this.revealMenu();
    });
  }

  revealMenu() {
    if (this.phase === 'complete') return;

    this.phase = 'complete';
    this.isTransitioning = true;

    if (this.entryVideo) {
      this.entryVideo.style.opacity = '0';
      this.entryVideo.style.filter = 'brightness(1.65) saturate(1.4) blur(4px)';
      this.entryVideo.style.transform = 'scale(1.08)';
    }

    this.flash.style.transition = 'opacity 110ms ease-out';
    this.flash.style.opacity = '0.94';
    this.cameras.main.fadeOut(300, 255, 255, 255);

    this.time.delayedCall(150, () => {
      if (this.overlay) {
        this.overlay.style.opacity = '0';
        this.overlay.style.filter = 'brightness(1.24) blur(8px)';
      }
    });

    this.time.delayedCall(360, () => {
      this.cleanup();
      this.scene.start('MenuScene');
    });
  }

  cleanup() {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
    }

    if (this.enterButton && this.boundBeginLoading) {
      this.enterButton.removeEventListener('click', this.boundBeginLoading);
    }

    [this.entryVideo].forEach((video) => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    });

    if (this.overlay) {
      this.overlay.remove();
    }

    this.overlay = null;
    this.entryVideo = null;
    this.enterButton = null;
    this.boundBeginLoading = null;
    this.boundKeyDown = null;
  }
}
