
import { useRef, useState, useEffect, useCallback } from 'react';
import { GameStatus, PlayerStats, UpgradeOption, MouseState, GameEngineOptions } from '../types';
import * as C from '../constants';
import { WEAPONS, ABILITIES, ULTIMATES } from '../systems/database';
import { 
    Player, Enemy, Projectile, ArcBolt, Shield, Singularity, Particle, 
    XPOrb, Resource, Asteroid, Star, EnemyProjectile, EnemyType,
    rand, hypot 
} from '../systems/entities';

// --- THE HOOK ---
export default function useGameEngine({ gameStatus, onGameOver, onLevelUp, onResumeGame }: GameEngineOptions) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameId = useRef<number>(0);
    const lastTime = useRef(0);
    const gameTime = useRef(0);
    const gameStatusRef = useRef(gameStatus);
    useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);

    const worldBounds = { width: 4000, height: 4000 };
    const camera = useRef({ x: 0, y: 0 });
    const mouse = useRef<MouseState>({ x: 0, y: 0, isLeftDown: false, isRightDown: false, isInsideCanvas: false });
    const input = useRef({ keys: new Set<string>(), moveJoystick: { x: 0, y: 0 } });

    // Charge mechanics
    const chargeStartTime = useRef(0);
    const isCharging = useRef(false);

    const player = useRef<Player>(new Player(0,0, input.current, {
        primary: WEAPONS.PULSE_CANNON,
        secondary: WEAPONS.MISSILE_LAUNCHER,
        ability: ABILITIES.OVERDRIVE_BLAST,
        ultimate: ULTIMATES.SINGULARITY, // Changed to Singularity as requested
    }));
    const entities = useRef({
        enemies: [] as Enemy[], projectiles: [] as (Projectile | ArcBolt)[], particles: [] as Particle[],
        orbs: [] as XPOrb[], resources: [] as Resource[], asteroids: [] as Asteroid[],
        stars: [] as Star[], ultimates: [] as Singularity[], enemyProjectiles: [] as EnemyProjectile[]
    });

    const threatLevel = useRef(0);
    const threatTimer = useRef(0);
    const lastSpawnTime = useRef(0);
    const kills = useRef(0);
    
    const [playerStats, setPlayerStats] = useState<PlayerStats>({
        health: 0, maxHealth: 0, resources: 0, speed: 0, shieldHealth: 0,
        xp: 0, xpToNextLevel: 1, level: 1, overdrive: 0, ultimate: 0
    });
    const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([]);
    
    const resetGame = useCallback(() => {
        const initialLoadout = { 
            primary: WEAPONS.PULSE_CANNON, 
            secondary: WEAPONS.MISSILE_LAUNCHER,
            ability: ABILITIES.OVERDRIVE_BLAST, 
            ultimate: ULTIMATES.SINGULARITY 
        };
        player.current = new Player(worldBounds.width/2, worldBounds.height/2, input.current, initialLoadout);
        entities.current = { enemies: [], projectiles: [], particles: [], orbs: [], resources: [], asteroids: [], stars: [], ultimates: [], enemyProjectiles: [] };
        for (let i = 0; i < 500; i++) entities.current.stars.push(new Star(rand(0, worldBounds.width), rand(0, worldBounds.height), `rgba(255, 255, 255, ${rand(0.1, 0.6)})`));
        for (let i = 0; i < 100; i++) entities.current.asteroids.push(new Asteroid(rand(0, worldBounds.width), rand(0, worldBounds.height), rand(30, 80)));
        gameTime.current = 0; lastTime.current = 0; threatLevel.current = 0; threatTimer.current = 0; kills.current = 0;
    }, []);

    const updatePlayerStats = useCallback(() => {
        const p = player.current;
        setPlayerStats({
            health: p.health, maxHealth: p.maxHealth, resources: p.resources,
            speed: p.speed, shieldHealth: p.shield?.health ?? 0,
            xp: p.xp, xpToNextLevel: p.xpToNextLevel, level: p.level,
            overdrive: p.abilityCharge, ultimate: p.ultimateCharge,
        });
    }, []);

    const showLevelUpOptions = useCallback(() => {
        const p = player.current;
        const allOptions = [
            { id: 'repair', name: "Hull Repair (+50% HP)", cost: 5, action: () => { p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.5); }},
            { id: 'max_hp', name: "Reinforce Hull (+20 Max HP)", cost: 10, action: () => { p.maxHealth += 20; p.health += 20; }},
            { id: 'firerate', name: "Weapon Cooling (-10% Delay)", cost: 15, action: () => { p.loadout.primary.fireRate *= 0.9; }},
            { id: 'speed', name: "Engine Tune-up (+Speed)", cost: 10, action: () => { p.speed += 0.5; }},
            { id: 'damage', name: "High-Energy Rounds (+15% DMG)", cost: 20, action: () => { p.loadout.primary.damage *= 1.15; }},
            { id: 'shield', name: "Activate Shield System", cost: 25, action: () => { p.shield = new Shield(p); }},
            { id: 'arc', name: "Improve Arc Chain (+1)", cost: 15, action: () => { if (p.shield) p.shield.arcBounces++; }},
        ];
        const available = allOptions.filter(opt => !(opt.id === 'repair' && p.health >= p.maxHealth)).filter(opt => !(opt.id === 'shield' && p.shield)).filter(opt => !(opt.id === 'arc' && !p.shield));
        available.sort(() => 0.5 - Math.random());
        const options = available.slice(0, 3).map(opt => ({...opt, disabled: p.resources < opt.cost, action: () => { if (p.resources >= opt.cost) { p.resources -= opt.cost; opt.action(); onResumeGame(); } } }));
        
        options.push({
            id: 'skip',
            name: 'Skip Upgrades (Gain +25 Φ)',
            cost: 0,
            disabled: false,
            action: () => { p.resources += 25; onResumeGame(); }
        });

        setLevelUpOptions(options);
        onLevelUp();
    }, [onLevelUp, onResumeGame]);

    const gameLoop = useCallback((timestamp: number) => {
        animationFrameId.current = requestAnimationFrame(gameLoop);
        const p = player.current; const e = entities.current; const canvas = canvasRef.current; const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        if (!lastTime.current) lastTime.current = timestamp;
        const deltaTime = timestamp - lastTime.current; lastTime.current = timestamp;

        if (gameStatusRef.current === GameStatus.PLAYING) {
            gameTime.current += deltaTime / 1000;
            // --- UPDATES ---
            if (p.ultimateCharge < p.loadout.ultimate.maxCharge) p.ultimateCharge += (p.loadout.ultimate.chargeRate * deltaTime) / 1000;
            threatTimer.current += deltaTime;
            if (threatTimer.current > 20000 && threatLevel.current < 10) { threatLevel.current++; threatTimer.current = 0; }

            p.update(); p.shield?.update();
            camera.current.x = p.x - canvas.width / 2; camera.current.y = p.y - canvas.height / 2;
            
            // --- CONTROLS: CHARGE & FIRE ---
            
            // M1: Charge Logic
            if (mouse.current.isLeftDown && mouse.current.isInsideCanvas) {
                if (!isCharging.current) {
                    chargeStartTime.current = timestamp;
                    isCharging.current = true;
                }
                // Visual feedback for charging happens in render
            } else if (isCharging.current) {
                // Released
                const chargeDuration = timestamp - chargeStartTime.current;
                isCharging.current = false;
                
                // Tap vs Hold threshold
                if (chargeDuration < 300) {
                    // Tap: Normal Fire
                    if (timestamp - p.lastFireTime > p.loadout.primary.fireRate) {
                        p.loadout.primary.fire(p, mouse.current, e, { isCharged: false });
                        p.lastFireTime = timestamp;
                    }
                } else {
                    // Hold: Charged Fire
                    p.loadout.primary.fire(p, mouse.current, e, { isCharged: true });
                    p.lastFireTime = timestamp;
                }
            }

            // M2: Secondary Fire (Missiles)
            if (mouse.current.isRightDown && mouse.current.isInsideCanvas) {
                if (timestamp - p.lastSecondaryFireTime > p.loadout.secondary.fireRate) {
                    p.loadout.secondary.fire(p, mouse.current, e);
                    p.lastSecondaryFireTime = timestamp;
                }
            }

            // Shield Shooting
            if (p.shield && timestamp - p.shield.lastFireTime > p.shield.fireRate) { p.shield.lastFireTime = timestamp; let closestEnemy: Enemy | null = null; let minDistance = Infinity; e.enemies.forEach(enemy => { const dist = hypot(p.shield!.x - enemy.x, p.shield!.y - enemy.y); if (dist < minDistance && dist < 400) { minDistance = dist; closestEnemy = enemy; } }); if (closestEnemy) { e.projectiles.push(new ArcBolt(p.shield.x, p.shield.y, closestEnemy, e.enemies, p.loadout.primary.damage / 2, p.shield.arcBounces, p.shield.arcProjectileSpeed)); } }

            // Abilities
            if (input.current.keys.has('shift') && p.abilityCharge >= p.loadout.ability.maxCharge) { p.abilityCharge = 0; p.loadout.ability.activate(p, e, kills); }
            if (input.current.keys.has(' ') && p.ultimateCharge >= p.loadout.ultimate.maxCharge) { p.ultimateCharge = 0; p.loadout.ultimate.activate(p, e); }
            
            // Entity updates & filtering
            e.projectiles.forEach(pr => pr.update(e.enemies)); e.enemies.forEach(en => en.update(deltaTime, e)); e.ultimates.forEach(u => u.update()); e.particles.forEach(pa => pa.update()); e.enemyProjectiles.forEach(ep => ep.update());
            e.projectiles = e.projectiles.filter(pr => pr.lifespan > 0); e.ultimates = e.ultimates.filter(u => u.state !== 'done'); e.particles = e.particles.filter(pa => pa.lifespan > 0); e.enemyProjectiles = e.enemyProjectiles.filter(ep => ep.lifespan > 0);

            // --- COLLISIONS ---
            
            // Projectiles vs Enemies & Asteroids
            for (let i = e.projectiles.length - 1; i >= 0; i--) { 
                const pr = e.projectiles[i];
                if (!pr) continue;
                
                let hit = false;
                // Hit Enemy
                for (let j = e.enemies.length - 1; j >= 0; j--) { 
                    const en = e.enemies[j]; 
                    if (en && hypot(pr.x - en.x, pr.y - en.y) < pr.radius + en.radius) { 
                        if (pr instanceof ArcBolt) pr.onHit(en); 
                        else if (!pr.piercing) { hit = true; } // If not piercing, mark hit
                        
                        en.takeDamage(pr.damage); 
                        e.particles.push(new Particle(pr.x, pr.y, en.color)); 
                        if (en.health <= 0) { 
                            kills.current++; 
                            e.orbs.push(new XPOrb(en.x, en.y, en.type === 'brute' ? 15 : 5)); 
                            for(let k=0; k<10; k++) e.particles.push(new Particle(en.x, en.y, en.color)); 
                            e.enemies.splice(j, 1); 
                        } 
                        if (hit) break;
                    } 
                }
                
                if (hit) { e.projectiles.splice(i, 1); continue; }

                // Hit Asteroid
                for (let k = e.asteroids.length - 1; k >= 0; k--) {
                    const a = e.asteroids[k];
                    // Simple circle collision for asteroids to save perf
                    if (hypot(pr.x - a.x, pr.y - a.y) < pr.radius + a.radius) {
                        if (!pr.piercing) hit = true;
                        
                        const destroyed = a.takeDamage(pr.damage);
                        e.particles.push(new Particle(pr.x, pr.y, '#808080', rand(-2,2), rand(-2,2), 10));
                        
                        if (destroyed) {
                            // Spawn Resources
                            const amount = Math.floor(a.radius / 10);
                            for(let r=0; r<amount; r++) {
                                e.resources.push(new Resource(a.x + rand(-20,20), a.y + rand(-20,20), 1));
                            }
                            // Explosion
                            for(let p=0; p<15; p++) e.particles.push(new Particle(a.x, a.y, '#808080', rand(-5,5), rand(-5,5), 30));
                            e.asteroids.splice(k, 1);
                        }
                        
                        if (hit) break;
                    }
                }
                 if (hit) { e.projectiles.splice(i, 1); }
            }

            // Player vs Enemies
            for (let i = e.enemies.length - 1; i >= 0; i--) { const en = e.enemies[i]; if (en && hypot(p.x - en.x, p.y - en.y) < p.radius + en.radius) { p.takeDamage(10); e.enemies.splice(i, 1); if (p.health <= 0) onGameOver(kills.current, gameTime.current); } }
            // Player vs Enemy Projectiles
            for (let i = e.enemyProjectiles.length - 1; i >= 0; i--) { const ep = e.enemyProjectiles[i]; if (ep && hypot(p.x - ep.x, p.y - ep.y) < p.radius + ep.radius) { p.takeDamage(ep.damage); e.enemyProjectiles.splice(i, 1); if (p.health <= 0) onGameOver(kills.current, gameTime.current); } }
            // Player vs Orbs/Resources
            for (let i = e.orbs.length - 1; i >= 0; i--) { const o = e.orbs[i]; if(o && hypot(p.x - o.x, p.y - o.y) < p.radius + o.radius + 30){ p.xp += o.value; if(p.abilityCharge < p.loadout.ability.maxCharge) p.abilityCharge += o.value; e.orbs.splice(i, 1); } }
            for (let i = e.resources.length - 1; i >= 0; i--) { const r = e.resources[i]; if(r && hypot(p.x - r.x, p.y - r.y) < p.radius + r.radius + 30){ p.resources += r.value; e.resources.splice(i, 1); } }
            
            // Ultimate (Singularity) Physics
            e.ultimates.forEach(u => {
                if (u.state === 'gathering') {
                    e.enemies.forEach(en => { 
                        const d = hypot(u.x - en.x, u.y - en.y);
                        if(d < u.radius + 200) { 
                            // Strong Suck in
                            const force = 1500 / (d*d + 1);
                            en.x += (u.x-en.x) * force; 
                            en.y += (u.y-en.y) * force; 
                        }
                    });
                } else if (u.state === 'detonating') {
                    // BOOM
                    e.enemies.forEach(en => {
                        if (hypot(u.x - en.x, u.y - en.y) < u.radius * 1.2) {
                            en.takeDamage(500); // Massive damage
                            e.particles.push(new Particle(en.x, en.y, en.color));
                            if (en.health <= 0) {
                                kills.current++;
                                e.orbs.push(new XPOrb(en.x, en.y, 10));
                                e.enemies.splice(e.enemies.indexOf(en), 1);
                            }
                        }
                    });
                    // Explosion particles
                    for(let k=0; k<30; k++) {
                        e.particles.push(new Particle(u.x, u.y, '#FF00FF', rand(-10,10), rand(-10,10), 50));
                    }
                    u.state = 'done';
                }
            });
            e.enemies = e.enemies.filter(en => en.health > 0);
            
            // Spawning
            const spawnRate = 1200 - (threatLevel.current * 100); if (timestamp - lastSpawnTime.current > spawnRate) { lastSpawnTime.current = timestamp; const side = Math.floor(rand(0,4)); let x,y; const dist = Math.max(canvas.width/2, canvas.height/2)+50; if (side === 0) { x=p.x+rand(-canvas.width/2, canvas.width/2); y=p.y-dist; } else if (side === 1) { x=p.x+dist; y=p.y+rand(-canvas.height/2, canvas.height/2); } else if (side === 2) { x=p.x+rand(-canvas.width/2, canvas.width/2); y=p.y+dist; } else { x=p.x-dist; y=p.y+rand(-canvas.height/2, canvas.height/2); } let type: EnemyType = 'scout'; const roll = Math.random(); if (threatLevel.current > 4 && roll > 0.8) { type = 'sniper'; } else if (threatLevel.current > 2 && roll > 0.6) { type = 'dasher'; } else if (threatLevel.current > 1 && roll > 0.4) { type = 'brute'; } e.enemies.push(new Enemy(x,y,p,type)); }
            if (p.xp >= p.xpToNextLevel) { p.level++; p.xp -= p.xpToNextLevel; p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5); showLevelUpOptions(); }
            updatePlayerStats();
        }

        // --- RENDERING ---
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.save();
        
        // Camera transform
        ctx.translate(-camera.current.x, -camera.current.y);
        
        ctx.font = `${C.FONT_SIZE}px "Share Tech Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // Viewport Culling Helper
        const vw = canvas.width;
        const vh = canvas.height;
        const cx = camera.current.x;
        const cy = camera.current.y;
        // Add a margin for entities (like asteroids) that might be partially on screen
        const margin = 100;
        
        const isVisible = (e: {x: number, y: number, radius?: number}) => {
             // radius check is ideal, but a safe margin works for all point-like objects
             const r = e.radius || 20;
             return e.x + r >= cx - margin && e.x - r <= cx + vw + margin &&
                    e.y + r >= cy - margin && e.y - r <= cy + vh + margin;
        };

        // Render visible entities only
        e.stars.forEach(s => { if (isVisible(s)) s.render(ctx); });
        e.asteroids.forEach(a => { if (isVisible(a)) a.render(ctx); });
        e.resources.forEach(r => { if (isVisible(r)) r.render(ctx, r.char, r.color); });
        e.orbs.forEach(o => { if (isVisible(o)) o.render(ctx, o.char, o.color); });
        e.projectiles.forEach(pr => { if (isVisible(pr)) pr.render(ctx, pr.char, pr.color); });
        e.enemyProjectiles.forEach(ep => { if (isVisible(ep)) ep.render(ctx, ep.char, ep.color); });
        e.enemies.forEach(en => { if (isVisible(en)) en.render(ctx); });
        
        // Always render player
        p.render(ctx, p.char, p.color); 
        p.shield?.render(ctx);
        
        e.ultimates.forEach(u => u.render(ctx)); // Ultimates usually big, just render
        e.particles.forEach(pa => { if (isVisible(pa)) pa.render(ctx); });
        
        // Charge Indicator
        if (isCharging.current) {
            const duration = timestamp - chargeStartTime.current;
            const maxCharge = 300; // Visual threshold matches the 300ms tap/charge split
            const chargePct = Math.min(duration / maxCharge, 1);
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 20 + (chargePct * 10), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + chargePct * 0.7})`;
            ctx.lineWidth = 2 + chargePct * 2;
            ctx.stroke();
        }

        ctx.restore();

        // MINIMAP
        const mapSize = 150, mapX = canvas.width - mapSize - 20, mapY = 50; const viewPortSize = 2000; const scale = mapSize / viewPortSize; ctx.strokeStyle = '#00FF00'; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(mapX, mapY, mapSize, mapSize); ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        ctx.fillStyle = '#808080'; e.asteroids.forEach(a => { const dx = a.x - p.x, dy = a.y - p.y; if (Math.abs(dx) < viewPortSize / 2 && Math.abs(dy) < viewPortSize / 2) { ctx.fillRect(mapX + mapSize / 2 + dx * scale - 1, mapY + mapSize / 2 + dy * scale - 1, 2, 2); } });
        ctx.fillStyle = '#FF0000'; e.enemies.forEach(en => { const dx = en.x - p.x, dy = en.y - p.y; if (Math.abs(dx) < viewPortSize / 2 && Math.abs(dy) < viewPortSize / 2) { ctx.fillRect(mapX + mapSize / 2 + dx * scale - 1, mapY + mapSize / 2 + dy * scale - 1, 2, 2); } });
        ctx.fillStyle = '#00FF00'; ctx.fillRect(mapX + mapSize / 2 - 2, mapY + mapSize / 2 - 2, 4, 4);
        
    }, [onGameOver, updatePlayerStats, showLevelUpOptions]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctxRef.current = canvas.getContext('2d'); resetGame(); animationFrameId.current = requestAnimationFrame(gameLoop); }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [gameLoop, resetGame]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === ' ') e.preventDefault(); input.current.keys.add(e.key.toLowerCase()); }
        const handleKeyUp = (e: KeyboardEvent) => input.current.keys.delete(e.key.toLowerCase());
        
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) mouse.current.isLeftDown = true;
            if (e.button === 2) mouse.current.isRightDown = true;
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) mouse.current.isLeftDown = false;
            if (e.button === 2) mouse.current.isRightDown = false;
        };
        
        const handleMouseMove = (e: MouseEvent) => { const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); mouse.current.x = e.clientX - rect.left + camera.current.x; mouse.current.y = e.clientY - rect.top + camera.current.y; };
        const handleMouseEnter = () => mouse.current.isInsideCanvas = true;
        const handleMouseLeave = () => { mouse.current.isInsideCanvas = false; mouse.current.isLeftDown = false; mouse.current.isRightDown = false; };
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        const canvas = canvasRef.current;
        if(canvas) { 
            canvas.addEventListener('mousedown', handleMouseDown); 
            canvas.addEventListener('mouseup', handleMouseUp); 
            canvas.addEventListener('mousemove', handleMouseMove); 
            canvas.addEventListener('mouseenter', handleMouseEnter); 
            canvas.addEventListener('mouseleave', handleMouseLeave);
            canvas.addEventListener('contextmenu', handleContextMenu);
        }
        return () => { 
            window.removeEventListener('keydown', handleKeyDown); 
            window.removeEventListener('keyup', handleKeyUp); 
            if(canvas) { 
                canvas.removeEventListener('mousedown', handleMouseDown); 
                canvas.removeEventListener('mouseup', handleMouseUp); 
                canvas.removeEventListener('mousemove', handleMouseMove); 
                canvas.removeEventListener('mouseenter', handleMouseEnter); 
                canvas.removeEventListener('mouseleave', handleMouseLeave);
                canvas.removeEventListener('contextmenu', handleContextMenu);
            } 
        };
    }, []);

    const setMoveJoystick = useCallback((x: number, y: number) => {
        input.current.moveJoystick = { x, y };
    }, []);

    const setAimJoystick = useCallback((x: number, y: number, isFiring: boolean) => {
        if (x !== 0 || y !== 0) {
            // Convert normalized joystick coordinates (-1 to 1) to world coordinates relative to player
            const canvas = canvasRef.current;
            if (canvas) {
                // We simulate the mouse being at a distance in the direction of the joystick
                const aimDistance = 300; 
                mouse.current.x = player.current.x + (x * aimDistance);
                mouse.current.y = player.current.y + (y * aimDistance);
            }
        }
        mouse.current.isLeftDown = isFiring;
        mouse.current.isInsideCanvas = true; // Ensure firing works
    }, []);

    const setActionKey = useCallback((key: string, isDown: boolean) => {
        if (key === 'rmb') {
            mouse.current.isRightDown = isDown;
            mouse.current.isInsideCanvas = true;
        } else {
            if (isDown) {
                input.current.keys.add(key);
            } else {
                input.current.keys.delete(key);
            }
        }
    }, []);

    const p = player.current;
    return { 
        canvasRef, playerStats, gameTime: gameTime.current, kills: kills.current, 
        threatLevel: threatLevel.current, levelUpOptions,
        setMoveJoystick, setAimJoystick, setActionKey
    };
}
