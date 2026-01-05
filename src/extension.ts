import * as vscode from 'vscode';
import { TaskDecorator } from './taskDecorator';
import { TaskProvider } from './taskProvider';
import { toggleCompletion, addTag, removeTag, searchTag } from './commands';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "taskpaper" is now active!');

    const decorator = new TaskDecorator();

    const outlineProvider = new TaskProvider('all');
    const todayProvider = new TaskProvider('today');
    const weekProvider = new TaskProvider('week');
    const completedProvider = new TaskProvider('completed');

    const providers = [outlineProvider, todayProvider, weekProvider, completedProvider];

    vscode.window.registerTreeDataProvider('taskpaper-outline', outlineProvider);
    vscode.window.registerTreeDataProvider('taskpaper-today', todayProvider);
    vscode.window.registerTreeDataProvider('taskpaper-week', weekProvider);
    vscode.window.registerTreeDataProvider('taskpaper-completed', completedProvider);

    let disposable = vscode.commands.registerCommand('taskpaper.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from TaskPaper!');
    });

    let toggleDisposable = vscode.commands.registerTextEditorCommand('taskpaper.toggleCompletion', (editor, edit) => {
        toggleCompletion(editor, edit);
    });

    let addTagDisposable = vscode.commands.registerCommand('taskpaper.addTag', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            addTag(editor, {} as any);
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

    const refreshAll = () => {
        providers.forEach(p => p.refresh());
    };

    // Initial update
    if (vscode.window.activeTextEditor) {
        decorator.updateDecorations(vscode.window.activeTextEditor);
        refreshAll();
    }

    // Update on editor change
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            decorator.updateDecorations(editor);
            refreshAll();
        }
    }, null, context.subscriptions);

    // Update on content change
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            decorator.updateDecorations(vscode.window.activeTextEditor);
            refreshAll();
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
