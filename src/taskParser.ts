
export interface TaskTag {
    name: string;
    value?: string;
    range: [number, number]; // start, end index in the line
}

export interface Task {
    text: string;
    isCompleted: boolean;
    tags: TaskTag[];
    lineNumber: number;
    indentation: number;
    isTask: boolean;
    isHeader?: boolean;
}

export class TaskParser {
    private static readonly TASK_REGEX = /^(\s*)-\s*\[([ x])\]\s*(.*)$/;
    private static readonly TAG_REGEX = /@([a-zA-Z0-9_]+)(?:\(([^)]+)\))?/g;

    public static parse(line: string, lineNumber: number): Task | null {
        const match = TaskParser.TASK_REGEX.exec(line);
        if (!match) {
            return null;
        }

        const indentation = match[1].length;
        const isCompleted = match[2] === 'x';
        const content = match[3];

        const tags: TaskTag[] = [];
        let tagMatch;
        while ((tagMatch = TaskParser.TAG_REGEX.exec(content)) !== null) {
            tags.push({
                name: tagMatch[1],
                value: tagMatch[2],
                range: [tagMatch.index, tagMatch.index + tagMatch[0].length]
            });
        }

        return {
            text: content,
            isCompleted,
            tags,
            lineNumber,
            indentation,
            isTask: true
        };
    }
}
