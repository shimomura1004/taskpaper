import * as vscode from 'vscode';
import { TaskParser, Task } from './taskParser';

export type TaskViewMode = 'all' | 'completed' | 'today' | 'week';

export class TaskProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> = new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private mode: TaskViewMode) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TaskTreeItem): Thenable<TaskTreeItem[]> {
        if (element && element.children && element.children.length > 0) {
            return Promise.resolve(element.children);
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
            return Promise.resolve([]);
        }

        const tasks: Task[] = [];
        const lines = editor.document.getText().split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const nextLineText = i + 1 < lines.length ? lines[i + 1] : undefined;
            const task = TaskParser.parse(lineText, i);

            if (task) {
                tasks.push(task);
            } else {
                // Check for ATX header (#)
                const headerMatch = /^(\s*)(#+)\s+(.*)$/.exec(lineText);
                if (headerMatch) {
                    tasks.push({
                        text: headerMatch[3],
                        isCompleted: false,
                        isCancelled: false,
                        tags: [],
                        lineNumber: i,
                        indentation: headerMatch[1].length,
                        isTask: false,
                        isHeader: true,
                        headerLevel: headerMatch[2].length
                    });
                } else if (nextLineText !== undefined) {
                    // Check for Setext header (=== or ---)
                    const setextMatch = /^(\s*)(=+|-+)\s*$/.exec(nextLineText);
                    // Ensure the line before isn't empty and doesn't look like a task
                    if (setextMatch && lineText.trim().length > 0) {
                        const level = setextMatch[2].startsWith('=') ? 1 : 2;
                        tasks.push({
                            text: lineText.trim(),
                            isCompleted: false,
                            isCancelled: false,
                            tags: [],
                            lineNumber: i,
                            indentation: 0,
                            isTask: false,
                            isHeader: true,
                            headerLevel: level
                        });
                        i++; // Skip the underline line
                    }
                }
            }
        }

        // If we are expanding an item that has no children computed but is NOT a root call
        if (element) {
            return Promise.resolve([]);
        }

        // Root call for this specific provider
        if (this.mode === 'all') {
            return Promise.resolve(this.buildTaskTree(tasks));
        } else if (this.mode === 'completed') {
            return Promise.resolve(tasks.filter(t => t.isCompleted).map(t => new TaskTreeItem(t.text, vscode.TreeItemCollapsibleState.None, 'task', t)));
        } else if (this.mode === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setHours(23, 59, 59, 999);

            return Promise.resolve(tasks.filter(t => {
                if (t.isCancelled) {
                    return false;
                }
                return t.tags.some(tag => {
                    if (tag.name === 'today') {
                        return true;
                    }
                    if ((tag.name === 'due' || tag.name === 'on') && tag.value) {
                        const date = this.parseDate(tag.value);
                        if (!date) {
                            return false;
                        }
                        // For Today view, show:
                        // 1. Uncompleted tasks due on or before today
                        // 2. Completed tasks due today
                        if (t.isCompleted) {
                            return date >= todayStart && date <= todayEnd;
                        } else {
                            return date <= todayEnd;
                        }
                    }
                    return false;
                });
            }).map(t => new TaskTreeItem(t.text, vscode.TreeItemCollapsibleState.None, 'task', t)));
        } else if (this.mode === 'week') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const nextWeekEnd = new Date(todayStart);
            nextWeekEnd.setDate(todayStart.getDate() + 7);
            nextWeekEnd.setHours(23, 59, 59, 999);

            return Promise.resolve(tasks.filter(t => {
                if (t.isCancelled) {
                    return false;
                }
                return t.tags.some(tag => {
                    if (tag.name === 'today') {
                        return true;
                    }
                    if ((tag.name === 'due' || tag.name === 'on') && tag.value) {
                        const date = this.parseDate(tag.value);
                        if (!date) {
                            return false;
                        }
                        // For Week view, show:
                        // 1. Uncompleted tasks due on or before next week
                        // 2. Completed tasks due between today and next week
                        if (t.isCompleted) {
                            return date >= todayStart && date <= nextWeekEnd;
                        } else {
                            return date <= nextWeekEnd;
                        }
                    }
                    return false;
                });
            }).map(t => new TaskTreeItem(t.text, vscode.TreeItemCollapsibleState.None, 'task', t)));
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
                if (stack.length > 0) {
                    stack[stack.length - 1].item.addChild(item);
                } else {
                    rootItems.push(item);
                }
            }
        }

        // Helper function to check if an item or its children contain tasks
        const itemHasTasks = (item: TaskTreeItem): boolean => {
            if (item.task?.isTask) {
                return true;
            }
            if (item.children && item.children.length > 0) {
                // Recursively filter children and check if any survive
                item.children = item.children.filter(child => itemHasTasks(child));
                return item.children.length > 0;
            }
            return false;
        };

        return rootItems.filter(item => itemHasTasks(item));
    }

    private parseDate(dateStr: string): Date | undefined {
        const match = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (match) {
            const [, y, m, d] = match;
            const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
    }
}

export class TaskTreeItem extends vscode.TreeItem {
    public children: TaskTreeItem[] = [];

    constructor(
        public readonly label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly task?: Task
    ) {
        super(label, collapsibleState);
        this.tooltip = label;

        if (task) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.window.activeTextEditor?.document.uri, {
                    selection: new vscode.Range(task.lineNumber, 0, task.lineNumber, 0)
                }]
            };

            if (task.isHeader) {
                this.iconPath = new vscode.ThemeIcon('folder');
            } else if (task.isCompleted) {
                this.iconPath = new vscode.ThemeIcon('check');
            } else if (task.isCancelled) {
                this.iconPath = new vscode.ThemeIcon('circle-slash');
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
