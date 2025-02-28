import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import config from '../config.json' with { type: 'json' };
import { InvalidCoordinateError, type Board } from "../core/board.js";
import type { Coordinate } from "../interfaces/coordinate.js";
import type { Player } from "../interfaces/player.js";

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
        content: '你是一个五子棋专家，你的棋子是O。你会根据当前棋盘状态，思考最佳落子位置。'
    }];

    async getMove(board: Board): Promise<Coordinate> {
        return await this.getMoveFromAI(board);
    }

    private async getMoveFromAI(board: Board): Promise<Coordinate> {
        const boardStr = board.toString();
        this.messages.push({
            role: 'user',
            content: `现在是你的回合，当前棋盘状态（X是你的对手，O是你）：
${boardStr}
请严格按如下 JSON 格式返回最佳落子位置：

{
    "reasoning": "你的思考过程",
    "coordinate": {"x": 十进制横坐标, "y": 十进制纵坐标}
}

注意，请将你的思考过程放置在 reasoning 字段中，将落子坐标放置在 move 字段中。

示例：{"reasoning": "...", "coordinate": {"x": 10, "y": 3}}`});
        const completion = await client.chat.completions.create({
            model: this.config.model.id,
            messages: this.messages,
            temperature: 0,
            response_format: { type: 'json_object' }
        });

        const response = completion.choices[0].message.content;

        if (!response || response === '')
            throw new ResponseError('Empty response');

        let coordinate: Coordinate;
        try {
            coordinate = this.parseResponse(response);
        } catch (error) {
            if (error instanceof ResponseError) {
                console.error(error.message);
            }
            throw error;
        }

        try {
            board.validateCoordinate(coordinate);
            return coordinate;
        } catch (error) {
            if (error instanceof InvalidCoordinateError) {
            }
            throw error;
        }
    }

    private parseResponse(response: string): Coordinate {
        // const cleanedResponse = response.match(/```json\s*([\s\S]*?)\s*```/s)?.[1].trim() ?? response;

        // 尝试适配一些不支持强制 JSON Output 的 LLM
        const cleanedResponse = response.replace(/```json|```/g, '').trim();

        try {
            const { reasoning, coordinate } = JSON.parse(cleanedResponse);

            this.isCoordinate(coordinate);
            return coordinate;
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