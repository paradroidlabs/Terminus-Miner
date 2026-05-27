
import type { Player, Projectile, Enemy } from './systems/entities';

export enum GameStatus {
  MENU,
  PLAYING,
  LEVEL_UP,
  GAME_OVER,
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  resources: number;
  speed: number;
  shieldHealth: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  overdrive: number; // This will become ability charge
  ultimate: number;
}

export interface UpgradeOption {
  id: string;
  name: string;
  cost: number;
  action: () => void;
  disabled: boolean;
}

export interface MouseState {
  x: number;
  y: number;
  isLeftDown: boolean;
  isRightDown: boolean;
  isInsideCanvas: boolean;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface GameEngineOptions {
  gameStatus: GameStatus;
  onGameOver: (score: number, time: number) => void;
  onLevelUp: () => void;
  onResumeGame: () => void;
}


// --- MODULAR ABILITY SYSTEM ---

export interface FireContext {
    chargeLevel?: number; // 0 to 1, or >1 for overcharge
    isCharged?: boolean;
}

export interface IWeapon {
    id: string;
    name: string;
    damage: number;
    fireRate: number; // in ms
    projectileSpeed: number;
    projectileRadius: number;
    projectileChar: string;
    projectileColor: string;
    // Method to fire the weapon
    fire: (player: Player, mouse: MouseState, entities: { projectiles: Projectile[] }, context?: FireContext) => void;
}

export interface IAbility {
    id:string;
    name: string;
    maxCharge: number;
    description: string;
    // Method to activate the ability
    activate: (player: Player, entities: { enemies: Enemy[], orbs: any[], particles: any[] }, kills: { current: number }) => void;
}

export interface IUltimate {
    id: string;
    name: string;
    maxCharge: number;
    chargeRate: number; // points per second
    description: string;
    // Method to activate the ultimate
    activate: (player: Player, entities: { projectiles: Projectile[], ultimates: any[] }) => void;
}

export interface Loadout {
    primary: IWeapon;
    secondary: IWeapon;
    ability: IAbility;
    ultimate: IUltimate;
}
