import * as vscode from 'vscode';
import { TaskParser, Task } from './taskParser';

export class TaskProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> = new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TaskTreeItem): Thenable<TaskTreeItem[]> {
        if (!element) {
            // Root elements
            return Promise.resolve([
                new TaskTreeItem('All Tasks', vscode.TreeItemCollapsibleState.Expanded, 'all'),
                new TaskTreeItem('Completed', vscode.TreeItemCollapsibleState.Collapsed, 'completed'),
                new TaskTreeItem('Today', vscode.TreeItemCollapsibleState.Collapsed, 'today')
            ]);
        }

        // Child elements (Tasks)
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            return Promise.resolve([]);
        }

        const tasks: Task[] = [];
        const lines = editor.document.getText().split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const task = TaskParser.parse(lines[i], i);
            if (task) {
                tasks.push(task);
            }
        }

        let filteredTasks: Task[] = [];
        if (element.contextValue === 'all') {
            filteredTasks = tasks;
        } else if (element.contextValue === 'completed') {
            filteredTasks = tasks.filter(t => t.isCompleted);
        } else if (element.contextValue === 'today') {
            const todayStr = this.getTodayString();
            filteredTasks = tasks.filter(t =>
                t.tags.some(tag => tag.name === 'on' && tag.value === todayStr)
            );
        }

        return Promise.resolve(filteredTasks.map(task =>
            new TaskTreeItem(
                task.text,
                vscode.TreeItemCollapsibleState.None,
                'task',
                task
            )
        ));
    }

    private getTodayString(): string {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd}`;
    }
}

export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly task?: Task
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;

        if (task) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.window.activeTextEditor?.document.uri, {
                    selection: new vscode.Range(task.lineNumber, 0, task.lineNumber, 0)
                }]
            };

            if (task.isCompleted) {
                this.iconPath = new vscode.ThemeIcon('check');
            } else {
                this.iconPath = new vscode.ThemeIcon('circle-outline');
            }
        }
    }
}
