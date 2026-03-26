const ACHIEVEMENTS = [
  { id: 'first_portal', name: 'FIRST BREACH', description: 'Enter your first portal', condition: (s) => s.gamesCompleted.length >= 1 },
  { id: 'pacman_clean', name: 'GHOST DODGER', description: 'Clear Pac-Man without dying', condition: null },
  { id: 'tetris_clear', name: 'TETRIS MASTER', description: 'Score a Tetris (4-line clear)', condition: null },
  { id: 'speed_demon', name: 'SPEED DEMON', description: 'Trigger 3 speed boosts in one run', condition: null },
  { id: 'hacker', name: 'HACKER', description: 'Use the hack ability', condition: null },
  { id: 'survive_3_glitch', name: 'GLITCH PROOF', description: 'Survive 3 anomalies in one game', condition: null },
  { id: 'all_mods', name: 'MODDED OUT', description: 'Have 5 active mods at once', condition: null },
  { id: 'story_complete', name: 'RIFT SEALED', description: 'Complete story mode', condition: (s) => s.gamesCompleted.length >= 6 },
  { id: 'high_score_10k', name: '10K CLUB', description: 'Reach 10,000 points', condition: (s) => s.totalScore >= 10000 },
  { id: 'high_score_50k', name: '50K CLUB', description: 'Reach 50,000 points', condition: (s) => s.totalScore >= 50000 },
  { id: 'coin_hoarder', name: 'CREDIT HOARDER', description: 'Accumulate 50 coins', condition: (s) => s.coins >= 50 },
  { id: 'mutation_survive', name: 'MUTANT', description: 'Complete a game with PERMADEATH mutation', condition: null },
];

export class AchievementSystem {
  constructor() {
    this.unlocked = this.load();
    this.glitchCount = 0;
    this.speedBoostCount = 0;
    this.deathsThisGame = 0;
  }

  load() {
    try {
      const data = localStorage.getItem('atari-portal-achievements');
      return data ? JSON.parse(data) : [];
    } catch (_) { return []; }
  }

  save() {
    try {
      localStorage.setItem('atari-portal-achievements', JSON.stringify(this.unlocked));
    } catch (_) {}
  }

  unlock(id) {
    if (!this.unlocked.includes(id)) {
      this.unlocked.push(id);
      this.save();
      return true;
    }
    return false;
  }

  isUnlocked(id) {
    return this.unlocked.includes(id);
  }

  checkAutoAchievements(state) {
    const newUnlocks = [];
    for (const ach of ACHIEVEMENTS) {
      if (ach.condition && !this.isUnlocked(ach.id) && ach.condition(state)) {
        this.unlock(ach.id);
        newUnlocks.push(ach);
      }
    }
    return newUnlocks;
  }

  getAll() {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.unlocked.includes(a.id),
    }));
  }

  get totalUnlocked() {
    return this.unlocked.length;
  }

  get totalAchievements() {
    return ACHIEVEMENTS.length;
  }

  resetSession() {
    this.glitchCount = 0;
    this.speedBoostCount = 0;
    this.deathsThisGame = 0;
  }
}
