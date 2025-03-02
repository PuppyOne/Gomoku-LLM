import type { Coordinate } from "../interfaces/coordinate.js";

export const prompts = {
    initialPrompt: () => '你是一个五子棋专家，你的棋子是O。你会根据当前棋盘状态，思考最佳落子位置。',
    lastmovePrompt: ({ x, y }: Coordinate) => `对方已在 \`{"x": ${x}, "y": ${y}}\` 落子`,
    userPrompt: ({ lastMove, boardStr }: { lastMove?: Coordinate, boardStr: string; }) => `
${lastMove ? prompts.lastmovePrompt(lastMove) + '，' : ''}现在是你的回合，当前棋盘状态（X是你的对手，O是你，·是空位）：
${boardStr}
请严格按如下 JSON 格式返回最佳落子位置：

{
    "reasoning": "你的思考过程",
    "coordinate": {"x": 十进制横坐标, "y": 十进制纵坐标}
}

注意，请将你的思考过程放置在 reasoning 字段中，将落子坐标（第y行 第x列）放置在 coordinate 字段中。

示例：{"reasoning": "...", "coordinate": {"x": 10, "y": 3}}
`,
    invalidMovePrompt: ({ lastMove, boardStr }: { lastMove?: Coordinate, boardStr: string; }) => `
你输入的落子位置无效，这可能是因为该位置已有棋子或超出了棋盘范围。请重新输入。

${prompts.userPrompt({ lastMove, boardStr })}
`
};