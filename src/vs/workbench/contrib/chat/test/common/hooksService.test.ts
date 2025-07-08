/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { HooksService } from '../common/hooksServiceImpl.js';
import { IHookConfiguration, IHookContext } from '../common/hooksService.js';

export class MockConfigurationService implements Partial<IConfigurationService> {
	private _config: any = {};

	setConfig(config: any): void {
		this._config = config;
	}

	getValue<T>(key: string): T {
		const keys = key.split('.');
		let current = this._config;
		for (const k of keys) {
			if (current && typeof current === 'object') {
				current = current[k];
			} else {
				return undefined as T;
			}
		}
		return current as T;
	}
}

export class MockLogService implements Partial<ILogService> {
	trace(message: string): void {
		console.log(`[TRACE] ${message}`);
	}

	error(message: string): void {
		console.error(`[ERROR] ${message}`);
	}

	warn(message: string): void {
		console.warn(`[WARN] ${message}`);
	}
}

export class MockFileService implements Partial<IFileService> {
	// Mock implementation
}

export class MockWorkspaceContextService implements Partial<IWorkspaceContextService> {
	// Mock implementation
}

export async function testHooksService(): Promise<void> {
	console.log('Testing HooksService...');

	const configService = new MockConfigurationService();
	const logService = new MockLogService();
	const fileService = new MockFileService();
	const workspaceService = new MockWorkspaceContextService();

	const hooksService = new HooksService(
		configService as IConfigurationService,
		fileService as IFileService,
		logService as ILogService,
		workspaceService as IWorkspaceContextService
	);

	// Test 1: No hooks configured
	console.log('\n1. Testing no hooks configured...');
	console.log('hasHooks():', hooksService.hasHooks());
	console.log('getHookConfiguration():', hooksService.getHookConfiguration('pre-copilot-chat-prompt'));

	// Test 2: Configure hooks
	console.log('\n2. Testing hooks configuration...');
	configService.setConfig({
		chat: {
			hooks: {
				'pre-copilot-chat-prompt': {
					enabled: true,
					script: './test-hook.js',
					timeout: 3000
				}
			}
		}
	});

	console.log('hasHooks():', hooksService.hasHooks());
	console.log('getHookConfiguration():', hooksService.getHookConfiguration('pre-copilot-chat-prompt'));

	// Test 3: Execute hook
	console.log('\n3. Testing hook execution...');
	const hookContext: IHookContext = {
		sessionId: 'test-session',
		message: 'test message',
		attachedContext: []
	};

	const result = await hooksService.executePreCopilotChatPromptHook(hookContext, CancellationToken.None);
	console.log('Hook result:', result);

	console.log('\nHooksService tests completed successfully!');
}

// Run tests if this file is executed directly
if (require.main === module) {
	testHooksService().catch(console.error);
}