/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../../base/common/codicons.js';
import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatWidgetService } from '../chat.js';
import { CHAT_CATEGORY } from './chatActions.js';

export const ENHANCE_PROMPT_ACTION_ID = 'workbench.action.chat.enhancePrompt';

type EnhancePromptEvent = {
	originalLength: number;
	enhancedLength: number;
	success: boolean;
	errorCode?: string;
};

type EnhancePromptClassification = {
	originalLength: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Length of original prompt in characters.' };
	enhancedLength: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Length of enhanced prompt in characters.' };
	success: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; isMeasurement: true; comment: 'Whether prompt enhancement succeeded.' };
	errorCode: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'Error code if enhancement failed.' };
	owner: 'copilot';
	comment: 'Tracks usage and performance of the Enhance Prompt feature.';
};

class EnhancePromptAction extends Action2 {
	static readonly ID = ENHANCE_PROMPT_ACTION_ID;

	constructor() {
		super({
			id: EnhancePromptAction.ID,
			title: localize2('chat.enhancePrompt.label', 'Enhance Prompt'),
			tooltip: localize('chat.enhancePrompt.tooltip', 'Rewrite your prompt to be more detailed and effective'),
			icon: Codicon.sparkle,
			category: CHAT_CATEGORY,
			menu: [
				{
					id: MenuId.ChatInput,
					when: ContextKeyExpr.and(
						ChatContextKeys.enabled,
						ChatContextKeys.requestInProgress.negate()
					),
					group: 'navigation',
					order: 1
				}
			],
			precondition: ContextKeyExpr.and(
				ChatContextKeys.enabled,
				ChatContextKeys.requestInProgress.negate()
			)
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const widgetService = accessor.get(IChatWidgetService);
		const notificationService = accessor.get(INotificationService);
		const telemetryService = accessor.get(ITelemetryService);

		const widget = widgetService.lastFocusedWidget;
		if (!widget?.input) {
			return;
		}

		const originalPrompt = widget.input.inputEditor.getValue().trim();
		if (!originalPrompt) {
			notificationService.warn(localize('chat.enhancePrompt.emptyPrompt', 'Please enter a prompt first before enhancing it.'));
			return;
		}

		const originalLength = originalPrompt.length;
		let enhancedLength = 0;
		let success = false;
		let errorCode: string | undefined;

		try {
			// For now, implement a simple enhancement algorithm
			// This will be enhanced to use LM services in subsequent iterations
			const enhancedPrompt = this.enhancePromptLocally(originalPrompt);
			
			if (!enhancedPrompt.trim()) {
				errorCode = 'EMPTY_ENHANCEMENT';
				throw new Error(localize('chat.enhancePrompt.emptyResponse', 'Failed to enhance the prompt.'));
			}

			enhancedLength = enhancedPrompt.length;
			success = true;

			// Replace the original prompt with the enhanced version
			widget.input.setValue(enhancedPrompt, false);
			
			// Show success notification
			notificationService.info(localize('chat.enhancePrompt.success', 'Prompt enhanced successfully. Review and edit as needed.'));

		} catch (error) {
			success = false;
			const message = error instanceof Error ? error.message : String(error);
			notificationService.error(localize('chat.enhancePrompt.error', 'Failed to enhance prompt: {0}', message));
		} finally {
			// Send telemetry
			telemetryService.publicLog2<EnhancePromptEvent, EnhancePromptClassification>('chat.enhancePrompt', {
				originalLength,
				enhancedLength,
				success,
				errorCode
			});
		}
	}

	private enhancePromptLocally(originalPrompt: string): string {
		// Simple prompt enhancement logic for the initial implementation
		const words = originalPrompt.trim().split(/\s+/);
		
		// If it's very short, add more context suggestions
		if (words.length <= 3) {
			return `${originalPrompt}. Please provide detailed explanations with examples and step-by-step guidance.`;
		}
		
		// If it doesn't ask for specific output format, add guidance
		if (!originalPrompt.toLowerCase().includes('explain') && 
			!originalPrompt.toLowerCase().includes('how') && 
			!originalPrompt.toLowerCase().includes('provide') &&
			!originalPrompt.toLowerCase().includes('show') &&
			!originalPrompt.toLowerCase().includes('give')) {
			return `Please explain ${originalPrompt} in detail with practical examples and clear step-by-step instructions.`;
		}
		
		// If it's already reasonably detailed, add specific output format request
		if (words.length > 5 && !originalPrompt.includes('format') && !originalPrompt.includes('structure')) {
			return `${originalPrompt} Please structure your response with clear headings, bullet points, and practical examples where applicable.`;
		}
		
		// For medium-length prompts, add specificity
		return `${originalPrompt} Please provide a comprehensive response with detailed explanations, relevant examples, and actionable insights.`;
	}
}

export function registerChatEnhancePromptActions(): void {
	registerAction2(EnhancePromptAction);
}