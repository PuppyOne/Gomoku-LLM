import { Board } from "./core/board.js";
import { Game } from "./core/game.js";
import { AIPlayer } from "./players/ai.js";
import { HumanPlayer } from "./players/human.js";

const humanPlayer = new HumanPlayer();
const aiPlayer = new AIPlayer();
const board = new Board(15);
const game = new Game(board, [humanPlayer, aiPlayer]);
await game.start();