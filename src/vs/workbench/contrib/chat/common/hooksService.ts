/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatRequestVariableData } from './chatModel.js';
import { IParsedChatRequest } from './chatParserTypes.js';

export const IHooksService = createDecorator<IHooksService>('hooksService');

export interface IHookConfiguration {
	script?: string;
	command?: string;
	args?: string[];
	timeout?: number;
	enabled?: boolean;
}

export interface IHookContext {
	sessionId: string;
	message: string;
	variables?: IChatRequestVariableData;
	attachedContext?: any[];
}

export interface IHookResult {
	success: boolean;
	shouldContinue: boolean;
	modifiedMessage?: string;
	modifiedContext?: any[];
	error?: string;
}

export interface IHooksService {
	readonly _serviceBrand: undefined;

	/**
	 * Execute a pre-copilot-chat-prompt hook
	 */
	executePreCopilotChatPromptHook(context: IHookContext, token: CancellationToken): Promise<IHookResult>;

	/**
	 * Execute a pre-context-attach hook
	 */
	executePreContextAttachHook(context: IHookContext, token: CancellationToken): Promise<IHookResult>;

	/**
	 * Execute a post-copilot-response hook
	 */
	executePostCopilotResponseHook(context: IHookContext & { response: string }, token: CancellationToken): Promise<IHookResult>;

	/**
	 * Check if any hooks are configured
	 */
	hasHooks(): boolean;

	/**
	 * Get hook configuration for a specific hook type
	 */
	getHookConfiguration(hookType: string): IHookConfiguration | undefined;
}