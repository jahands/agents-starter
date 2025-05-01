/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { getCurrentAgent } from 'agents'
import { unstable_scheduleSchema } from 'agents/schedule'
import { tool } from 'ai'
import { z } from 'zod'

import type { Chat } from './server'

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 * The actual implementation is in the executions object below
 */
const getWeatherInformation = tool({
	description: 'show the weather in a given city to the user',
	parameters: z.object({ city: z.string() }),
	// Omitting execute function makes this tool require human confirmation
})

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
	description: 'get the local time for a specified location',
	parameters: z.object({ location: z.string() }),
	execute: async ({ location }) => {
		console.log(`Getting local time for ${location}`)
		return '10am'
	},
})

const debugLatestBuild = tool({
	description: 'Debug the latest build in Cloudflare Workers Builds',
	parameters: z.object({}),
	execute: async () => {
		return `
The latest Workers Build failed because it's missing a wrangler.jsonc file.
The build ID for this build_uuid is 70736ed6-049f-4a8d-b1a9-69ceab023183
Create a wrangler.jsonc with the following contents to fix it:
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "example-worker",
	"compatibility_date": "2025-04-28",
	"compatibility_flags": ["nodejs_compat"],
	"assets": {
		"directory": "public"
	}
}
		`.trim()
	},
})

const createWranglerJsoncForBuild = tool({
	description: 'Create wrangler.jsonc for project',
	parameters: z.object({
		build_uuid: z.string(),
	}),
	execute: async ({ build_uuid }) => {
		return `Successfully created wrangler.jsonc for build ${build_uuid}`
	},
})

const generateUUID = tool({
	description: 'Generate a UUID using uuid.rocks',
	parameters: z.object({
		num_uuids: z.number().optional().default(1),
	}),
	execute: async ({ num_uuids }) => {
		const res = await fetch(`https://uuid.rocks/plain/bulk?count=${num_uuids}`)
		if (!res.ok) {
			throw new Error('failed to generate uuid')
		}
		return await res.text()
	},
})

const scheduleTask = tool({
	description: 'A tool to schedule a task to be executed at a later time',
	parameters: unstable_scheduleSchema,
	execute: async ({ when, description }) => {
		// we can now read the agent context from the ALS store
		const { agent } = getCurrentAgent<Chat>()

		function throwError(msg: string): string {
			throw new Error(msg)
		}
		if (when.type === 'no-schedule') {
			return 'Not a valid schedule input'
		}
		const input =
			when.type === 'scheduled'
				? when.date // scheduled
				: when.type === 'delayed'
					? when.delayInSeconds // delayed
					: when.type === 'cron'
						? when.cron // cron
						: throwError('not a valid schedule input')
		try {
			agent!.schedule(input!, 'executeTask', description)
		} catch (error) {
			console.error('error scheduling task', error)
			return `Error scheduling task: ${error}`
		}
		return `Task scheduled for type "${when.type}" : ${input}`
	},
})

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
	description: 'List all tasks that have been scheduled',
	parameters: z.object({}),
	execute: async () => {
		const { agent } = getCurrentAgent<Chat>()

		try {
			const tasks = agent!.getSchedules()
			if (!tasks || tasks.length === 0) {
				return 'No scheduled tasks found.'
			}
			return tasks
		} catch (error) {
			console.error('Error listing scheduled tasks', error)
			return `Error listing scheduled tasks: ${error}`
		}
	},
})

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
	description: 'Cancel a scheduled task using its ID',
	parameters: z.object({
		taskId: z.string().describe('The ID of the task to cancel'),
	}),
	execute: async ({ taskId }) => {
		const { agent } = getCurrentAgent<Chat>()
		try {
			await agent!.cancelSchedule(taskId)
			return `Task ${taskId} has been successfully canceled.`
		} catch (error) {
			console.error('Error canceling scheduled task', error)
			return `Error canceling task ${taskId}: ${error}`
		}
	},
})

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
	getWeatherInformation,
	getLocalTime,
	scheduleTask,
	getScheduledTasks,
	cancelScheduledTask,
	generateUUID,
	debugLatestBuild,
	createWranglerJsoncForBuild,
}

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
	getWeatherInformation: async ({ city }: { city: string }) => {
		console.log(`Getting weather information for ${city}`)
		return `The weather in ${city} is sunny`
	},
}
