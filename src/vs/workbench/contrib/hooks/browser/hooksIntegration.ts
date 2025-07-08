/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IHooksService, HookType, IHookContext } from '../common/hooks.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { URI } from '../../../../base/common/uri.js';

/**
 * Integration helper class that provides methods to easily integrate hooks
 * with various VSCode services and actions.
 */
export class HooksIntegration {
	constructor(
		private readonly hooksService: IHooksService,
		private readonly logService: ILogService
	) { }

	/**
	 * Execute pre-Copilot prompt hooks
	 */
	async executePreCopilotPromptHooks(prompt: string, context?: any): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PreCopilotPrompt)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PreCopilotPrompt,
			data: { prompt, context }
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.PreCopilotPrompt, hookContext);
			
			// Check if any hook failed and had abortOnFailure set
			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-Copilot prompt hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing pre-Copilot prompt hooks:', error);
			return false;
		}
	}

	/**
	 * Execute pre-context attach hooks
	 */
	async executePreContextAttachHooks(contextData: any, workspaceUri?: URI): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PreContextAttach)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PreContextAttach,
			workspaceUri,
			data: contextData
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.PreContextAttach, hookContext);
			
			for (const result of results) {
				if (!result.success) {
					this.logService.warn('Pre-context attach hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing pre-context attach hooks:', error);
			return false;
		}
	}

	/**
	 * Execute post-Copilot response hooks
	 */
	async executePostCopilotResponseHooks(response: any, originalPrompt: string): Promise<void> {
		if (!this.hooksService.hasHooks(HookType.PostCopilotResponse)) {
			return;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PostCopilotResponse,
			data: { response, originalPrompt }
		};

		try {
			await this.hooksService.executeHooks(HookType.PostCopilotResponse, hookContext);
		} catch (error) {
			this.logService.error('Error executing post-Copilot response hooks:', error);
		}
	}

	/**
	 * Execute pre-commit hooks
	 */
	async executePreCommitHooks(filePaths: string[], workspaceUri: URI): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PreCommit)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PreCommit,
			workspaceUri,
			data: { filePaths }
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.PreCommit, hookContext);
			
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
	 * Execute pre-push hooks
	 */
	async executePrePushHooks(branch: string, workspaceUri: URI): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PrePush)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PrePush,
			workspaceUri,
			data: { branch }
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.PrePush, hookContext);
			
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
	 * Execute pre-pull hooks
	 */
	async executePrePullHooks(branch: string, workspaceUri: URI): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.PrePull)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.PrePull,
			workspaceUri,
			data: { branch }
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.PrePull, hookContext);
			
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

	/**
	 * Execute workspace open hooks
	 */
	async executeWorkspaceOpenHooks(workspaceUri: URI): Promise<void> {
		if (!this.hooksService.hasHooks(HookType.WorkspaceOpen)) {
			return;
		}

		const hookContext: IHookContext = {
			hookType: HookType.WorkspaceOpen,
			workspaceUri
		};

		try {
			await this.hooksService.executeHooks(HookType.WorkspaceOpen, hookContext);
		} catch (error) {
			this.logService.error('Error executing workspace open hooks:', error);
		}
	}

	/**
	 * Execute file save hooks
	 */
	async executeFileSaveHooks(fileUri: URI, workspaceUri?: URI): Promise<boolean> {
		if (!this.hooksService.hasHooks(HookType.FileSave)) {
			return true;
		}

		const hookContext: IHookContext = {
			hookType: HookType.FileSave,
			workspaceUri,
			fileUri
		};

		try {
			const results = await this.hooksService.executeHooks(HookType.FileSave, hookContext);
			
			for (const result of results) {
				if (!result.success) {
					this.logService.warn('File save hook failed:', result.stderr);
					return false;
				}
			}

			return true;
		} catch (error) {
			this.logService.error('Error executing file save hooks:', error);
			return false;
		}
	}

	/**
	 * Register a listener for hook execution events
	 */
	onHookExecuted(listener: (event: any) => void): IDisposable {
		return this.hooksService.onHookExecuted(listener);
	}
}

/**
 * Example usage patterns for integrating hooks with existing VSCode services
 */
export class HooksUsageExamples {
	constructor(private readonly hooksIntegration: HooksIntegration) { }

	/**
	 * Example: Integration with Copilot service
	 */
	async sendCopilotPrompt(prompt: string, context?: any): Promise<any> {
		// Execute pre-prompt hooks
		const canProceed = await this.hooksIntegration.executePreCopilotPromptHooks(prompt, context);
		if (!canProceed) {
			throw new Error('Pre-Copilot prompt hooks failed');
		}

		// Simulate sending prompt to Copilot
		const response = { text: 'Copilot response', confidence: 0.95 };

		// Execute post-response hooks
		await this.hooksIntegration.executePostCopilotResponseHooks(response, prompt);

		return response;
	}

	/**
	 * Example: Integration with Git service
	 */
	async commitChanges(filePaths: string[], message: string, workspaceUri: URI): Promise<boolean> {
		// Execute pre-commit hooks
		const canCommit = await this.hooksIntegration.executePreCommitHooks(filePaths, workspaceUri);
		if (!canCommit) {
			return false;
		}

		// Simulate git commit
		console.log(`Committing files: ${filePaths.join(', ')} with message: ${message}`);
		return true;
	}

	/**
	 * Example: Integration with file service
	 */
	async saveFile(fileUri: URI, content: string, workspaceUri?: URI): Promise<boolean> {
		// Execute file save hooks
		const canSave = await this.hooksIntegration.executeFileSaveHooks(fileUri, workspaceUri);
		if (!canSave) {
			return false;
		}

		// Simulate file save
		console.log(`Saving file: ${fileUri.toString()}`);
		return true;
	}

	/**
	 * Example: Integration with workspace service
	 */
	async openWorkspace(workspaceUri: URI): Promise<void> {
		// Simulate opening workspace
		console.log(`Opening workspace: ${workspaceUri.toString()}`);

		// Execute workspace open hooks
		await this.hooksIntegration.executeWorkspaceOpenHooks(workspaceUri);
	}
}