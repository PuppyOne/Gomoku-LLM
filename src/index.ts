import * as readline from 'readline';
import axios from 'axios';
import chalk from 'chalk';

// 配置项
const CONFIG = {
    BOARD_SIZE: 15,
    API_KEY: '<KEY>',
    API_ENDPOINT: 'https://api.moonshot.cn/v1/chat/completions',
    MAX_RETRIES: 3
};

// 棋子类型
type Piece = 'X' | 'O' | ' ';

// 游戏状态
// enum GameState {
//     Playing,
//     Win,
//     Draw
// }

class GomokuGame {
    private board: Piece[][];
    private currentPlayer: 'human' | 'ai';
    private rl: readline.Interface;

    constructor() {
        this.board = Array.from({ length: CONFIG.BOARD_SIZE }, () =>
            Array(CONFIG.BOARD_SIZE).fill(' ')
        );
        this.currentPlayer = 'human';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // 打印棋盘
    private printBoard(): void {
        console.log('\n  ' + [...Array(CONFIG.BOARD_SIZE).keys()].map(n => n.toString(16).toUpperCase()).join(' '));

        this.board.forEach((row, i) => {
            const rowStr = row.map((cell, j) => {
                if (cell === 'X') return chalk.red('X');
                if (cell === 'O') return chalk.blue('O');
                return chalk.gray('.');
            }).join(' ');
            console.log(`${i.toString(16).toUpperCase()} ${rowStr}`);
        });
    }

    // 坐标转换
    private parseCoordinate(input: string): { x: number, y: number; } | null {
        const match = input.trim().toUpperCase().match(/^([A-N])([0-9A-E])$/);
        if (!match) return null;

        const x = parseInt(match[2], 16);
        const y = parseInt(match[1], 16);

        return (x >= 0 && x < CONFIG.BOARD_SIZE && y >= 0 && y < CONFIG.BOARD_SIZE)
            ? { x, y }
            : null;
    }

    // 判断胜利
    private checkWin(x: number, y: number): boolean {
        const directions = [
            [[-1, 0], [1, 0]],  // 水平
            [[0, -1], [0, 1]],  // 垂直
            [[-1, -1], [1, 1]], // 主对角线
            [[-1, 1], [1, -1]]  // 副对角线
        ];

        const currentPiece = this.board[y][x];

        return directions.some(direction => {
            let count = 1;
            for (const [dx, dy] of direction) {
                let cx = x + dx;
                let cy = y + dy;

                while (cx >= 0 && cx < CONFIG.BOARD_SIZE &&
                    cy >= 0 && cy < CONFIG.BOARD_SIZE &&
                    this.board[cy][cx] === currentPiece) {
                    count++;
                    cx += dx;
                    cy += dy;
                }
            }
            return count >= 5;
        });
    }

    // AI移动
    private async getAIMove(): Promise<{ x: number, y: number; }> {
        const boardStr = this.board.map((row, y) =>
            row.map((cell, x) =>
                cell === 'X' ? 'X' : cell === 'O' ? 'O' : `${x},${y}`
            ).join(' ')
        ).join('\n');

        const prompt = `你是一个五子棋专家，当前棋盘状态（X是人类玩家，O是AI）：
${boardStr}
请严格按以下JSON格式返回最佳落子位置：
{
    "reasoning": "你的思考过程",
    "move": {"x": "十六进制横坐标", "y": "十六进制纵坐标"}
}
示例：{"reasoning": "...", "move": {"x": "A", "y": "3"}}`;

        for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
            try {
                const response = await axios.post(CONFIG.API_ENDPOINT, {
                    model: "kimi-latest",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }  // 要求返回JSON格式
                }, {
                    headers: { Authorization: `Bearer ${CONFIG.API_KEY}` }
                });

                const responseText = response.data.choices[0].message.content;
                console.log(chalk.yellow('AI返回结果：'), responseText);
                

                try {
                    const result = JSON.parse(responseText);
                    const coord = this.parseJSONCoordinate(result);

                    if (coord && this.board[coord.y][coord.x] === ' ') {
                        return coord;
                    }
                } catch (jsonError) {
                    console.error(chalk.yellow('JSON解析失败，尝试重新请求'));
                    continue;
                }
            } catch (error) {
                if (attempt === CONFIG.MAX_RETRIES) throw error;
                await new Promise(res => setTimeout(res, 1000 * attempt));
            }
        }
        throw new Error('AI移动失败');
    }

    // 新增JSON坐标解析方法
    private parseJSONCoordinate(result: any): { x: number, y: number; } | null {
        try {
            const xStr = result.move.x.toUpperCase();
            const yStr = result.move.y.toUpperCase();

            const x = parseInt(xStr, 16);
            const y = parseInt(yStr, 16);

            if (isNaN(x) || isNaN(y)) return null;
            if (x < 0 || x >= CONFIG.BOARD_SIZE) return null;
            if (y < 0 || y >= CONFIG.BOARD_SIZE) return null;

            return { x, y };
        } catch (e) {
            return null;
        }
    }
    // 游戏循环
    async start(): Promise<void> {
        console.log(chalk.yellow('五子棋游戏开始！'));
        this.printBoard();

        while (true) {
            if (this.currentPlayer === 'human') {
                const input = await this.getHumanInput();
                if (this.makeMove(input.x, input.y, 'X')) {
                    if (this.checkWin(input.x, input.y)) {
                        this.printBoard();
                        console.log(chalk.green('恭喜你获胜！'));
                        break;
                    }
                    this.currentPlayer = 'ai';
                }
            } else {
                console.log(chalk.blue('AI正在思考...'));
                try {
                    const aiMove = await this.getAIMove();
                    this.makeMove(aiMove.x, aiMove.y, 'O');
                    if (this.checkWin(aiMove.x, aiMove.y)) {
                        this.printBoard();
                        console.log(chalk.red('AI获胜！'));
                        break;
                    }
                    this.currentPlayer = 'human';
                } catch (error) {
                    console.error(chalk.red('AI移动失败，请重试'));
                }
            }

            this.printBoard();
            if (this.isBoardFull()) {
                console.log(chalk.yellow('平局！'));
                break;
            }
        }
        this.rl.close();
    }

    private async getHumanInput(): Promise<{ x: number, y: number; }> {
        while (true) {
            const input = await new Promise<string>(resolve =>
                this.rl.question('请输入落子坐标（如B3）: ', resolve)
            );

            const coord = this.parseCoordinate(input);
            if (!coord) {
                console.log(chalk.red('无效输入，请使用类似A1的格式'));
                continue;
            }

            if (this.board[coord.y][coord.x] !== ' ') {
                console.log(chalk.red('该位置已有棋子'));
                continue;
            }

            return coord;
        }
    }

    private makeMove(x: number, y: number, piece: Piece): boolean {
        if (x < 0 || x >= CONFIG.BOARD_SIZE || y < 0 || y >= CONFIG.BOARD_SIZE) return false;
        if (this.board[y][x] !== ' ') return false;

        this.board[y][x] = piece;
        return true;
    }

    private isBoardFull(): boolean {
        return this.board.every(row => row.every(cell => cell !== ' '));
    }
}

// 启动游戏
new GomokuGame().start().catch(err => {
    console.error(chalk.red('游戏出错:'), err);
    process.exit(1);
});