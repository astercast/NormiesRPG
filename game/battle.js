import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    this.party = data.party || [];
    this.enemy = data.enemy || { name: 'Wild Normie', hp: 30, maxHp: 30, atk: 8 };
  }

  create() {
    this.cameras.main.setBackgroundColor('#222');
    this.add.text(240, 40, 'BATTLE!', { font: '28px monospace', fill: '#fff' }).setOrigin(0.5);
    // Party display
    this.partySprites = [];
    this.party.forEach((n, i) => {
      const y = 120 + i * 60;
      this.add.rectangle(80, y, 48, 48, 0x333366).setOrigin(0.5);
      this.add.text(120, y - 12, n.name, { font: '14px monospace', fill: '#fff' });
      this.add.text(120, y + 8, `HP: ${n.hp ?? 10}`, { font: '12px monospace', fill: '#fff' });
    });
    // Enemy display
    this.add.rectangle(400, 140, 64, 64, 0x663333).setOrigin(0.5);
    this.add.text(400, 100, this.enemy.name, { font: '16px monospace', fill: '#fff' }).setOrigin(0.5);
    this.enemyHpText = this.add.text(400, 170, `HP: ${this.enemy.hp}`, { font: '14px monospace', fill: '#fff' }).setOrigin(0.5);
    // Action buttons
    this.actionText = this.add.text(240, 260, 'Choose action: [A]ttack  [R]un', { font: '16px monospace', fill: '#fff' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-A', () => this.playerAttack());
    this.input.keyboard.on('keydown-R', () => this.endBattle('run'));
    this.battleLog = this.add.text(240, 300, '', { font: '14px monospace', fill: '#fff' }).setOrigin(0.5);
    this.turn = 'player';
  }

  playerAttack() {
    if (this.turn !== 'player') return;
    const dmg = Math.floor(8 + Math.random() * 6);
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.enemyHpText.setText(`HP: ${this.enemy.hp}`);
    this.battleLog.setText(`You attack for ${dmg} damage!`);
    if (this.enemy.hp <= 0) {
      this.time.delayedCall(900, () => this.endBattle('win'));
    } else {
      this.turn = 'enemy';
      this.time.delayedCall(900, () => this.enemyAttack());
    }
  }

  enemyAttack() {
    const dmg = Math.floor(this.enemy.atk + Math.random() * 4);
    this.battleLog.setText(`Enemy attacks for ${dmg} damage!`);
    // Damage first alive party member
    const target = this.party.find(n => (n.hp ?? 10) > 0);
    if (target) {
      target.hp = Math.max(0, (target.hp ?? 10) - dmg);
      this.add.text(120, 220, `-${dmg} HP`, { font: '14px monospace', fill: '#f66' });
    }
    if (this.party.every(n => (n.hp ?? 0) <= 0)) {
      this.time.delayedCall(900, () => this.endBattle('lose'));
    } else {
      this.turn = 'player';
    }
  }

  endBattle(result) {
    if (result === 'win') {
      this.battleLog.setText('Victory! Press [E] to return.');
    } else if (result === 'lose') {
      this.battleLog.setText('Defeat... Press [E] to return.');
    } else {
      this.battleLog.setText('You ran! Press [E] to return.');
    }
    this.input.keyboard.once('keydown-E', () => {
      this.scene.stop('BattleScene');
      this.scene.start('default');
    });
  }
}
