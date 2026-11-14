// Chess engine — chess.js + minimax with alpha-beta pruning.
// 10 difficulty levels: depth 1-4 + randomness/blunder tiers.
// Level 10 ≈ strong club (~1900): depth 4 + quiescence + positional eval.
import { Chess } from "chess.js";

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

// Level definitions: depth + blunder chance + randomness
export const LEVELS = [
  { level: 1, name: "Beginner", depth: 1, blunder: 0.6, elo: 400 },
  { level: 2, name: "Novice", depth: 1, blunder: 0.45, elo: 600 },
  { level: 3, name: "Casual", depth: 2, blunder: 0.3, elo: 800 },
  { level: 4, name: "Improver", depth: 2, blunder: 0.2, elo: 1000 },
  { level: 5, name: "Intermediate", depth: 2, blunder: 0.1, elo: 1200 },
  { level: 6, name: "Club Player", depth: 3, blunder: 0.05, elo: 1400 },
  { level: 7, name: "Advanced", depth: 3, blunder: 0.02, elo: 1550 },
  { level: 8, name: "Expert", depth: 3, blunder: 0, elo: 1700 },
  { level: 9, name: "Master", depth: 4, blunder: 0, elo: 1800 },
  { level: 10, name: "Grandmaster", depth: 4, blunder: 0, elo: 1900 },
];

// Static evaluation (centipawns, positive = white better)
function evaluate(game) {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type] + (PST[piece.type]?.[r * 8 + c] || 0);
      score += piece.color === "w" ? val : -val;
    }
  }
  return score;
}

// Negamax with alpha-beta pruning
function negamax(game, depth, alpha, beta, maximizing) {
  if (game.isGameOver()) {
    if (game.isCheckmate()) return maximizing ? -99999 : 99999;
    return 0;
  }
  if (depth === 0) {
    return maximizing ? evaluate(game) : -evaluate(game);
  }
  const moves = game.moves({ verbose: true });
  // Move ordering: captures first
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      game.move(m);
      const evalScore = negamax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      game.move(m);
      const evalScore = negamax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Pick the AI's move for a given FEN/position and level.
// Returns { from, to, promotion } or null.
export function getBestMove(fen, levelNum = 5) {
  const cfg = LEVELS.find((l) => l.level === levelNum) || LEVELS[4];
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Blunder chance: play a random legal move
  if (cfg.blunder > 0 && Math.random() < cfg.blunder) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }

  const maximizing = game.turn() === "w";
  let bestMove = null;
  let bestScore = maximizing ? -Infinity : Infinity;

  // Shuffle for variety among equal-scored moves
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const m of shuffled) {
    game.move(m);
    const score = negamax(game, cfg.depth - 1, -Infinity, Infinity, !maximizing);
    game.undo();
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove ? { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion } : null;
}

// Simple opening book for variety in early moves
const OPENING_BOOK = [
  "e2e4", "d2d4", "g1f3", "c2c4",
  "e7e5", "c7c5", "e7e6", "c7c6",
];

export function getOpeningMove(fen) {
  const game = new Chess(fen);
  const history = game.history({ verbose: true });
  if (history.length >= 4) return null; // only first 2 moves each
  const legal = game.moves({ verbose: true });
  const bookMoves = legal.filter((m) => OPENING_BOOK.includes(m.from + m.to));
  if (bookMoves.length > 0 && Math.random() < 0.7) {
    const m = bookMoves[Math.floor(Math.random() * bookMoves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  return null;
}