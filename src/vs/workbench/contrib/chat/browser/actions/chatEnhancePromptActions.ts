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
			notificationService.warn(localize('chat.enhancePrompt.noWidget', 'No active chat window found.'));
			return;
		}

		const originalPrompt = widget.input.inputEditor.getValue();
		const trimmedPrompt = originalPrompt.trim();
		
		if (!trimmedPrompt) {
			notificationService.warn(localize('chat.enhancePrompt.emptyPrompt', 'Please enter a prompt first before enhancing it.'));
			// Focus the input editor to help the user
			widget.input.inputEditor.focus();
			return;
		}

		// Don't enhance if the prompt is already very long (>500 chars) as it's likely already detailed
		if (trimmedPrompt.length > 500) {
			notificationService.info(localize('chat.enhancePrompt.alreadyDetailed', 'Your prompt is already quite detailed. Consider breaking it into smaller, focused questions for better results.'));
			return;
		}

		const originalLength = trimmedPrompt.length;
		let enhancedLength = 0;
		let success = false;
		let errorCode: string | undefined;

		try {
			// Implement enhancement logic
			const enhancedPrompt = this.enhancePromptLocally(trimmedPrompt);
			
			if (!enhancedPrompt.trim()) {
				errorCode = 'EMPTY_ENHANCEMENT';
				throw new Error(localize('chat.enhancePrompt.emptyResponse', 'Failed to enhance the prompt.'));
			}

			enhancedLength = enhancedPrompt.length;
			
			// Check if enhancement actually changed something meaningful
			if (enhancedPrompt.trim() === trimmedPrompt) {
				notificationService.info(localize('chat.enhancePrompt.noImprovement', 'Your prompt is already well-structured and doesn\'t need enhancement.'));
				return;
			}

			success = true;

			// Replace the original prompt with the enhanced version
			widget.input.setValue(enhancedPrompt, false);
			
			// Focus back to the input for user review
			widget.input.inputEditor.focus();
			
			// Show success notification
			notificationService.info(localize('chat.enhancePrompt.success', 'Prompt enhanced successfully. Review and edit as needed before submitting.'));

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
		const trimmed = originalPrompt.trim();
		const words = trimmed.split(/\s+/);
		const length = words.length;
		
		// Handle single words or very short prompts
		if (length === 1) {
			const word = words[0].toLowerCase();
			if (word.includes('debug') || word.includes('fix') || word.includes('error')) {
				return `Please help me debug and fix ${originalPrompt}. Provide step-by-step troubleshooting guidance with common solutions and best practices.`;
			}
			if (word.includes('create') || word.includes('build') || word.includes('make')) {
				return `Please guide me through creating ${originalPrompt} with detailed step-by-step instructions, code examples, and best practices.`;
			}
			return `Please explain ${originalPrompt} in detail with practical examples, step-by-step guidance, and real-world use cases.`;
		}
		
		// Handle very short prompts (2-3 words)
		if (length <= 3) {
			if (trimmed.toLowerCase().includes('how to') || trimmed.toLowerCase().includes('how do')) {
				return `${originalPrompt} Please provide detailed step-by-step instructions with code examples and best practices.`;
			}
			return `${originalPrompt}. Please provide comprehensive explanations with practical examples, step-by-step guidance, and relevant code snippets.`;
		}
		
		// Check if it's already asking for specific things
		const lowerPrompt = trimmed.toLowerCase();
		const hasSpecificRequest = lowerPrompt.includes('explain') || 
									lowerPrompt.includes('how') || 
									lowerPrompt.includes('provide') ||
									lowerPrompt.includes('show') ||
									lowerPrompt.includes('give') ||
									lowerPrompt.includes('create') ||
									lowerPrompt.includes('help');
		
		// Check if it already mentions format or structure
		const hasFormatRequest = lowerPrompt.includes('format') || 
								lowerPrompt.includes('structure') ||
								lowerPrompt.includes('example') ||
								lowerPrompt.includes('step') ||
								lowerPrompt.includes('detail');
		
		// For medium-length prompts without specific requests
		if (length <= 10 && !hasSpecificRequest) {
			return `Please explain ${originalPrompt} in detail with practical examples and clear step-by-step instructions. Include relevant code snippets and best practices.`;
		}
		
		// For longer prompts that already have specific requests but lack format guidance
		if (hasSpecificRequest && !hasFormatRequest) {
			return `${originalPrompt} Please structure your response with clear headings, bullet points, code examples, and actionable steps where applicable.`;
		}
		
		// For already detailed prompts, add context for better responses
		if (length > 10) {
			return `${originalPrompt} Please provide a comprehensive response with detailed explanations, relevant examples, potential alternatives, and practical implementation guidance.`;
		}
		
		// Default enhancement for medium-length prompts
		return `${originalPrompt} Please provide a detailed response with explanations, examples, and actionable insights.`;
	}
}

export function registerChatEnhancePromptActions(): void {
	registerAction2(EnhancePromptAction);
}