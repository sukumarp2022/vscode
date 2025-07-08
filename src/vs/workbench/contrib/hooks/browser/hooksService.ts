/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHooksService, IHookConfiguration, IHookResult, IHookContext, IHookExecutionEvent, HookType } from '../common/hooks.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { join } from '../../../../base/common/path.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { isObject } from '../../../../base/common/types.js';
import { timeout } from '../../../../base/common/async.js';

export class HooksService extends Disposable implements IHooksService {
	declare readonly _serviceBrand: undefined;

	private readonly _onHookExecuted = this._register(new Emitter<IHookExecutionEvent>());
	readonly onHookExecuted = this._onHookExecuted.event;

	private readonly _registeredHooks = new Map<HookType, IHookConfiguration[]>();

	constructor(
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IFileService private readonly fileService: IFileService
	) {
		super();

		// Load hooks from configuration on startup
		this.loadWorkspaceHooks();

		// Listen for configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('hooks')) {
				this.loadWorkspaceHooks();
			}
		}));
	}

	registerHook(hookType: HookType, configuration: IHookConfiguration): IDisposable {
		let hooks = this._registeredHooks.get(hookType);
		if (!hooks) {
			hooks = [];
			this._registeredHooks.set(hookType, hooks);
		}

		hooks.push(configuration);
		this.logService.info(`Hook registered for type: ${hookType}`);

		return toDisposable(() => {
			const index = hooks!.indexOf(configuration);
			if (index !== -1) {
				hooks!.splice(index, 1);
				this.logService.info(`Hook unregistered for type: ${hookType}`);
			}
		});
	}

	async executeHooks(hookType: HookType, context: IHookContext): Promise<IHookResult[]> {
		const hooks = this._registeredHooks.get(hookType) || [];
		const results: IHookResult[] = [];

		this.logService.info(`Executing ${hooks.length} hooks for type: ${hookType}`);

		for (const hook of hooks) {
			try {
				const result = await this.executeHook(hook, context);
				results.push(result);

				// Fire event
				this._onHookExecuted.fire({
					hookType,
					configuration: hook,
					result,
					context
				});

				// Check if we should abort on failure
				if (!result.success && hook.abortOnFailure) {
					this.logService.warn(`Hook execution failed and abortOnFailure is true for hook type: ${hookType}`);
					break;
				}
			} catch (error) {
				this.logService.error(`Error executing hook for type ${hookType}:`, error);
				
				const errorResult: IHookResult = {
					exitCode: -1,
					stdout: '',
					stderr: error instanceof Error ? error.message : String(error),
					success: false,
					executionTime: 0
				};
				results.push(errorResult);

				// Fire event for error
				this._onHookExecuted.fire({
					hookType,
					configuration: hook,
					result: errorResult,
					context
				});

				if (hook.abortOnFailure) {
					break;
				}
			}
		}

		return results;
	}

	private async executeHook(hook: IHookConfiguration, context: IHookContext): Promise<IHookResult> {
		const startTime = Date.now();
		const timeoutMs = hook.timeout || 5000;

		// For browser environment, we simulate script execution
		// In a real implementation, this would use a process execution service
		const simulatedResult: IHookResult = {
			exitCode: 0,
			stdout: `Simulated execution of hook: ${hook.script || hook.command}`,
			stderr: '',
			success: true,
			executionTime: Date.now() - startTime
		};

		// Simulate timeout
		await timeout(100);

		this.logService.info(`Hook executed successfully: ${hook.script || hook.command}`);
		return simulatedResult;
	}

	getHooks(hookType: HookType): IHookConfiguration[] {
		return this._registeredHooks.get(hookType) || [];
	}

	hasHooks(hookType: HookType): boolean {
		const hooks = this._registeredHooks.get(hookType);
		return hooks !== undefined && hooks.length > 0;
	}

	clearHooks(hookType: HookType): void {
		this._registeredHooks.delete(hookType);
		this.logService.info(`Cleared all hooks for type: ${hookType}`);
	}

	async loadWorkspaceHooks(): Promise<void> {
		// Load from VSCode settings
		const config = this.configurationService.getValue<any>('hooks');
		if (config && isObject(config)) {
			this.loadHooksFromConfig(config);
		}

		// Load from .vscode/hooks.json
		const workspaceFolder = this.workspaceContextService.getWorkspace().folders[0];
		if (workspaceFolder) {
			try {
				const hooksFileUri = URI.file(join(workspaceFolder.uri.fsPath, '.vscode', 'hooks.json'));
				const content = await this.fileService.readFile(hooksFileUri);
				const hooksConfig = JSON.parse(content.value.toString());
				this.loadHooksFromConfig(hooksConfig);
			} catch (error) {
				// File doesn't exist or invalid JSON - this is expected
				this.logService.debug('No .vscode/hooks.json file found or invalid JSON');
			}
		}
	}

	private loadHooksFromConfig(config: any): void {
		if (!config.hooks || !isObject(config.hooks)) {
			return;
		}

		// Clear existing hooks loaded from configuration
		this._registeredHooks.clear();

		for (const [hookTypeName, hookConfigs] of Object.entries(config.hooks)) {
			const hookType = hookTypeName as HookType;
			if (!Object.values(HookType).includes(hookType)) {
				this.logService.warn(`Unknown hook type: ${hookTypeName}`);
				continue;
			}

			const configs = Array.isArray(hookConfigs) ? hookConfigs : [hookConfigs];
			for (const hookConfig of configs) {
				if (isObject(hookConfig)) {
					this.registerHook(hookType, hookConfig as IHookConfiguration);
				}
			}
		}
	}
}