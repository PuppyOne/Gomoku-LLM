import type { Player } from "../interfaces/player.js";
import type { Board } from "./board.js";

export class Game {
    constructor(private readonly board: Board, private readonly players: [Player, Player]) {}

    async start() {
        this.board.printBoard();
        while (true) {
            for (const player of this.players) {
                const move = await player.getMove(this.board);
                this.board.move(move, player.piece);
                this.board.printBoard();

                if (this.board.checkWin(move)) {
                    console.log(player.name, '获胜!');
                    return;
                }

                if (this.board.isBoardFull()) {
                    console.log('平局!');
                    return;
                }
            }
        }
    }
}