/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IHooksService } from '../common/hooks.js';
import { HooksService } from './hooksService.js';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';

// Register the hooks service
registerSingleton(IHooksService, HooksService, false);

// Register configuration schema
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'hooks',
	title: localize('hooks', "Hooks"),
	type: 'object',
	properties: {
		'hooks.enabled': {
			type: 'boolean',
			default: true,
			description: localize('hooks.enabled', "Enable or disable the hooks system")
		},
		'hooks.timeout': {
			type: 'number',
			default: 5000,
			description: localize('hooks.timeout', "Default timeout for hook execution in milliseconds")
		},
		'hooks.preCopilotPrompt': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: {
						type: 'string',
						description: localize('hooks.script', "Path to the script to execute")
					},
					command: {
						type: 'string',
						description: localize('hooks.command', "Command to execute")
					},
					args: {
						type: 'array',
						items: { type: 'string' },
						description: localize('hooks.args', "Arguments to pass to the command/script")
					},
					timeout: {
						type: 'number',
						description: localize('hooks.timeout', "Timeout in milliseconds")
					},
					abortOnFailure: {
						type: 'boolean',
						default: false,
						description: localize('hooks.abortOnFailure', "Whether to abort the action if the hook fails")
					},
					async: {
						type: 'boolean',
						default: false,
						description: localize('hooks.async', "Whether to run the hook asynchronously")
					},
					cwd: {
						type: 'string',
						description: localize('hooks.cwd', "Working directory for the hook execution")
					},
					env: {
						type: 'object',
						additionalProperties: { type: 'string' },
						description: localize('hooks.env', "Environment variables to set")
					}
				}
			},
			default: [],
			description: localize('hooks.preCopilotPrompt', "Hooks to run before sending prompts to Copilot")
		},
		'hooks.preContextAttach': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.preContextAttach', "Hooks to run before attaching context to Copilot")
		},
		'hooks.preCommit': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.preCommit', "Hooks to run before git commit operations")
		},
		'hooks.prePush': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.prePush', "Hooks to run before git push operations")
		},
		'hooks.prePull': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.prePull', "Hooks to run before git pull operations")
		},
		'hooks.postCopilotResponse': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.postCopilotResponse', "Hooks to run after receiving Copilot response")
		},
		'hooks.workspaceOpen': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.workspaceOpen', "Hooks to run when opening a workspace")
		},
		'hooks.fileSave': {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					script: { type: 'string' },
					command: { type: 'string' },
					args: { type: 'array', items: { type: 'string' } },
					timeout: { type: 'number' },
					abortOnFailure: { type: 'boolean', default: false },
					async: { type: 'boolean', default: false },
					cwd: { type: 'string' },
					env: { type: 'object', additionalProperties: { type: 'string' } }
				}
			},
			default: [],
			description: localize('hooks.fileSave', "Hooks to run before saving files")
		}
	}
});

// JSON Schema for .vscode/hooks.json
const jsonRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
jsonRegistry.registerConfiguration({
	id: 'vscode://schemas/hooks',
	type: 'object',
	title: localize('hooks.schema.title', "VSCode Hooks Configuration"),
	properties: {
		hooks: {
			type: 'object',
			description: localize('hooks.schema.description', "Configuration for VSCode hooks"),
			properties: {
				'pre-copilot-prompt': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'pre-context-attach': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'pre-commit': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'pre-push': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'pre-pull': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'post-copilot-response': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'workspace-open': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				},
				'file-save': {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							script: { type: 'string' },
							command: { type: 'string' },
							args: { type: 'array', items: { type: 'string' } },
							timeout: { type: 'number' },
							abortOnFailure: { type: 'boolean' },
							async: { type: 'boolean' },
							cwd: { type: 'string' },
							env: { type: 'object', additionalProperties: { type: 'string' } }
						}
					}
				}
			}
		}
	}
});