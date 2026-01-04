import * as vscode from 'vscode';
import { TaskParser } from './taskParser';

export class TaskDecorator {
    private completedTaskDecorationType: vscode.TextEditorDecorationType;

    constructor() {
        this.completedTaskDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'line-through',
            opacity: '0.5'
        });
    }

    public updateDecorations(editor: vscode.TextEditor) {
        if (!editor || editor.document.languageId !== 'markdown') {
            return;
        }

        const completedRanges: vscode.Range[] = [];
        const lines = editor.document.getText().split(/\r?\n/);

        let parentIndentation = -1;
        let isParentCompleted = false;

        for (let i = 0; i < lines.length; i++) {
            const task = TaskParser.parse(lines[i], i);
            let shouldDecorate = false;

            if (task) {
                if (task.isCompleted) {
                    shouldDecorate = true;
                    // Start of a completed block if not already in one or deeper
                    if (!isParentCompleted || task.indentation <= parentIndentation) {
                        isParentCompleted = true;
                        parentIndentation = task.indentation;
                    }
                } else {
                    // Check if it's a child of a completed task
                    if (isParentCompleted && task.indentation > parentIndentation) {
                        shouldDecorate = true;
                    } else {
                        // Not a child, so reset parent status
                        isParentCompleted = false;
                        parentIndentation = -1;
                    }
                }
            } else {
                // Not a task line, might be a comment or blank
                // If the line is indented deeper than parent, we might consider it part of the block,
                // but requirements say "task with child elements". Assuming regular indented lines count if they look like structure.
                // However, based on pure strict requirement "if that task has child elements", usually means child tasks or indented content.
                // Let's check indentation generally.
                const currentIndentation = lines[i].search(/\S|$/);
                if (isParentCompleted && currentIndentation > parentIndentation && lines[i].trim().length > 0) {
                    shouldDecorate = true;
                } else if (lines[i].trim().length > 0) { // Reset on non-empty, non-child line
                    isParentCompleted = false;
                    parentIndentation = -1;
                }
            }

            if (shouldDecorate) {
                const range = new vscode.Range(i, 0, i, lines[i].length);
                completedRanges.push(range);
            }
        }

        editor.setDecorations(this.completedTaskDecorationType, completedRanges);
    }

    public dispose() {
        this.completedTaskDecorationType.dispose();
    }
}
