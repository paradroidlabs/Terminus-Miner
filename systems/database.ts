
import { IWeapon, IAbility, IUltimate } from '../types';
import { Projectile, Singularity, Particle, XPOrb } from './entities';

// --- WEAPONS ---

const gatling: IWeapon = {
    id: 'w_gatling',
    name: 'Gatling Gun',
    damage: 8,
    fireRate: 100,
    projectileSpeed: 12,
    projectileRadius: 3,
    projectileChar: '.',
    projectileColor: '#FFFF00',
    fire: (player, mouse, entities, context) => {
        entities.projectiles.push(new Projectile(
            player.x, player.y,
            mouse.x, mouse.y,
            player.loadout.primary.damage,
            player.loadout.primary.projectileSpeed,
            player.loadout.primary.projectileRadius,
            player.loadout.primary.projectileChar,
            player.loadout.primary.projectileColor,
        ));
    }
};

const pulseCannon: IWeapon = {
    id: 'w_pulse_cannon',
    name: 'Pulse Cannon',
    damage: 20,
    fireRate: 150, // Reduced cooldown for better feel
    projectileSpeed: 8,
    projectileRadius: 6,
    projectileChar: 'o',
    projectileColor: '#00FF00',
    fire: (player, mouse, entities, context) => {
        if (context?.isCharged) {
            // CHARGED SHOT
            const p = new Projectile(
                player.x, player.y,
                mouse.x, mouse.y,
                player.loadout.primary.damage * 5, // 5x damage
                player.loadout.primary.projectileSpeed * 1.5, // Faster
                player.loadout.primary.projectileRadius * 3, // Bigger
                'O',
                '#00FFFF'
            );
            p.piercing = true;
            entities.projectiles.push(p);
        } else {
            // NORMAL TAP SHOT
            entities.projectiles.push(new Projectile(
                player.x, player.y,
                mouse.x, mouse.y,
                player.loadout.primary.damage,
                player.loadout.primary.projectileSpeed,
                player.loadout.primary.projectileRadius,
                player.loadout.primary.projectileChar,
                player.loadout.primary.projectileColor,
            ));
        }
    }
};

const missileLauncher: IWeapon = {
    id: 'w_missile',
    name: 'Homing Missiles',
    damage: 30,
    fireRate: 1500, // Slow fire rate
    projectileSpeed: 6,
    projectileRadius: 8,
    projectileChar: '>',
    projectileColor: '#FF4444',
    fire: (player, mouse, entities) => {
        // Fire 3 missiles in a spread
        for (let i = -1; i <= 1; i++) {
            const angleOffset = i * 0.2;
            const dx = mouse.x - player.x;
            const dy = mouse.y - player.y;
            const angle = Math.atan2(dy, dx) + angleOffset;
            
            const p = new Projectile(
                player.x, player.y,
                player.x + Math.cos(angle) * 100, 
                player.y + Math.sin(angle) * 100,
                player.loadout.secondary.damage,
                player.loadout.secondary.projectileSpeed,
                player.loadout.secondary.projectileRadius,
                player.loadout.secondary.projectileChar,
                player.loadout.secondary.projectileColor,
            );
            p.homing = true;
            entities.projectiles.push(p);
        }
    }
}


// --- ABILITIES (OVERDRIVE) ---

const defaultOverdrive: IAbility = {
    id: 'a_overdrive_blast',
    name: 'Repulsor Blast',
    maxCharge: 50,
    description: 'Unleash a shockwave, destroying all nearby enemies.',
    activate: (player, entities, kills) => {
        // Create shockwave particles
        for (let i = 0; i < 360; i += 10) {
            const angle = i * Math.PI / 180;
             entities.particles.push(new Particle(
                player.x, player.y, 
                '#00FFFF', 
                Math.cos(angle) * 8, 
                Math.sin(angle) * 8, 
                40, 
                '='
            ));
        }
        
        // Damage enemies
        entities.enemies.forEach(en => {
            if (Math.hypot(player.x - en.x, player.y - en.y) < 300) {
                kills.current++;
                entities.orbs.push(new XPOrb(en.x, en.y, en.type === 'brute' ? 15 : 5));
                // Particle explosion for dead enemy
                for(let k=0; k<10; k++) {
                     entities.particles.push(new Particle(en.x, en.y, en.color));
                }
            }
        });
        entities.enemies = entities.enemies.filter(en => Math.hypot(player.x - en.x, player.y - en.y) >= 300);
    }
};


// --- ULTIMATES ---

const singularity: IUltimate = {
    id: 'u_singularity',
    name: 'Singularity',
    maxCharge: 100,
    chargeRate: 2,
    description: 'Creates a gravity well that gathers enemies, then detonates.',
    activate: (player, entities) => {
        entities.ultimates.push(new Singularity(player.x, player.y));
    }
};

const novaBurst: IUltimate = {
    id: 'u_nova_burst',
    name: 'Nova Burst',
    maxCharge: 100,
    chargeRate: 1.5,
    description: 'Unleash a massive burst of projectiles in all directions.',
    activate: (player, entities) => {
        const numProjectiles = 36;
        for (let i = 0; i < numProjectiles; i++) {
            const angle = (i / numProjectiles) * 2 * Math.PI;
            const targetX = player.x + Math.cos(angle) * 100; // Arbitrary distance
            const targetY = player.y + Math.sin(angle) * 100;
             entities.projectiles.push(new Projectile(
                player.x, player.y,
                targetX, targetY,
                player.loadout.primary.damage * 0.75, // Ultimate projectile does % of weapon damage
                player.loadout.primary.projectileSpeed * 1.2,
                player.loadout.primary.projectileRadius,
                '!',
                '#FF55FF',
            ));
        }
    }
};

export const WEAPONS = {
    GATLING: gatling,
    PULSE_CANNON: pulseCannon,
    MISSILE_LAUNCHER: missileLauncher
};

export const ABILITIES = {
    OVERDRIVE_BLAST: defaultOverdrive,
};

export const ULTIMATES = {
    SINGULARITY: singularity,
    NOVA_BURST: novaBurst,
};
