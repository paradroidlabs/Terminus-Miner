
import React, { useState, useCallback } from 'react';
import Game from './components/Game';
import { GameStatus } from './types';

interface MainMenuProps {
  onStartGame: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => (
  <div className="absolute inset-0 flex flex-col justify-center items-center">
    <div className="flex flex-col items-center gap-5 bg-black/80 p-10 border border-green-400 pointer-events-auto shadow-lg shadow-green-500/20">
      <h1 className="text-5xl font-bold text-shadow-green">
        TERMINUS
      </h1>
      <p className="text-lg max-w-md text-center leading-relaxed">
        You are a miner ambushed by hostiles.
        <br />
        Left Stick: Move | Right Stick: Aim
        <br />
        Tap Right Stick: Quick Fire
        <br />
        Hold Right Stick: Charge Shot (Release to fire)
        <br />
        Use on-screen buttons for Abilities
      </p>
      <button
        onClick={onStartGame}
        className="bg-gray-900 text-green-400 border-2 border-green-400 px-5 py-2 text-lg transition-all hover:bg-green-400 hover:text-gray-900 hover:shadow-lg hover:shadow-green-400/50"
      >
        Engage
      </button>
    </div>
  </div>
);

interface GameOverScreenProps {
  score: number;
  gameTime: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, gameTime, onRestart }) => (
  <div className="absolute inset-0 flex flex-col justify-center items-center">
    <div className="flex flex-col items-center gap-5 bg-black/80 p-10 border border-red-500 pointer-events-auto shadow-lg shadow-red-500/20">
      <h1 className="text-5xl font-bold text-red-500 text-shadow-red">
        Ship Destroyed
      </h1>
      <p className="text-lg text-center leading-relaxed text-gray-300">
        You survived for: {gameTime.toFixed(2)} seconds
        <br />
        and destroyed {score} hostiles.
      </p>
      <button
        onClick={onRestart}
        className="bg-gray-900 text-red-500 border-2 border-red-500 px-5 py-2 text-lg transition-all hover:bg-red-500 hover:text-gray-900 hover:shadow-lg hover:shadow-red-500/50"
      >
        Retry
      </button>
    </div>
  </div>
);

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [finalStats, setFinalStats] = useState({ score: 0, time: 0 });

  const handleStartGame = useCallback(() => {
    setGameStatus(GameStatus.PLAYING);
  }, []);

  const handleGameOver = useCallback((score: number, time: number) => {
    setFinalStats({ score, time });
    setGameStatus(GameStatus.GAME_OVER);
  }, []);

  const handleLevelUp = useCallback(() => {
    setGameStatus(GameStatus.LEVEL_UP);
  }, []);

  const handleResumeGame = useCallback(() => {
    setGameStatus(GameStatus.PLAYING);
  }, []);

  const renderContent = () => {
    switch (gameStatus) {
      case GameStatus.MENU:
        return <MainMenu onStartGame={handleStartGame} />;
      case GameStatus.PLAYING:
      case GameStatus.LEVEL_UP:
        return (
          <Game
            gameStatus={gameStatus}
            onGameOver={handleGameOver}
            onLevelUp={handleLevelUp}
            onResumeGame={handleResumeGame}
          />
        );
      case GameStatus.GAME_OVER:
        return <GameOverScreen score={finalStats.score} gameTime={finalStats.time} onRestart={handleStartGame} />;
      default:
        return <MainMenu onStartGame={handleStartGame} />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black cursor-crosshair">
      {renderContent()}
    </div>
  );
}

export default App;
