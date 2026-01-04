import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskParser } from '../../taskParser';

suite('TaskPaper Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Parsing valid task', () => {
        const line = '  - [ ] Task 1 @due(2023-01-01)';
        const task = TaskParser.parse(line, 0);

        assert.ok(task);
        assert.strictEqual(task!.text, 'Task 1 @due(2023-01-01)');
        assert.strictEqual(task!.isCompleted, false);
        assert.strictEqual(task!.indentation, 2);
        assert.strictEqual(task!.tags.length, 1);
        assert.strictEqual(task!.tags[0].name, 'due');
        assert.strictEqual(task!.tags[0].value, '2023-01-01');
    });

    test('Parsing completed task', () => {
        const line = '- [x] Completed Task';
        const task = TaskParser.parse(line, 1);

        assert.ok(task);
        assert.strictEqual(task!.isCompleted, true);
    });

    test('Parsing multiple tags', () => {
        const line = '- [ ] Task @tag1 @tag2(value)';
        const task = TaskParser.parse(line, 0);

        assert.ok(task);
        assert.strictEqual(task!.tags.length, 2);
        assert.strictEqual(task!.tags[0].name, 'tag1');
        assert.strictEqual(task!.tags[1].name, 'tag2');
        assert.strictEqual(task!.tags[1].value, 'value');
    });

    test('Parsing invalid line', () => {
        const line = 'Just some text';
        const task = TaskParser.parse(line, 0);
        assert.strictEqual(task, null);
    });
});
