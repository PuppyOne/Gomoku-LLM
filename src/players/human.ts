import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { InvalidCoordinateError, type Board } from "../core/board.js";
import type { Coordinate } from "../interfaces/coordinate.js";
import type { Player } from "../interfaces/player.js";

export class HumanPlayer implements Player {
    name: string = 'human';
    piece: "X" | "O" = 'X';

    async getMove(board: Board): Promise<Coordinate> {
        const move = await input({
            message: '请输入落子坐标（如B3）: ',
            required: true,
            validate: input => {
                try {
                    this.parseInput(input, board);
                } catch (error) {
                    if (error instanceof InvalidCoordinateError)
                        return '无效坐标，请输入正确的坐标';
                    if (error instanceof InputError)
                        return '无效输入，请使用类似A1的格式';
                }
                return true;
            }
        });
        const coordiante = this.parseInput(move, board);
        return coordiante;
    }

    private parseInput(input: string, board: Board): Coordinate {
        const match = input.trim().toUpperCase().match(/([0-9A-E])/g);

        if (!match || match.length > 2) throw new InputError(input);

        const x = parseInt(match[1], 16);
        const y = parseInt(match[0], 16);

        board.validateCoordinate({ x, y });
        return { x, y };
    }
}

export class InputError extends Error {
    constructor(public readonly input: string) {
        super(`Invalid input: ${input}`);
        this.name = 'InputError';
    }
}
