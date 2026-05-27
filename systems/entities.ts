
import { Loadout, Vector2D } from '../types';
import * as C from '../constants';

// --- UTILITY ---
export const rand = (min: number, max: number) => Math.random() * (max - min) + min;
export const hypot = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

// --- ENTITY CLASSES ---

export class Entity {
    x: number; y: number; radius: number;
    constructor(x: number, y: number, radius: number) { this.x = x; this.y = y; this.radius = radius; }
    render(ctx: CanvasRenderingContext2D, char: string, color: string) { 
        ctx.fillStyle = color; 
        ctx.fillText(char, this.x, this.y); 
    }
}

export class Shield extends Entity {
    player: Player; maxHealth = 50; health = 50; angle = 0;
    char = 'O'; color = '#00FFFF'; lastFireTime = 0; fireRate = 1000; arcBounces = 1;
    arcProjectileSpeed = 7;
    constructor(player: Player) { super(player.x, player.y, 40); this.player = player; }
    update() { this.angle += 0.05; this.x = this.player.x + Math.cos(this.angle) * this.radius; this.y = this.player.y + Math.sin(this.angle) * this.radius; }
    render(ctx: CanvasRenderingContext2D) { 
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + 0.4 * (this.health / this.maxHealth);
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Rotating bit
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.arc(30, 0, 4, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.restore();
    }
    takeDamage(amount: number) { this.health -= amount; if (this.health <= 0) { this.player.shield = null; } return 0; }
}

export class Player extends Entity {
    input: { keys: Set<string>, moveJoystick?: { x: number, y: number } };
    char = '@'; color = '#00FF00';
    lastFireTime = 0;
    lastSecondaryFireTime = 0;
    
    // Core stats
    speed = C.PLAYER_SPEED; maxHealth = 100; health = 100;
    resources = 0; xp = 0; level = 1; xpToNextLevel = 10;
    shield: Shield | null = null;
    
    // Charge meters
    abilityCharge = 0;
    ultimateCharge = 0;

    // Modular loadout
    loadout: Loadout;

    constructor(x: number, y: number, input: { keys: Set<string>, moveJoystick?: { x: number, y: number } }, initialLoadout: Loadout) {
        super(x, y, C.PLAYER_RADIUS);
        this.input = input;
        this.loadout = initialLoadout;
    }
    
    update() {
        let dx = 0, dy = 0;
        
        // Joystick Movement (Overrides keyboard if active)
        if (this.input.moveJoystick && (this.input.moveJoystick.x !== 0 || this.input.moveJoystick.y !== 0)) {
            dx = this.input.moveJoystick.x;
            dy = this.input.moveJoystick.y;
        } else {
            // Keyboard Movement
            if (this.input.keys.has('w')) dy -= 1; if (this.input.keys.has('s')) dy += 1;
            if (this.input.keys.has('a')) dx -= 1; if (this.input.keys.has('d')) dx += 1;
            if (dx !== 0 || dy !== 0) {
                const len = hypot(dx, dy);
                dx /= len;
                dy /= len;
            }
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;
    }

    render(ctx: CanvasRenderingContext2D, char: string, color: string) { 
        if (this.shield) {
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00FFFF';
        }
        ctx.fillStyle = color; 
        ctx.fillText(char, this.x, this.y); 
        if (this.shield) {
            ctx.restore();
        }
    }
    
    takeDamage(amount: number) {
        if (this.shield) { amount = this.shield.takeDamage(amount); }
        if (amount > 0) { this.health = Math.max(0, this.health - amount); }
    }
}

export class EnemyProjectile extends Entity {
    vx: number; vy: number; damage: number;
    char = '-'; color = '#FFFFFF'; lifespan = 150;
    constructor(x: number, y: number, tx: number, ty: number, damage: number, speed: number) {
        super(x, y, 4); this.damage = damage;
        const dx = tx - x, dy = ty - y;
        const dist = hypot(dx, dy) || 1;
        this.vx = dx / dist * speed;
        this.vy = dy / dist * speed;
    }
    update() { this.x += this.vx; this.y += this.vy; this.lifespan--; }
}

export type EnemyType = 'scout' | 'brute' | 'dasher' | 'sniper';

export class Enemy extends Entity {
    target: Vector2D; type: EnemyType;
    char: string; color: string; speed: number; health: number; maxHealth: number;
    aiState: { timer: number; phase: string; data?: { dx: number; dy: number } } = { timer: 0, phase: 'seeking' };

    constructor(x: number, y: number, target: Vector2D, type: EnemyType) {
        super(x, y, C.ENEMY_RADIUS);
        this.target = target; this.type = type;
        switch (type) {
            case 'brute': this.speed = C.ENEMY_SPEED * 0.7; this.char = 'E'; this.color = '#FF5733'; this.maxHealth = 50; this.health = 50; this.radius = C.ENEMY_RADIUS * 1.5; break;
            case 'dasher': this.speed = C.ENEMY_SPEED * 0.5; this.char = 'D'; this.color = '#FF00FF'; this.maxHealth = 30; this.health = 30; this.radius = C.ENEMY_RADIUS * 1.2; this.aiState.timer = rand(1000, 3000); break;
            case 'sniper': this.speed = C.ENEMY_SPEED * 0.8; this.char = 'S'; this.color = '#00FFFF'; this.maxHealth = 15; this.health = 15; this.aiState.timer = rand(1500, 2500); break;
            default: this.speed = C.ENEMY_SPEED + rand(-0.5, 0.5); this.char = ['e', 'a', 'x'][Math.floor(rand(0,3))]; this.color = '#FF0000'; this.maxHealth = 20; this.health = 20; break;
        }
    }
    update(deltaTime: number, entities: { enemyProjectiles: EnemyProjectile[] }) {
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = hypot(dx, dy);
        switch (this.type) {
            case 'dasher':
                this.aiState.timer -= deltaTime;
                if (this.aiState.phase === 'seeking' && this.aiState.timer <= 0) { this.aiState.phase = 'charging'; this.aiState.timer = 500; }
                else if (this.aiState.phase === 'charging') { this.char = '!!'; if (this.aiState.timer <= 0) { this.aiState.phase = 'dashing'; this.aiState.timer = 400; this.aiState.data = { dx: dx / dist, dy: dy / dist }; } }
                else if (this.aiState.phase === 'dashing') { this.char = 'D'; if (this.aiState.data) { const dashSpeed = 5; this.x += this.aiState.data.dx * this.speed * dashSpeed; this.y += this.aiState.data.dy * this.speed * dashSpeed; } if (this.aiState.timer <= 0) { this.aiState.phase = 'seeking'; this.aiState.timer = 2000; delete this.aiState.data; } }
                if (this.aiState.phase !== 'dashing') { if (dist > 1) { this.x += dx / dist * this.speed; this.y += dy / dist * this.speed; } }
                break;
            case 'sniper':
                this.aiState.timer -= deltaTime;
                const optimalRange = 400, tooCloseRange = 250;
                if (dist < tooCloseRange) { this.x -= dx / dist * this.speed; this.y -= dy / dist * this.speed; }
                else if (dist > optimalRange) { this.x += dx / dist * this.speed; this.y += dy / dist * this.speed; }
                else { if (this.aiState.timer <= 0) { entities.enemyProjectiles.push(new EnemyProjectile(this.x, this.y, this.target.x, this.target.y, 5, 8)); this.aiState.timer = 2000; } }
                break;
            default: if (dist > 1) { this.x += dx / dist * this.speed; this.y += dy / dist * this.speed; } break;
        }
    }
    render(ctx: CanvasRenderingContext2D) { super.render(ctx, this.char, this.color); }
    takeDamage(amount: number) { this.health -= amount; }
}

export class Projectile extends Entity {
    vx: number; vy: number; damage: number;
    char: string; color: string;
    speed: number;
    lifespan = 200;
    homing: boolean = false;
    target: Entity | null = null;
    piercing: boolean = false;

    constructor(x: number, y: number, tx: number, ty: number, damage: number, speed: number, radius: number, char: string, color: string) {
        super(x, y, radius); this.damage = damage;
        this.speed = speed;
        this.char = char; this.color = color;
        const dx = tx - x, dy = ty - y;
        const dist = hypot(dx, dy) || 1;
        this.vx = dx / dist * speed;
        this.vy = dy / dist * speed;
    }
    update(enemies?: Enemy[]) {
        if (this.homing && enemies) {
            if (!this.target || (this.target instanceof Enemy && this.target.health <= 0)) {
                let minDist = 400;
                let closest = null;
                for(const e of enemies) {
                    const d = hypot(this.x - e.x, this.y - e.y);
                    if (d < minDist) { minDist = d; closest = e; }
                }
                this.target = closest;
            }

            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = hypot(dx, dy) || 1;
                const steer = 0.1;
                this.vx += (dx/dist * this.speed - this.vx) * steer;
                this.vy += (dy/dist * this.speed - this.vy) * steer;
                const vLen = hypot(this.vx, this.vy) || 1;
                this.vx = (this.vx / vLen) * this.speed;
                this.vy = (this.vy / vLen) * this.speed;
            }
        }
        
        this.x += this.vx; this.y += this.vy; this.lifespan--; 
    }
}

export class ArcBolt extends Projectile {
    bounces: number; hitEnemies: Set<Enemy>; allEnemies: Enemy[];
    constructor(x: number, y: number, initialTarget: Enemy, allEnemies: Enemy[], damage: number, maxBounces: number, speed: number) {
        super(x, y, initialTarget.x, initialTarget.y, damage, speed, 6, '~', '#00FFFF');
        this.bounces = maxBounces; this.hitEnemies = new Set([initialTarget]);
        this.allEnemies = allEnemies; this.lifespan = 100;
    }
    update() { super.update(); }
    onHit(hitEnemy: Enemy) {
        this.bounces--;
        if (this.bounces <= 0) { this.lifespan = 0; return; }
        this.hitEnemies.add(hitEnemy);
        let nextTarget: Enemy | null = null, minDistance = Infinity;
        this.allEnemies.forEach(enemy => {
            if (!this.hitEnemies.has(enemy)) {
                const dist = hypot(this.x - enemy.x, this.y - enemy.y);
                if (dist < minDistance && dist < 250) { minDistance = dist; nextTarget = enemy; }
            }
        });
        if (nextTarget) {
            const dx = nextTarget.x - this.x, dy = nextTarget.y - this.y;
            const dist = hypot(dx, dy) || 1;
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else { this.lifespan = 0; }
    }
}

export class Singularity extends Entity {
    lifespan = 240; // 4 seconds
    maxLifespan = 240;
    char = 'O'; color = '#FF00FF';
    state: 'gathering' | 'detonating' | 'done' = 'gathering';
    
    constructor(x: number, y: number) { super(x, y, 250); }
    
    update() { 
        this.lifespan--; 
        if (this.lifespan <= 0 && this.state === 'gathering') {
            this.state = 'detonating';
            this.lifespan = 5; // visible explosion frames
        } else if (this.lifespan <= 0 && this.state === 'detonating') {
            this.state = 'done';
        }
    }

    render(ctx: CanvasRenderingContext2D) { 
        if (this.state === 'done') return;

        if (this.state === 'gathering') {
            const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            
            // Event horizon
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20 + pulse * 5, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.stroke();
            
            // Accretion disk visualization
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - (this.maxLifespan - this.lifespan) / this.maxLifespan), 0, Math.PI * 2);
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        } else if (this.state === 'detonating') {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export class Particle extends Entity {
    char: string; color: string; lifespan: number; vx: number; vy: number;
    constructor(x: number, y: number, color = '#FFA500', vx?: number, vy?: number, lifespan: number = 15, char?: string) {
        super(x, y, 0);
        this.color = color;
        this.char = char || ['*', '+', '.'][Math.floor(rand(0, 3))];
        this.vx = vx !== undefined ? vx : rand(-3, 3);
        this.vy = vy !== undefined ? vy : rand(-3, 3);
        this.lifespan = lifespan;
    }
    update() { this.x += this.vx; this.y += this.vy; this.lifespan--; }
    render(ctx: CanvasRenderingContext2D) { 
        ctx.globalAlpha = this.lifespan / 15; 
        ctx.fillStyle = this.color;
        // Optimized from fillText to fillRect for massive performance boost
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1; 
    }
}

export class Collectible extends Entity { value: number; char: string; color: string; constructor(x: number, y: number, value: number, radius: number, char: string, color: string) { super(x, y, radius); this.value = value; this.char = char; this.color = color; } }
export class XPOrb extends Collectible { constructor(x: number, y: number, value: number) { super(x, y, value, 8, '♦', '#BE42F5'); } }
export class Resource extends Collectible { constructor(x: number, y: number, value: number) { super(x, y, value, 8, 'Φ', '#00FFFF'); } }

export class Asteroid extends Entity {
    vertices: {x:number, y:number}[];
    health: number;
    maxHealth: number;
    
    constructor(x: number, y: number, r: number) {
        super(x, y, r);
        this.maxHealth = r * 2;
        this.health = this.maxHealth;
        
        this.vertices = [];
        const sides = Math.floor(rand(5, 9));
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const dist = r * rand(0.8, 1.2);
            this.vertices.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist
            });
        }
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = '#808080';
        ctx.fillStyle = '#202020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.vertices.length > 0) {
            ctx.moveTo(this.x + this.vertices[0].x, this.y + this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                ctx.lineTo(this.x + this.vertices[i].x, this.y + this.vertices[i].y);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
    }
    
    takeDamage(amount: number): boolean {
        this.health -= amount;
        return this.health <= 0;
    }
}

export class Star { 
    x: number; y: number; color: string; 
    constructor(x: number, y: number, color: string) { this.x = x; this.y = y; this.color = color; } 
    render(ctx: CanvasRenderingContext2D) { 
        ctx.fillStyle = this.color; 
        // Optimized from fillText to fillRect
        ctx.fillRect(this.x, this.y, 2, 2);
    } 
}
