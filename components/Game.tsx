
import React, { useState, useRef } from 'react';
import useGameEngine from '../hooks/useGameEngine';
import { GameStatus, PlayerStats, UpgradeOption, GameEngineOptions } from '../types';
import { WEAPONS, ABILITIES, ULTIMATES } from '../systems/database'; // We need this to get max values

interface HudProps {
  stats: PlayerStats;
  gameTime: number;
  kills: number;
  threatLevel: number;
}

const UIBar: React.FC<{
    value: number;
    maxValue: number;
    color: string;
    className?: string;
    label?: string | React.ReactNode;
}> = ({ value, maxValue, color, className = '', label }) => (
    <div className={`relative border-2 border-green-400 bg-gray-900/70 p-0.5 ${className}`}>
        {label}
        <div 
            className="h-full transition-all duration-200"
            style={{ width: `${(value / (maxValue || 1)) * 100}%`, backgroundColor: color }}
        ></div>
    </div>
);

const Hud: React.FC<HudProps> = ({ stats, gameTime, kills, threatLevel }) => (
    <div className="absolute inset-0 pointer-events-none text-white">
        {/* Top Left */}
        <div className="absolute top-5 left-5 flex flex-col gap-2">
            <UIBar
                value={stats.health}
                maxValue={stats.maxHealth}
                color="#FF0000"
                className="w-64 h-5"
                label={
                    <div className="absolute inset-0 flex items-center justify-center text-sm">
                        HP: {Math.ceil(stats.health)} / {stats.maxHealth}
                    </div>
                }
            />
            <div className="text-gray-300 bg-black/50 p-2 border-l-2 border-green-400">
                <div>Φ {stats.resources}</div>
                <div>Kills: {kills}</div>
                <div>Time: {gameTime.toFixed(2)}s</div>
                <hr className="border-gray-600 my-1" />
                {/* ATK now depends on equipped weapon, which we don't have here.
                    This would require passing the player's loadout to the HUD,
                    or calculating derived stats in the hook. For now, we omit it. */}
                <div>DEF: {stats.shieldHealth}</div>
                <div>SPD: {stats.speed.toFixed(1)}</div>
            </div>
        </div>
        
        {/* Top Right */}
        <div className="absolute top-5 right-5 w-52">
             <div className="text-center text-sm text-green-400 -mb-1">THREAT LEVEL</div>
            <UIBar value={threatLevel} maxValue={10} color="#FFA500" className="h-4" />
        </div>
        
        {/* Bottom Center */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-2">
            {/* Note: In a full implementation, the max values and labels should come from the player's loadout */}
            <UIBar 
                value={stats.ultimate} 
                maxValue={ULTIMATES.NOVA_BURST.maxCharge} 
                color="#FF00FF" 
                className="w-1/4 h-3 border-purple-400"
                label={
                    <div className="absolute inset-0 text-center text-xs -mt-0.5 text-white">ULTIMATE [SPACE]</div>
                }
            />
            <UIBar 
                value={stats.overdrive} 
                maxValue={ABILITIES.OVERDRIVE_BLAST.maxCharge}
                color="#00FFFF" 
                className="w-1/3 h-4"
                label={
                    <div className="absolute inset-0 text-center text-sm -mt-0.5 text-black">ABILITY [SHIFT]</div>
                }
            />
            <UIBar 
                value={stats.xp} 
                maxValue={stats.xpToNextLevel} 
                color="#BE42F5" 
                className="w-1/2 h-2.5"
                label={
                    <div className="absolute inset-0 text-center text-xs text-white">LVL {stats.level}</div>
                }
            />
        </div>
    </div>
);


interface LevelUpModalProps {
  options: UpgradeOption[];
  onSelectUpgrade: (option: UpgradeOption) => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ options, onSelectUpgrade }) => (
    <div className="absolute inset-0 flex justify-center items-center bg-black/70">
        <div className="bg-black border-2 border-cyan-400 p-6 text-center text-cyan-400 shadow-2xl shadow-cyan-500/30">
            <h2 className="text-3xl mb-4 text-shadow-cyan">Level Up! Select Upgrade</h2>
            <div className="flex flex-col gap-3">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => onSelectUpgrade(opt)}
                        disabled={opt.disabled}
                        className="w-96 border border-cyan-400 p-3 text-left transition-colors enabled:hover:bg-cyan-400 enabled:hover:text-black disabled:border-gray-600 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        <span className="font-bold">{opt.name}</span>
                        <br />
                        <span className="text-sm">
                            {opt.cost > 0 ? `Cost: ${opt.cost} Φ` : <span className="text-green-400">FREE</span>}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    </div>
);


const Joystick: React.FC<{
    onMove: (x: number, y: number) => void;
    onEnd: () => void;
    className?: string;
}> = ({ onMove, onEnd, className = '' }) => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const baseRef = useRef<HTMLDivElement>(null);
    const touchId = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (touchId.current !== null) return;
        const touch = e.changedTouches[0];
        touchId.current = touch.identifier;
        updatePos(touch);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                updatePos(e.changedTouches[i]);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                touchId.current = null;
                setPos({ x: 0, y: 0 });
                onEnd();
            }
        }
    };

    const updatePos = (touch: React.Touch) => {
        if (!baseRef.current) return;
        const rect = baseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const maxDist = rect.width / 2;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        setPos({ x: dx, y: dy });
        onMove(dx / maxDist, dy / maxDist);
    };

    return (
        <div 
            ref={baseRef}
            className={`w-32 h-32 rounded-full border-2 border-white/30 bg-black/40 relative touch-none ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <div 
                className="w-12 h-12 rounded-full bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
            />
        </div>
    );
};

const ActionButton: React.FC<{
    label: string;
    colorClass: string;
    onTouch: (isDown: boolean) => void;
}> = ({ label, colorClass, onTouch }) => (
    <button 
        className={`w-14 h-14 rounded-full border-2 text-white font-bold flex items-center justify-center touch-none select-none ${colorClass}`}
        onTouchStart={(e) => { e.preventDefault(); onTouch(true); }}
        onTouchEnd={(e) => { e.preventDefault(); onTouch(false); }}
        onTouchCancel={(e) => { e.preventDefault(); onTouch(false); }}
    >
        {label}
    </button>
);

const MobileControls: React.FC<{
    setMoveJoystick: (x: number, y: number) => void;
    setAimJoystick: (x: number, y: number, isFiring: boolean) => void;
    setActionKey: (key: string, isDown: boolean) => void;
}> = ({ setMoveJoystick, setAimJoystick, setActionKey }) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-8 z-40">
            {/* Left side: Move Joystick */}
            <div className="pointer-events-auto">
                <Joystick 
                    onMove={setMoveJoystick} 
                    onEnd={() => setMoveJoystick(0, 0)} 
                />
            </div>

            {/* Right side: Aim Joystick & Action Buttons */}
            <div className="relative pointer-events-auto">
                <div className="absolute -top-20 -left-4">
                    <ActionButton 
                        label="ABL" 
                        colorClass="bg-cyan-500/40 border-cyan-400 active:bg-cyan-500/70" 
                        onTouch={(down) => setActionKey('shift', down)} 
                    />
                </div>
                <div className="absolute -top-24 left-12">
                    <ActionButton 
                        label="ULT" 
                        colorClass="bg-purple-500/40 border-purple-400 active:bg-purple-500/70" 
                        onTouch={(down) => setActionKey(' ', down)} 
                    />
                </div>
                <div className="absolute -top-8 -left-20">
                    <ActionButton 
                        label="SEC" 
                        colorClass="bg-red-500/40 border-red-400 active:bg-red-500/70" 
                        onTouch={(down) => setActionKey('rmb', down)} 
                    />
                </div>
                <Joystick 
                    onMove={(x, y) => setAimJoystick(x, y, true)} 
                    onEnd={() => setAimJoystick(0, 0, false)} 
                />
            </div>
        </div>
    );
};

const Game: React.FC<GameEngineOptions> = (props) => {
  const { 
      canvasRef, playerStats, gameTime, kills, threatLevel, levelUpOptions,
      setMoveJoystick, setAimJoystick, setActionKey
  } = useGameEngine(props);

  const handleSelectUpgrade = (option: UpgradeOption) => {
    option.action();
  };

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      <Hud stats={playerStats} gameTime={gameTime} kills={kills} threatLevel={threatLevel} />
      <MobileControls 
          setMoveJoystick={setMoveJoystick} 
          setAimJoystick={setAimJoystick} 
          setActionKey={setActionKey} 
      />
      {props.gameStatus === GameStatus.LEVEL_UP && levelUpOptions && (
        <LevelUpModal options={levelUpOptions} onSelectUpgrade={handleSelectUpgrade} />
      )}
    </div>
  );
};

export default Game;
