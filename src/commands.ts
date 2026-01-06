import * as vscode from 'vscode';
import { TaskParser } from './taskParser';

export function toggleCompletion(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    const document = editor.document;
    const selections = editor.selections;

    editor.edit(editBuilder => {
        for (const selection of selections) {
            const startLine = selection.start.line;
            const endLine = selection.end.line;

            for (let i = startLine; i <= endLine; i++) {
                const line = document.lineAt(i);
                const text = line.text;
                const task = TaskParser.parse(text, i);

                if (task) {
                    const newStatus = task.isCompleted ? ' ' : 'x';
                    const match = /^(\s*-\s*\[)([\sx\-])(\])/.exec(text);
                    if (match) {
                        const range = new vscode.Range(
                            i,
                            match[1].length,
                            i,
                            match[1].length + 1
                        );
                        editBuilder.replace(range, newStatus);
                    }
                }
            }
        }
    });
}

export async function addTag(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    const tagName = await vscode.window.showInputBox({
        placeHolder: 'Tag name (e.g. due)',
        prompt: 'Enter tag name'
    });

    if (!tagName) { return; }

    const tagValue = await vscode.window.showInputBox({
        placeHolder: 'Value (optional)',
        prompt: 'Enter tag value (optional)'
    });

    const tagString = tagValue ? ` @${tagName}(${tagValue})` : ` @${tagName}`;

    editor.edit(editBuilder => {
        for (const selection of editor.selections) {
            const line = editor.document.lineAt(selection.active.line);
            editBuilder.insert(line.range.end, tagString);
        }
    });
}

export async function removeTag(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    const selection = editor.selection;
    const line = editor.document.lineAt(selection.active.line);
    const task = TaskParser.parse(line.text, selection.active.line);

    if (!task || task.tags.length === 0) {
        vscode.window.showInformationMessage('No tags found on this line.');
        return;
    }

    const tagItems = task.tags.map(t => ({
        label: t.name,
        description: t.value || '',
        range: t.range
    }));

    const selected = await vscode.window.showQuickPick(tagItems, { placeHolder: 'Select tag to remove' });

    if (selected) {
        editor.edit(editBuilder => {
            // Adjust range to include leading space if present
            const start = selected.range[0];
            const end = selected.range[1];
            // Check for leading space
            const rangeToRemove = new vscode.Range(line.lineNumber, start - 1, line.lineNumber, end);
            const textToCheck = editor.document.getText(rangeToRemove);

            if (textToCheck.startsWith(' ')) {
                editBuilder.delete(rangeToRemove);
            } else {
                editBuilder.delete(new vscode.Range(line.lineNumber, start, line.lineNumber, end));
            }
        });
    }
}

export async function searchTag() {
    const tagName = await vscode.window.showInputBox({
        placeHolder: 'Tag name (e.g. due)',
        prompt: 'Enter tag name to search'
    });

    if (tagName) {
        await vscode.commands.executeCommand('workbench.action.findInFiles', {
            query: `@${tagName}`,
            triggerSearch: true,
            filesToInclude: '*.md'
        });
    }
}
