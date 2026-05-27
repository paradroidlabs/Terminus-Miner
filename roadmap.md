# TERMINUS Development Roadmap

## Vision

Transform TERMINUS from a single-experience game into a highly replayable, dynamic roguelite. The core gameplay loop will revolve around creating powerful, synergistic combos between swappable weapons, abilities, and ultimates. The game world will react to player progress, introducing new challenges, boss encounters, and visual shifts to keep every run fresh and exciting.

---

### Phase 1: The Armory Update (Core Systems Refactor) - **COMPLETE**

This phase is foundational, rebuilding core player systems to be modular and data-driven.

-   **[X] Modular Systems:** Abstract hardcoded player attacks and abilities into distinct, interchangeable modules:
    -   `IWeapon`: Defines firing pattern, projectile type, damage, fire rate, etc.
    -   `IAbility`: Defines the "Overdrive" effect (e.g., screen-clearing blast, defensive pulse, temporary buff).
    -   `IUltimate`: Defines the "Singularity" effect (e.g., enemy vortex, massive projectile burst, time dilation field).

-   **[X] Data-Driven Design:** Create a mock database (`database.ts`) to store definitions for all weapons, abilities, and ultimates. This simulates fetching data from a service like Firebase and makes adding new content trivial.

-   **[X] Player Loadout:** Implement a `Loadout` system on the `Player` class. The player's capabilities will now be determined by their currently equipped items, which are pulled from the database.

-   **[X] Proof of Concept:** Implement one new weapon (`Pulse Cannon`) and one new ultimate (`Nova Burst`) to validate the new modular system.

---

### Phase 2: Expanding the Arsenal (Content & Combos)

With the core system in place, this phase focuses on adding a wide variety of content to enable strategic choices and emergent combos.

-   **New Weapons:**
    -   `Boomerang Shot`: Fires a projectile that travels a certain distance and then returns to the player, hitting enemies on both paths.
    -   `Homing Missiles`: Fires slow-moving projectiles that actively seek the nearest enemy or the player's cursor.
    -   `Tri-Shot`: A shotgun-like weapon that fires a spread of three projectiles.
    -   `Chain Laser`: A continuous beam of energy that chains between nearby enemies.

-   **New Abilities (Overdrives):**
    -   `Repulsor Wave`: Pushes all enemies away and destroys nearby projectiles.
    -   `Chrono Field`: Temporarily slows down all enemies and their projectiles within a radius.
    -   `Berserk Mode`: Massively increases fire rate and speed for a short duration.

-   **New Ultimates:**
    -   `Summon Drone`: Deploys an autonomous drone that follows the player and fires at enemies.
    -   `Orbital Strike`: Marks a location for a devastating, high-damage explosion after a short delay.
    -   `Phase Shift`: Renders the player invincible and able to pass through enemies for a few seconds.

-   **Upgrade System Integration:** Allow level-up upgrades to modify the player's equipped loadout (e.g., "+1 Boomerang bounce", "Homing Missiles now explode on impact").

-   **Loadout Selection UI:** Implement a screen (e.g., at the start of a run or at certain level-up intervals) where the player can choose their weapon, ability, and ultimate.

---

### Phase 3: The Threat Evolves (Dynamic World & Bosses)

This phase makes the game world feel alive and reactive, creating a more compelling difficulty curve and memorable moments.

-   **Boss Encounters:**
    -   Design unique boss enemies that appear at specific threat levels or time milestones.
    -   Bosses will have multiple attack patterns, distinct phases, and unique visual designs.
    -   Examples: "The Swarm Mother" (spawns waves of unique minions), "The Juggernaut" (a heavily armored foe with devastating charge attacks).

-   **Dynamic Environment:**
    -   As the `threatLevel` increases, introduce visual and gameplay changes.
    -   **Visual Glitches:** Apply post-processing effects to the canvas (e.g., scan lines, chromatic aberration, pixelation) that intensify over time.
    -   **Color Shifting:** The entire game's color palette will shift towards a "TRON-like" aesthetic at high threat levels, with neon outlines and a darker background.
    -   **Environmental Hazards:** Introduce new elements like drifting space mines, energy fields that damage the player, or asteroid clusters that block movement.

---

### Phase 4: Polishing the Terminus (UX & Long-Term)

This phase focuses on improving the user experience and adding features that encourage long-term engagement.

-   **UI/UX Overhaul:** Refine the HUD to better communicate ability cooldowns and synergistic effects. Design a sleek, intuitive loadout management screen.
-   **Sound Design:** Add distinct sound effects for each weapon, ability, and enemy to enhance feedback and game feel.
-   **Meta-Progression:** Introduce a system where resources earned during a run can be used to unlock new weapons or starting loadouts for future runs.
-   **Balancing:** Continuously tune weapon stats, enemy health/speed, and upgrade costs based on gameplay data and feedback.
