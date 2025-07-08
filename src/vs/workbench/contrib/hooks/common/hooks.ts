/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';

export const IHooksService = createDecorator<IHooksService>('hooksService');

export enum HookType {
	PreCopilotPrompt = 'pre-copilot-prompt',
	PreContextAttach = 'pre-context-attach',
	PreCommit = 'pre-commit',
	PrePush = 'pre-push',
	PrePull = 'pre-pull',
	PostCopilotResponse = 'post-copilot-response',
	WorkspaceOpen = 'workspace-open',
	FileSave = 'file-save'
}

export interface IHookConfiguration {
	/**
	 * The script path or command to execute
	 */
	script?: string;
	
	/**
	 * The command to execute (alternative to script)
	 */
	command?: string;
	
	/**
	 * Arguments to pass to the command/script
	 */
	args?: string[];
	
	/**
	 * Timeout in milliseconds (default: 5000)
	 */
	timeout?: number;
	
	/**
	 * Whether to abort the action if the hook fails
	 */
	abortOnFailure?: boolean;
	
	/**
	 * Whether to run the hook asynchronously
	 */
	async?: boolean;
	
	/**
	 * Working directory for the hook execution
	 */
	cwd?: string;
	
	/**
	 * Environment variables to set
	 */
	env?: { [key: string]: string };
}

export interface IHookResult {
	/**
	 * Exit code of the hook
	 */
	exitCode: number;
	
	/**
	 * Standard output
	 */
	stdout: string;
	
	/**
	 * Standard error
	 */
	stderr: string;
	
	/**
	 * Whether the hook was successful
	 */
	success: boolean;
	
	/**
	 * Execution time in milliseconds
	 */
	executionTime: number;
}

export interface IHookContext {
	/**
	 * The type of hook being executed
	 */
	hookType: HookType;
	
	/**
	 * The workspace URI (if applicable)
	 */
	workspaceUri?: URI;
	
	/**
	 * Additional context data specific to the hook type
	 */
	data?: any;
	
	/**
	 * The file URI (if applicable)
	 */
	fileUri?: URI;
}

export interface IHookExecutionEvent {
	/**
	 * The hook type
	 */
	hookType: HookType;
	
	/**
	 * The hook configuration
	 */
	configuration: IHookConfiguration;
	
	/**
	 * The execution result
	 */
	result: IHookResult;
	
	/**
	 * The execution context
	 */
	context: IHookContext;
}

export interface IHooksService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when a hook is executed
	 */
	readonly onHookExecuted: Event<IHookExecutionEvent>;

	/**
	 * Register a hook for a specific type
	 */
	registerHook(hookType: HookType, configuration: IHookConfiguration): IDisposable;

	/**
	 * Execute all hooks for a specific type
	 */
	executeHooks(hookType: HookType, context: IHookContext): Promise<IHookResult[]>;

	/**
	 * Get all registered hooks for a specific type
	 */
	getHooks(hookType: HookType): IHookConfiguration[];

	/**
	 * Check if any hooks are registered for a specific type
	 */
	hasHooks(hookType: HookType): boolean;

	/**
	 * Clear all hooks for a specific type
	 */
	clearHooks(hookType: HookType): void;

	/**
	 * Load hooks from workspace configuration
	 */
	loadWorkspaceHooks(): Promise<void>;
}