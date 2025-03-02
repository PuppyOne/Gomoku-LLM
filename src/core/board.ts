import chalk from "chalk";
import type { Coordinate } from "../interfaces/coordinate.js";

export type Piece = 'X' | 'O' | ' ';

export class Board {
    private _board: Piece[][];
    lastMove: Coordinate | null = null;

    constructor(readonly size: number) {
        this._board = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => ' '));
    }

    get board(): Piece[][] {
        // 返回副本
        return this._board.map(row => [...row]);
    }

    isBoardFull(): boolean {
        return this._board.every(row => row.every(cell => cell !== ' '));
    }

    move(coordiante: Coordinate, piece: Piece): void {
        this.validateCoordinate(coordiante);

        const { x, y } = coordiante;
        this._board[y][x] = piece;
        this.lastMove = coordiante;
    }

    printBoard(highlight?: Coordinate): void {
        console.log('\n  ' + [...Array(this.size).keys()].map(n => n.toString(16).toUpperCase()).join(' '));

        this._board.forEach((row, i) => {
            const rowStr = row.map((cell, j) => {
                let color = chalk;
                if (highlight?.x === j && highlight?.y === i)
                    color = color.bgYellowBright;

                if (cell === 'X') return color.red('X');
                if (cell === 'O') return color.blue('O');
                return color.gray('·');
            }).join(' ');
            console.log(`${i.toString(16).toUpperCase()} ${rowStr}`);
        });
    }

    toString(): string {
        let result = '  ' + [...Array(this.size).keys()].join(' ') + '\n';

        result += this._board.map((row, i) => {
            const rowStr = row.map(cell => {
                if (cell === 'X') return 'X';
                if (cell === 'O') return 'O';
                return '·';
            }).join(' ');
            return `${i} ${rowStr}`;
        }).join('\n');

        return result;
    }

    checkWin({ x, y }: Coordinate): boolean {
        const directions: Coordinate[][] = [
            [{ x: -1, y: 0 }, { x: 1, y: 0 }],  // 水平
            [{ x: 0, y: -1 }, { x: 0, y: 1 }],  // 垂直
            [{ x: -1, y: -1 }, { x: 1, y: 1 }], // 主对角线
            [{ x: -1, y: 1 }, { x: 1, y: -1 }]  // 副对角线
        ];

        const currentPiece = this._board[y][x];

        return directions.some(direction => {
            let count = 1;
            for (const { x: deltaX, y: deltaY } of direction) {
                let currentX = x + deltaX;
                let currentY = y + deltaY;

                while (currentX >= 0 && currentX < this.size && currentY >= 0 && currentY < this.size && this._board[currentY][currentX] === currentPiece) {
                    count++;
                    currentX += deltaX;
                    currentY += deltaY;
                }
            }
            return count >= 5;
        });
    }

    /**
     * Throws an error if the coordinate is out of bounds or the space is not empty.
     * 
     * @param {Coordinate} coordinate - The coordinate to validate.
     * @throws {InvalidCoordinateError} If the coordinate is out of bounds or the space is not empty.
     */
    validateCoordinate({ x, y }: Coordinate): void {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size || this._board[y][x] !== ' ')
            throw new InvalidCoordinateError({ x, y });
    }
}

export class InvalidCoordinateError extends Error {
    constructor(public readonly coordinate: Coordinate) {
        super(`Invalid coordinate ${coordinate.x}, ${coordinate.y}`);
        this.name = 'InvalidCoordinateError';
    }
}
