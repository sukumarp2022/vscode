/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isElectronSandboxed } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHookConfiguration, IHookContext, IHookResult, IHooksService } from './hooksService.js';

export class HooksService implements IHooksService {
	readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) { }

	async executePreCopilotChatPromptHook(context: IHookContext, token: CancellationToken): Promise<IHookResult> {
		return this.executeHook('pre-copilot-chat-prompt', context, token);
	}

	async executePreContextAttachHook(context: IHookContext, token: CancellationToken): Promise<IHookResult> {
		return this.executeHook('pre-context-attach', context, token);
	}

	async executePostCopilotResponseHook(context: IHookContext & { response: string }, token: CancellationToken): Promise<IHookResult> {
		return this.executeHook('post-copilot-response', context, token);
	}

	hasHooks(): boolean {
		const config = this.configurationService.getValue<any>('chat.hooks');
		return config && Object.keys(config).length > 0;
	}

	getHookConfiguration(hookType: string): IHookConfiguration | undefined {
		const config = this.configurationService.getValue<any>(`chat.hooks.${hookType}`);
		return config && config.enabled !== false ? config : undefined;
	}

	private async executeHook(hookType: string, context: IHookContext, token: CancellationToken): Promise<IHookResult> {
		const hookConfig = this.getHookConfiguration(hookType);
		if (!hookConfig) {
			return { success: true, shouldContinue: true };
		}

		// Check if we're in a supported environment for hook execution
		if (isElectronSandboxed()) {
			this.logService.warn(`Hook execution not supported in sandboxed environment: ${hookType}`);
			return { success: true, shouldContinue: true };
		}

		try {
			this.logService.trace(`Executing hook: ${hookType}`);

			const timeout = hookConfig.timeout || 5000;
			const command = this.buildCommand(hookConfig, context);

			if (token.isCancellationRequested) {
				return { success: false, shouldContinue: false, error: 'Hook execution cancelled' };
			}

			// In a real implementation, we would use a proper process execution service
			// For now, we'll simulate the hook execution
			const result = await this.simulateHookExecution(command, timeout, token);
			
			this.logService.trace(`Hook ${hookType} completed successfully`);
			return result;

		} catch (error) {
			this.logService.error(`Hook ${hookType} failed: ${error}`);
			return {
				success: false,
				shouldContinue: true, // Don't break the chat flow on hook errors
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	private buildCommand(hookConfig: IHookConfiguration, context: IHookContext): string {
		const contextJson = JSON.stringify(context);
		const contextArg = Buffer.from(contextJson).toString('base64');

		if (hookConfig.script) {
			// For script files, pass context as base64 encoded argument
			return `${hookConfig.script} ${contextArg}`;
		} else if (hookConfig.command) {
			// For commands, pass context as base64 encoded argument
			const args = hookConfig.args || [];
			return `${hookConfig.command} ${args.join(' ')} ${contextArg}`;
		}

		throw new Error('Hook configuration must specify either script or command');
	}

	private async simulateHookExecution(command: string, timeout: number, token: CancellationToken): Promise<IHookResult> {
		// For now, we'll simulate hook execution
		// In a real implementation, this would use a proper process execution service
		// that works across different environments (electron, web, etc.)
		
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				resolve({
					success: true,
					shouldContinue: true,
					modifiedMessage: undefined
				});
			}, 100); // Simulate some processing time

			token.onCancellationRequested(() => {
				clearTimeout(timer);
				resolve({
					success: false,
					shouldContinue: false,
					error: 'Hook execution cancelled'
				});
			});
		});
	}

	private parseHookResult(output: string): IHookResult {
		try {
			// Try to parse as JSON first
			const parsed = JSON.parse(output.trim());
			return {
				success: true,
				shouldContinue: parsed.shouldContinue !== false,
				modifiedMessage: parsed.modifiedMessage,
				modifiedContext: parsed.modifiedContext
			};
		} catch {
			// If not JSON, treat as plain text (backward compatibility)
			return {
				success: true,
				shouldContinue: true,
				modifiedMessage: output.trim() || undefined
			};
		}
	}
}