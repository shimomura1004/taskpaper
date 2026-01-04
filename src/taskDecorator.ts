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

        for (let i = 0; i < lines.length; i++) {
            const task = TaskParser.parse(lines[i], i);
            if (task && task.isCompleted) {
                // Ensure we decorate the full line properly
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
