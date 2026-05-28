sed -i 's/entities.projectiles.push(new Projectile(/console.log("[GAME EVENT] Player fired projectile!"); entities.projectiles.push(new Projectile(/g' systems/database.ts
sed -i 's/console.log("LEVEL UP!");/console.log("[GAME EVENT] Player leveled up!");/g' hooks/useGameEngine.ts
sed -i 's/player.loadout.ability.activate/console.log("[GAME EVENT] Player activated ability: " + player.loadout.ability.name); player.loadout.ability.activate/g' hooks/useGameEngine.ts
