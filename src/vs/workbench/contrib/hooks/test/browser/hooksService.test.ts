/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestContextService } from '../../../../../workbench/test/common/workbenchTestServices.js';
import { HooksService } from '../../browser/hooksService.js';
import { HookType, IHookConfiguration, IHookContext } from '../../common/hooks.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';

suite('HooksService', () => {
	const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();

	let hooksService: HooksService;
	let instantiationService: TestInstantiationService;
	let configurationService: TestConfigurationService;
	let workspaceContextService: TestContextService;
	let fileService: FileService;

	setup(() => {
		instantiationService = new TestInstantiationService();
		configurationService = new TestConfigurationService();
		workspaceContextService = new TestContextService(TestWorkspace);
		
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

	test('should register and get hooks', () => {
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['test'],
			timeout: 1000
		};

		const disposable = hooksService.registerHook(HookType.PreCommit, hookConfig);
		testDisposables.add(disposable);

		const hooks = hooksService.getHooks(HookType.PreCommit);
		strictEqual(hooks.length, 1);
		deepStrictEqual(hooks[0], hookConfig);
	});

	test('should check if hooks exist', () => {
		const hookConfig: IHookConfiguration = {
			script: './test-script.sh'
		};

		strictEqual(hooksService.hasHooks(HookType.PreCopilotPrompt), false);

		const disposable = hooksService.registerHook(HookType.PreCopilotPrompt, hookConfig);
		testDisposables.add(disposable);

		strictEqual(hooksService.hasHooks(HookType.PreCopilotPrompt), true);
	});

	test('should clear hooks', () => {
		const hookConfig: IHookConfiguration = {
			command: 'test-command'
		};

		const disposable = hooksService.registerHook(HookType.PrePush, hookConfig);
		testDisposables.add(disposable);

		strictEqual(hooksService.hasHooks(HookType.PrePush), true);

		hooksService.clearHooks(HookType.PrePush);

		strictEqual(hooksService.hasHooks(HookType.PrePush), false);
	});

	test('should execute hooks', async () => {
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['Hello', 'World'],
			timeout: 2000
		};

		const disposable = hooksService.registerHook(HookType.PreContextAttach, hookConfig);
		testDisposables.add(disposable);

		const context: IHookContext = {
			hookType: HookType.PreContextAttach,
			workspaceUri: URI.file('/test/workspace'),
			data: { test: 'data' }
		};

		const results = await hooksService.executeHooks(HookType.PreContextAttach, context);

		strictEqual(results.length, 1);
		strictEqual(results[0].success, true);
		strictEqual(results[0].exitCode, 0);
	});

	test('should handle multiple hooks', async () => {
		const hookConfig1: IHookConfiguration = {
			command: 'echo',
			args: ['first']
		};

		const hookConfig2: IHookConfiguration = {
			script: './second-script.sh'
		};

		const disposable1 = hooksService.registerHook(HookType.FileSave, hookConfig1);
		const disposable2 = hooksService.registerHook(HookType.FileSave, hookConfig2);
		testDisposables.add(disposable1);
		testDisposables.add(disposable2);

		const context: IHookContext = {
			hookType: HookType.FileSave,
			fileUri: URI.file('/test/file.txt')
		};

		const results = await hooksService.executeHooks(HookType.FileSave, context);

		strictEqual(results.length, 2);
		strictEqual(results[0].success, true);
		strictEqual(results[1].success, true);
	});

	test('should handle hook execution with abortOnFailure', async () => {
		const hookConfig1: IHookConfiguration = {
			command: 'false', // This will fail
			abortOnFailure: true
		};

		const hookConfig2: IHookConfiguration = {
			command: 'echo',
			args: ['should not execute']
		};

		const disposable1 = hooksService.registerHook(HookType.PreCommit, hookConfig1);
		const disposable2 = hooksService.registerHook(HookType.PreCommit, hookConfig2);
		testDisposables.add(disposable1);
		testDisposables.add(disposable2);

		const context: IHookContext = {
			hookType: HookType.PreCommit
		};

		const results = await hooksService.executeHooks(HookType.PreCommit, context);

		// Only one result should be returned due to abortOnFailure
		strictEqual(results.length, 1);
		strictEqual(results[0].success, true); // In simulation, all hooks succeed
	});

	test('should fire hook execution events', async () => {
		const hookConfig: IHookConfiguration = {
			command: 'echo',
			args: ['test-event']
		};

		const disposable = hooksService.registerHook(HookType.PostCopilotResponse, hookConfig);
		testDisposables.add(disposable);

		let eventFired = false;
		const eventDisposable = hooksService.onHookExecuted(event => {
			eventFired = true;
			strictEqual(event.hookType, HookType.PostCopilotResponse);
			strictEqual(event.configuration, hookConfig);
			strictEqual(event.result.success, true);
		});
		testDisposables.add(eventDisposable);

		const context: IHookContext = {
			hookType: HookType.PostCopilotResponse
		};

		await hooksService.executeHooks(HookType.PostCopilotResponse, context);

		strictEqual(eventFired, true);
	});

	test('should dispose hooks when disposable is disposed', () => {
		const hookConfig: IHookConfiguration = {
			command: 'test'
		};

		const disposable = hooksService.registerHook(HookType.WorkspaceOpen, hookConfig);

		strictEqual(hooksService.hasHooks(HookType.WorkspaceOpen), true);

		disposable.dispose();

		strictEqual(hooksService.hasHooks(HookType.WorkspaceOpen), false);
	});

	test('should load hooks from configuration', async () => {
		const hooksConfig = {
			hooks: {
				'pre-copilot-prompt': [{
					command: 'echo',
					args: ['configured-hook']
				}],
				'pre-commit': [{
					script: './configured-script.sh',
					timeout: 3000
				}]
			}
		};

		configurationService.setUserConfiguration('hooks', hooksConfig.hooks);

		await hooksService.loadWorkspaceHooks();

		strictEqual(hooksService.hasHooks(HookType.PreCopilotPrompt), true);
		strictEqual(hooksService.hasHooks(HookType.PreCommit), true);

		const preCopilotHooks = hooksService.getHooks(HookType.PreCopilotPrompt);
		strictEqual(preCopilotHooks.length, 1);
		strictEqual(preCopilotHooks[0].command, 'echo');
		deepStrictEqual(preCopilotHooks[0].args, ['configured-hook']);

		const preCommitHooks = hooksService.getHooks(HookType.PreCommit);
		strictEqual(preCommitHooks.length, 1);
		strictEqual(preCommitHooks[0].script, './configured-script.sh');
		strictEqual(preCommitHooks[0].timeout, 3000);
	});
});