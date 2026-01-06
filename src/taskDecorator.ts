import * as vscode from 'vscode';
import { TaskParser } from './taskParser';

export class TaskDecorator {
    private completedTaskDecorationType: vscode.TextEditorDecorationType;
    private tagDecorationType: vscode.TextEditorDecorationType;

    constructor() {
        this.completedTaskDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'line-through',
            opacity: '0.5'
        });

        this.tagDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.selectionHighlightBackground'),
            borderRadius: '3px'
        });
    }

    public updateDecorations(editor: vscode.TextEditor) {
        if (!editor || editor.document.languageId !== 'markdown') {
            return;
        }

        const completedRanges: vscode.Range[] = [];
        const tagRanges: vscode.Range[] = [];
        const lines = editor.document.getText().split(/\r?\n/);

        let parentIndentation = -1;
        let isParentDone = false;

        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const task = TaskParser.parse(lineText, i);
            let shouldDecorate = false;

            if (task) {
                // Collect tag ranges
                // TaskParser.parse provides tag ranges relative to the content (after - [ ])
                // We need to calculate the absolute offset in the line.
                const prefixMatch = /^(\s*-\s*\[[ x\-]\]\s*)/.exec(lineText);
                const prefixLength = prefixMatch ? prefixMatch[1].length : 0;

                for (const tag of task.tags) {
                    const range = new vscode.Range(
                        i,
                        prefixLength + tag.range[0],
                        i,
                        prefixLength + tag.range[1]
                    );
                    tagRanges.push(range);
                }

                if (task.isCompleted || task.isCancelled) {
                    shouldDecorate = true;
                    if (!isParentDone || task.indentation <= parentIndentation) {
                        isParentDone = true;
                        parentIndentation = task.indentation;
                    }
                } else {
                    if (isParentDone && task.indentation > parentIndentation) {
                        shouldDecorate = true;
                    } else {
                        isParentDone = false;
                        parentIndentation = -1;
                    }
                }
            } else {
                const currentIndentation = lineText.search(/\S|$/);
                if (isParentDone && currentIndentation > parentIndentation && lineText.trim().length > 0) {
                    shouldDecorate = true;
                } else if (lineText.trim().length > 0) {
                    isParentDone = false;
                    parentIndentation = -1;
                }
            }

            if (shouldDecorate) {
                const range = new vscode.Range(i, 0, i, lineText.length);
                completedRanges.push(range);
            }
        }

        editor.setDecorations(this.completedTaskDecorationType, completedRanges);
        editor.setDecorations(this.tagDecorationType, tagRanges);
    }

    public dispose() {
        this.completedTaskDecorationType.dispose();
        this.tagDecorationType.dispose();
    }
}
