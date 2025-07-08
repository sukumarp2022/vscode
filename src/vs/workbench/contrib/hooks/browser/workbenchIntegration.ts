/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IHooksService, HookType } from '../common/hooks.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';

/**
 * Workbench contribution that integrates the hooks system with VSCode services
 */
export class HooksWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	
	static readonly ID = 'workbench.contrib.hooks';

	constructor(
		@IHooksService private readonly hooksService: IHooksService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super();
		this.initializeHooks();
	}

	private initializeHooks(): void {
		// Register workspace open hooks
		this.registerWorkspaceOpenHooks();
		
		// Register file save hooks
		this.registerFileSaveHooks();
		
		// Register commands for hook management
		this.registerCommands();
		
		// Listen for hook execution events
		this.registerHookEventListeners();
	}

	private registerWorkspaceOpenHooks(): void {
		// Execute workspace open hooks when workspace changes
		this._register(this.workspaceContextService.onDidChangeWorkspace(e => {
			if (e.added && e.added.length > 0) {
				const workspaceUri = e.added[0].uri;
				this.hooksService.executeHooks(HookType.WorkspaceOpen, {
					hookType: HookType.WorkspaceOpen,
					workspaceUri
				}).catch(error => {
					this.logService.error('Error executing workspace open hooks:', error);
				});
			}
		}));
	}

	private registerFileSaveHooks(): void {
		// Execute file save hooks before saving files
		this._register(this.textFileService.onWillSaveTextFile(e => {
			if (this.hooksService.hasHooks(HookType.FileSave)) {
				e.waitUntil(this.executeFileSaveHooks(e.model.resource));
			}
		}));
	}

	private async executeFileSaveHooks(fileUri: any): Promise<void> {
		const workspaceFolder = this.workspaceContextService.getWorkspaceFolder(fileUri);
		
		try {
			const results = await this.hooksService.executeHooks(HookType.FileSave, {
				hookType: HookType.FileSave,
				fileUri,
				workspaceUri: workspaceFolder?.uri
			});

			// Check if any hook failed with abortOnFailure
			for (const result of results) {
				if (!result.success) {
					this.logService.warn(`File save hook failed for ${fileUri.toString()}:`, result.stderr);
					// In a real implementation, this might prevent the save
				}
			}
		} catch (error) {
			this.logService.error('Error executing file save hooks:', error);
			this.notificationService.error(`File save hooks failed: ${error instanceof Error ? error.message : error}`);
		}
	}

	private registerCommands(): void {
		// Register commands for managing hooks
		this._register(this.commandService.registerCommand('hooks.reload', async () => {
			try {
				await this.hooksService.loadWorkspaceHooks();
				this.notificationService.info('Hooks configuration reloaded successfully');
			} catch (error) {
				this.notificationService.error(`Failed to reload hooks: ${error instanceof Error ? error.message : error}`);
			}
		}));

		this._register(this.commandService.registerCommand('hooks.clearAll', () => {
			const hookTypes = Object.values(HookType);
			hookTypes.forEach(hookType => {
				this.hooksService.clearHooks(hookType);
			});
			this.notificationService.info('All hooks cleared');
		}));

		this._register(this.commandService.registerCommand('hooks.showStatus', () => {
			const hookTypes = Object.values(HookType);
			const status = hookTypes.map(hookType => {
				const hooks = this.hooksService.getHooks(hookType);
				return `${hookType}: ${hooks.length} hook(s)`;
			}).join('\\n');
			
			this.notificationService.info(`Hooks Status:\\n${status}`);
		}));
	}

	private registerHookEventListeners(): void {
		// Listen for hook execution events and provide feedback
		this._register(this.hooksService.onHookExecuted(event => {
			if (!event.result.success) {
				this.logService.warn(`Hook execution failed for ${event.hookType}:`, event.result.stderr);
				
				// Show notification for critical hooks
				if (event.configuration.abortOnFailure) {
					this.notificationService.warn(`Hook failed for ${event.hookType}: ${event.result.stderr}`);
				}
			} else {
				this.logService.debug(`Hook executed successfully for ${event.hookType}: ${event.result.stdout}`);
			}
		}));
	}
}

/**
 * Integration helper for Git operations
 */
export class GitHooksIntegration extends Disposable {
	constructor(
		@IHooksService private readonly hooksService: IHooksService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	/**
	 * Execute pre-commit hooks before git commit
	 */
	async executePreCommitHooks(filePaths: string[]): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PreCommit)) {
			return true;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return true;
		}

		try {
			const results = await this.hooksService.executeHooks(HookType.PreCommit, {
				hookType: HookType.PreCommit,
				workspaceUri: workspaceFolder.uri,
				data: { filePaths }
			});

			// Check if any hook failed with abortOnFailure
			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-commit hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing pre-commit hooks:', error);
			return false;
		}
	}

	/**
	 * Execute pre-push hooks before git push
	 */
	async executePrePushHooks(branch: string): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PrePush)) {
			return true;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return true;
		}

		try {
			const results = await this.hooksService.executeHooks(HookType.PrePush, {
				hookType: HookType.PrePush,
				workspaceUri: workspaceFolder.uri,
				data: { branch }
			});

			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-push hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing pre-push hooks:', error);
			return false;
		}
	}

	/**
	 * Execute pre-pull hooks before git pull
	 */
	async executePrePullHooks(branch: string): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PrePull)) {
			return true;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return true;
		}

		try {
			const results = await this.hooksService.executeHooks(HookType.PrePull, {
				hookType: HookType.PrePull,
				workspaceUri: workspaceFolder.uri,
				data: { branch }
			});

			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-pull hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing pre-pull hooks:', error);
			return false;
		}
	}
}

/**
 * Integration helper for Copilot operations
 */
export class CopilotHooksIntegration extends Disposable {
	constructor(
		@IHooksService private readonly hooksService: IHooksService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	/**
	 * Execute pre-Copilot prompt hooks
	 */
	async executePreCopilotPromptHooks(prompt: string, context?: any): Promise<string | null> {
		if (!this.hooksService.hasHooks(HookType.PreCopilotPrompt)) {
			return prompt;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];

		try {
			const results = await this.hooksService.executeHooks(HookType.PreCopilotPrompt, {
				hookType: HookType.PreCopilotPrompt,
				workspaceUri: workspaceFolder?.uri,
				data: { prompt, context }
			});

			// Check if any hook failed with abortOnFailure
			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-Copilot prompt hook failed:', result.stderr);
					return null; // Abort the prompt
				}
			}

			// If hooks produced output, use the last one as the modified prompt
			const lastResult = results[results.length - 1];
			if (lastResult && lastResult.stdout.trim()) {
				return lastResult.stdout.trim();
			}

			return prompt;
		} catch (error) {
			this.logService.error('Error executing pre-Copilot prompt hooks:', error);
			return null; // Abort on error
		}
	}

	/**
	 * Execute pre-context attach hooks
	 */
	async executePreContextAttachHooks(contextData: any): Promise<any | null> {
		if (!this.hooksService.hasHooks(HookType.PreContextAttach)) {
			return contextData;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];

		try {
			const results = await this.hooksService.executeHooks(HookType.PreContextAttach, {
				hookType: HookType.PreContextAttach,
				workspaceUri: workspaceFolder?.uri,
				data: contextData
			});

			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-context attach hook failed:', result.stderr);
					return null; // Abort context attachment
				}
			}

			// If hooks produced output, try to parse it as JSON
			const lastResult = results[results.length - 1];
			if (lastResult && lastResult.stdout.trim()) {
				try {
					return JSON.parse(lastResult.stdout.trim());
				} catch (parseError) {
					this.logService.warn('Failed to parse hook output as JSON:', parseError);
				}
			}

			return contextData;
		} catch (error) {
			this.logService.error('Error executing pre-context attach hooks:', error);
			return null; // Abort on error
		}
	}

	/**
	 * Execute post-Copilot response hooks
	 */
	async executePostCopilotResponseHooks(response: any, originalPrompt: string): Promise<void> {
		if (!this.hooksService.hasHooks(HookType.PostCopilotResponse)) {
			return;
		}

		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];

		try {
			await this.hooksService.executeHooks(HookType.PostCopilotResponse, {
				hookType: HookType.PostCopilotResponse,
				workspaceUri: workspaceFolder?.uri,
				data: { response, originalPrompt }
			});
		} catch (error) {
			this.logService.error('Error executing post-Copilot response hooks:', error);
		}
	}
}