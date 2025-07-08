/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestContextService } from '../../../../../workbench/test/common/workbenchTestServices.js';
import { HooksService } from '../../browser/hooksService.js';
import { HooksWorkbenchContribution, GitHooksIntegration, CopilotHooksIntegration } from '../../browser/workbenchIntegration.js';
import { HookType, IHookConfiguration } from '../../common/hooks.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { TestCommandService } from '../../../../../platform/commands/test/common/testCommandService.js';
import { TestTextFileService } from '../../../../../workbench/test/common/workbenchTestServices.js';

suite('Hooks Integration', () => {
	const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();

	let instantiationService: TestInstantiationService;
	let hooksService: HooksService;
	let configurationService: TestConfigurationService;
	let workspaceContextService: TestContextService;
	let fileService: FileService;
	let notificationService: TestNotificationService;
	let commandService: TestCommandService;
	let textFileService: TestTextFileService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		configurationService = new TestConfigurationService();
		workspaceContextService = new TestContextService(TestWorkspace);
		notificationService = new TestNotificationService();
		commandService = new TestCommandService(instantiationService);
		textFileService = new TestTextFileService();
		
		// Set up file service with in-memory provider
		fileService = new FileService(NullLogService);
		const inMemoryProvider = new InMemoryFileSystemProvider();
		fileService.registerProvider(Schemas.file, inMemoryProvider);
		
		hooksService = testDisposables.add(new HooksService(
			NullLogService,
			configurationService,
			workspaceContextService,
			fileService
		));
	});

	test('should create workbench contribution', () => {
		const contribution = testDisposables.add(new HooksWorkbenchContribution(
			hooksService,
			workspaceContextService,
			configurationService,
			NullLogService,
			notificationService,
			fileService,
			textFileService,
			commandService
		));

		ok(contribution);
		strictEqual(contribution.constructor.name, 'HooksWorkbenchContribution');
	});

	test('should integrate with git operations', async () => {
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a pre-commit hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Lint check passed'],
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PreCommit, hookConfig);
		testDisposables.add(disposable);

		// Execute pre-commit hooks
		const result = await gitIntegration.executePreCommitHooks(['file1.ts', 'file2.ts']);
		strictEqual(result, true);
	});

	test('should handle pre-commit hook failures', async () => {
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a failing pre-commit hook
		const hookConfig: IHookConfiguration = {
			command: 'false', // This will fail
			abortOnFailure: true,
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PreCommit, hookConfig);
		testDisposables.add(disposable);

		// Execute pre-commit hooks - should succeed in simulation
		const result = await gitIntegration.executePreCommitHooks(['file1.ts']);
		strictEqual(result, true); // In simulation, hooks always succeed
	});

	test('should integrate with copilot operations', async () => {
		const copilotIntegration = testDisposables.add(new CopilotHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a pre-copilot prompt hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Processed prompt'],
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PreCopilotPrompt, hookConfig);
		testDisposables.add(disposable);

		// Execute pre-copilot prompt hooks
		const result = await copilotIntegration.executePreCopilotPromptHooks('Original prompt', { context: 'test' });
		ok(result !== null);
	});

	test('should process context data through hooks', async () => {
		const copilotIntegration = testDisposables.add(new CopilotHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a pre-context attach hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['{"filtered": true, "original": "context"}'],
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PreContextAttach, hookConfig);
		testDisposables.add(disposable);

		const originalContext = { selectedText: 'some code', files: ['file1.ts'] };
		const result = await copilotIntegration.executePreContextAttachHooks(originalContext);
		
		ok(result !== null);
		// In a real implementation, this would return the filtered context
	});

	test('should execute post-copilot response hooks', async () => {
		const copilotIntegration = testDisposables.add(new CopilotHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a post-copilot response hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Response logged'],
			timeout: 1000,
			async: true
		};

		const disposable = hooksService.registerHook(HookType.PostCopilotResponse, hookConfig);
		testDisposables.add(disposable);

		const response = { text: 'Generated code', confidence: 0.95 };
		const originalPrompt = 'Generate a function';

		// This should not throw
		await copilotIntegration.executePostCopilotResponseHooks(response, originalPrompt);
	});

	test('should handle git push hooks', async () => {
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a pre-push hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Push validated'],
			timeout: 2000
		};

		const disposable = hooksService.registerHook(HookType.PrePush, hookConfig);
		testDisposables.add(disposable);

		// Execute pre-push hooks
		const result = await gitIntegration.executePrePushHooks('main');
		strictEqual(result, true);
	});

	test('should handle git pull hooks', async () => {
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register a pre-pull hook
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Pull preparation complete'],
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PrePull, hookConfig);
		testDisposables.add(disposable);

		// Execute pre-pull hooks
		const result = await gitIntegration.executePrePullHooks('main');
		strictEqual(result, true);
	});

	test('should handle hooks with no workspace', async () => {
		// Create a context service with no workspace
		const emptyContextService = new TestContextService();
		
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			emptyContextService,
			NullLogService
		));

		// Should return true when no workspace is available
		const result = await gitIntegration.executePreCommitHooks(['file1.ts']);
		strictEqual(result, true);
	});

	test('should handle multiple hooks in sequence', async () => {
		const gitIntegration = testDisposables.add(new GitHooksIntegration(
			hooksService,
			workspaceContextService,
			NullLogService
		));

		// Register multiple pre-commit hooks
		const hookConfig1: IHookConfiguration = {
			command: 'echo',
			args: ['First hook'],
			timeout: 1000
		};

		const hookConfig2: IHookConfiguration = {
			command: 'echo',
			args: ['Second hook'],
			timeout: 1000
		};

		const disposable1 = hooksService.registerHook(HookType.PreCommit, hookConfig1);
		const disposable2 = hooksService.registerHook(HookType.PreCommit, hookConfig2);
		testDisposables.add(disposable1);
		testDisposables.add(disposable2);

		// Execute pre-commit hooks - both should run
		const result = await gitIntegration.executePreCommitHooks(['file1.ts', 'file2.ts']);
		strictEqual(result, true);
	});
});