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

        if (element.children && element.children.length > 0) {
            return Promise.resolve(element.children);
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            return Promise.resolve([]);
        }

        // Optimization: For 'all' tasks, we rebuild the tree structure only when needed.
        // But for simplicity, we parse document on every root expansion (when element.contextValue is one of the roots).
        // Since we don't cache locally in this simple implementation, we assume parsing is fast enough.

        // If we are here, it means we are expanding one of the root nodes or a node that has no computed children yet.
        // Actually, for 'all' mode, buildTaskTree puts children into items. So if an item has children, it's handled above.
        // If it returns here for 'all', it means we are at the 'All Tasks' root node.

        const tasks: Task[] = [];
        const lines = editor.document.getText().split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const task = TaskParser.parse(lineText, i);
            if (task) {
                tasks.push(task);
            } else {
                // Check for header
                const headerMatch = /^(\s*)(#+)\s+(.*)$/.exec(lineText);
                if (headerMatch) {
                    tasks.push({
                        text: headerMatch[3],
                        isCompleted: false,
                        tags: [],
                        lineNumber: i,
                        indentation: headerMatch[1].length,
                        isTask: false,
                        isHeader: true,
                        headerLevel: headerMatch[2].length
                    });
                }
            }
        }

        if (element.contextValue === 'all') {
            return Promise.resolve(this.buildTaskTree(tasks));
        } else if (element.contextValue === 'completed') {
            return Promise.resolve(tasks.filter(t => t.isCompleted).map(t => new TaskTreeItem(t.text, vscode.TreeItemCollapsibleState.None, 'task', t)));
        } else if (element.contextValue === 'today') {
            const todayStr = this.getTodayString();
            return Promise.resolve(tasks.filter(t =>
                t.tags.some(tag => tag.name === 'on' && tag.value === todayStr)
            ).map(t => new TaskTreeItem(t.text, vscode.TreeItemCollapsibleState.None, 'task', t)));
        }

        return Promise.resolve([]);
    }

    private buildTaskTree(tasks: Task[]): TaskTreeItem[] {
        const rootItems: TaskTreeItem[] = [];
        const stack: { item: TaskTreeItem, level: number }[] = [];

        for (const task of tasks) {
            const item = new TaskTreeItem(
                task.text,
                vscode.TreeItemCollapsibleState.None,
                'task',
                task
            );

            if (task.isHeader) {
                const level = task.headerLevel || 1;

                // Pop items from stack that are deeper or equal to current level
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }

                if (stack.length > 0) {
                    const parent = stack[stack.length - 1].item;
                    parent.addChild(item);
                } else {
                    rootItems.push(item);
                }

                stack.push({ item, level });
            } else {
                // It's a task. Add to the current header in stack, or root if no header.
                if (stack.length > 0) {
                    stack[stack.length - 1].item.addChild(item);
                } else {
                    rootItems.push(item);
                }
            }
        }

        return rootItems;
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
    public children: TaskTreeItem[] = [];

    constructor(
        public readonly label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState, // Removed readonly
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

            if (task.isHeader) {
                this.iconPath = new vscode.ThemeIcon('symbol-property');
            } else if (task.isCompleted) {
                this.iconPath = new vscode.ThemeIcon('check');
            } else {
                this.iconPath = new vscode.ThemeIcon('circle-outline');
            }
        }
    }

    public addChild(child: TaskTreeItem) {
        this.children.push(child);
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
}
