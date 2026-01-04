import * as vscode from 'vscode';
import { TaskDecorator } from './taskDecorator';
import { TaskProvider } from './taskProvider';
import { toggleCompletion, addTag, removeTag, searchTag } from './commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "taskpaper" is now active!');

    const decorator = new TaskDecorator();
    const taskProvider = new TaskProvider();

    vscode.window.registerTreeDataProvider('taskpaper-sidebar', taskProvider);

    let disposable = vscode.commands.registerCommand('taskpaper.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from TaskPaper!');
    });

    let toggleDisposable = vscode.commands.registerTextEditorCommand('taskpaper.toggleCompletion', (editor, edit) => {
        toggleCompletion(editor, edit);
    });

    let addTagDisposable = vscode.commands.registerCommand('taskpaper.addTag', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            addTag(editor, {} as any); // edit param not used in async implementation
        }
    });

    let removeTagDisposable = vscode.commands.registerCommand('taskpaper.removeTag', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            removeTag(editor, {} as any);
        }
    });

    let searchTagDisposable = vscode.commands.registerCommand('taskpaper.searchTag', () => {
        searchTag();
    });

    // Initial update
    if (vscode.window.activeTextEditor) {
        decorator.updateDecorations(vscode.window.activeTextEditor);
        taskProvider.refresh();
    }

    // Update on editor change
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            decorator.updateDecorations(editor);
            taskProvider.refresh();
        }
    }, null, context.subscriptions);

    // Update on content change
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            decorator.updateDecorations(vscode.window.activeTextEditor);
            taskProvider.refresh();
        }
    }, null, context.subscriptions);

    context.subscriptions.push(disposable);
    context.subscriptions.push(toggleDisposable);
    context.subscriptions.push(addTagDisposable);
    context.subscriptions.push(removeTagDisposable);
    context.subscriptions.push(searchTagDisposable);
    context.subscriptions.push({ dispose: () => decorator.dispose() });
}

export function deactivate() { }
