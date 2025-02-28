import type { Board } from "../core/board.js";
import type { Coordinate } from "./coordinate.js";

export interface Player {
    name: string;
    piece: 'X' | 'O';

    getMove(board: Board): Promise<Coordinate>;
}