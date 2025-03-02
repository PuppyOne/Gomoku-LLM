import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import config from '../config.json' with { type: 'json' };
import { InvalidCoordinateError, type Board } from "../core/board.js";
import type { Coordinate } from "../interfaces/coordinate.js";
import type { Player } from "../interfaces/player.js";
import { confirm } from "@inquirer/prompts";
import { prompts } from "../prompts/prompts.js";

const client = new OpenAI({
    baseURL: config.model.baseURL,
    apiKey: config.model.apiKey
});

export class AIPlayer implements Player {
    name: string = 'ai';
    piece: "X" | "O" = 'O';
    private config = config;
    private messages: ChatCompletionMessageParam[] = [{
        role: 'system',
        content: prompts.initialPrompt()
    }];

    async getMove(board: Board): Promise<Coordinate> {
        const boardStr = board.toString();
        this.messages.push({
            role: 'user',
            content: prompts.userPrompt({
                lastMove: board.lastMove,
                boardStr
            })
        });

        while (true) {
            const tries = this.config.model.maxRetries;
            for (let i = 0; i < tries; i++) {
                try {
                    return await this.getMoveFromAI(board);
                } catch (error) {
                    if (error instanceof InvalidCoordinateError)
                        this.messages.push({
                            role: 'user',
                            content: prompts.invalidMovePrompt({ lastMove: board.lastMove, boardStr }),
                        });
                    console.error(`AI 移动失败：${(error as Error).message}`);
                }
            }
            if (!await confirm({
                message: 'AI 移动失败，是否重试？',
                default: false
            }))
                throw new Error('AI 移动失败');
        }
    }

    private async getMoveFromAI(board: Board): Promise<Coordinate> {
        const completion = await client.chat.completions.create({
            model: this.config.model.id,
            messages: this.messages,
            // temperature: 0,
            response_format: { type: 'json_object' }
        });

        const response = completion.choices[0].message.content;

        if (!response || response === '')
            throw new ResponseError('Empty response');

        let reasoning: string;
        let coordinate: Coordinate;
        ({ reasoning, coordinate } = this.parseResponse(response));

        this.messages.push({
            role: 'assistant',
            content: response
        });

        console.log(`[AI] ${reasoning}`);

        board.validateCoordinate(coordinate);
        return coordinate;
    }

    private parseResponse(response: string): { reasoning: string; coordinate: Coordinate; } {
        // const cleanedResponse = response.match(/```json\s*([\s\S]*?)\s*```/s)?.[1].trim() ?? response;

        // 尝试适配一些不支持强制 JSON Output 的 LLM
        const cleanedResponse = response.replace(/```json|```/g, '').trim();

        try {
            const { reasoning, coordinate } = JSON.parse(cleanedResponse);

            if (!this.isCoordinate(coordinate))
                throw new ResponseError(response);
            return { reasoning, coordinate };
        } catch (error) {
            throw new ResponseError(response);
        }
    }

    private isCoordinate(coordiante: any): coordiante is Coordinate {
        return typeof coordiante.x === 'number' && typeof coordiante.y === 'number';
    }
}

export class ResponseError extends Error {
    constructor(public readonly response: string) {
        super(`Invalid response: ${response}`);
        this.name = 'ResponseError';
    }
}