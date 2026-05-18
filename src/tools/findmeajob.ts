import type { AgentTool, AgentToolResult, AgentToolUpdateCallback } from "@mariozechner/pi-agent-core";
import type { ToolResultMessage } from "@mariozechner/pi-ai";
import { type Static, StringEnum, Type } from "@mariozechner/pi-ai";
import { registerToolRenderer, renderHeader, type ToolRenderer, type ToolRenderResult } from "@mariozechner/pi-web-ui";
import { html } from "lit";
import { Briefcase } from "lucide";
import { FINDMEAJOB_TOOL_DESCRIPTION } from "../prompts/prompts.js";
import { getSitegeistStorage } from "../storage/app-storage.js";

const DEFAULT_BASE_URL = "http://localhost:8000";

async function getBaseUrl(): Promise<string> {
	const settings = getSitegeistStorage().settings;
	const stored = await settings.get("findmeajobBaseUrl");
	return (stored as string) || DEFAULT_BASE_URL;
}

const operationIds = [
	"list_statuses",
	"create_status",
	"update_status",
	"list_sources",
	"create_source",
	"list_cvs",
	"create_cv",
	"get_cv",
	"update_cv",
	"delete_cv",
	"list_cover_letters",
	"create_cover_letter",
	"get_cover_letter",
	"update_cover_letter",
	"delete_cover_letter",
	"list_applications",
	"create_application",
	"get_application",
	"update_application",
	"delete_application",
	"get_status_history",
	"transition_status",
	"list_application_contacts",
	"link_contact",
	"unlink_contact",
	"list_application_tags",
	"add_tag",
	"remove_tag",
	"list_contacts",
	"create_contact",
	"get_contact",
	"update_contact",
	"delete_contact",
	"list_tags",
	"create_tag",
	"unified_search",
	"health",
] as const;

type OperationId = (typeof operationIds)[number];

interface OperationRoute {
	method: string;
	path: string;
}

const operationRoutes: Record<OperationId, OperationRoute> = {
	list_statuses: { method: "GET", path: "/statuses" },
	create_status: { method: "POST", path: "/statuses" },
	update_status: { method: "PATCH", path: "/statuses/{status_id}" },
	list_sources: { method: "GET", path: "/sources" },
	create_source: { method: "POST", path: "/sources" },
	list_cvs: { method: "GET", path: "/cvs" },
	create_cv: { method: "POST", path: "/cvs" },
	get_cv: { method: "GET", path: "/cvs/{cv_id}" },
	update_cv: { method: "PATCH", path: "/cvs/{cv_id}" },
	delete_cv: { method: "DELETE", path: "/cvs/{cv_id}" },
	list_cover_letters: { method: "GET", path: "/cover-letters" },
	create_cover_letter: { method: "POST", path: "/cover-letters" },
	get_cover_letter: { method: "GET", path: "/cover-letters/{cl_id}" },
	update_cover_letter: { method: "PATCH", path: "/cover-letters/{cl_id}" },
	delete_cover_letter: { method: "DELETE", path: "/cover-letters/{cl_id}" },
	list_applications: { method: "GET", path: "/applications" },
	create_application: { method: "POST", path: "/applications" },
	get_application: { method: "GET", path: "/applications/{app_id}" },
	update_application: { method: "PATCH", path: "/applications/{app_id}" },
	delete_application: { method: "DELETE", path: "/applications/{app_id}" },
	get_status_history: { method: "GET", path: "/applications/{app_id}/status-history" },
	transition_status: { method: "POST", path: "/applications/{app_id}/status" },
	list_application_contacts: { method: "GET", path: "/applications/{app_id}/contacts" },
	link_contact: { method: "POST", path: "/applications/{app_id}/contacts" },
	unlink_contact: { method: "DELETE", path: "/applications/{app_id}/contacts/{contact_id}" },
	list_application_tags: { method: "GET", path: "/applications/{app_id}/tags" },
	add_tag: { method: "POST", path: "/applications/{app_id}/tags" },
	remove_tag: { method: "DELETE", path: "/applications/{app_id}/tags/{tag_id}" },
	list_contacts: { method: "GET", path: "/contacts" },
	create_contact: { method: "POST", path: "/contacts" },
	get_contact: { method: "GET", path: "/contacts/{contact_id}" },
	update_contact: { method: "PATCH", path: "/contacts/{contact_id}" },
	delete_contact: { method: "DELETE", path: "/contacts/{contact_id}" },
	list_tags: { method: "GET", path: "/tags" },
	create_tag: { method: "POST", path: "/tags" },
	unified_search: { method: "GET", path: "/search" },
	health: { method: "GET", path: "/health" },
};

function buildUrl(
	baseUrl: string,
	pathTemplate: string,
	pathParams?: Record<string, any>,
	queryParams?: Record<string, any>,
): string {
	let path = pathTemplate;
	if (pathParams) {
		for (const [key, value] of Object.entries(pathParams)) {
			path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
		}
	}

	const url = new URL(path, baseUrl);
	if (queryParams) {
		for (const [key, value] of Object.entries(queryParams)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}
	}

	return url.toString();
}

const findmeajobParamsSchema = Type.Object({
	operation: StringEnum([...operationIds], {
		description: "API operation to perform (maps to OpenAPI operationId)",
	}),
	path_params: Type.Optional(
		Type.Record(Type.String(), Type.Any(), {
			description: "Path parameters (e.g., { app_id: 123 })",
		}),
	),
	query_params: Type.Optional(
		Type.Record(Type.String(), Type.Any(), {
			description: "Query parameters (e.g., { status: 'applied', limit: 10 })",
		}),
	),
	body: Type.Optional(
		Type.Record(Type.String(), Type.Any(), {
			description: "Request body for POST/PATCH operations",
		}),
	),
});

type FindMeAJobParams = Static<typeof findmeajobParamsSchema>;

export const findmeajobTool: AgentTool<typeof findmeajobParamsSchema, any> = {
	label: "FindMeAJob",
	name: "findmeajob",
	description: FINDMEAJOB_TOOL_DESCRIPTION,
	parameters: findmeajobParamsSchema,
	execute: async (
		_toolCallId: string,
		args: FindMeAJobParams,
		_signal?: AbortSignal,
		_onUpdate?: AgentToolUpdateCallback<any>,
	): Promise<AgentToolResult<any>> => {
		const route = operationRoutes[args.operation as OperationId];
		if (!route) {
			throw new Error(`Unknown operation: ${args.operation}`);
		}

		const baseUrl = await getBaseUrl();
		const url = buildUrl(baseUrl, route.path, args.path_params, args.query_params);

		const fetchOptions: RequestInit = {
			method: route.method,
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		};

		if (args.body && (route.method === "POST" || route.method === "PATCH" || route.method === "PUT")) {
			fetchOptions.body = JSON.stringify(args.body);
		}

		try {
			const response = await fetch(url, fetchOptions);

			if (response.status === 204) {
				return {
					content: [{ type: "text", text: `${args.operation}: success (204 No Content)` }],
					details: { operation: args.operation, status: 204 },
				};
			}

			const data = await response.json();

			if (!response.ok) {
				const errorText = JSON.stringify(data, null, 2);
				throw new Error(`${args.operation} failed (${response.status}): ${errorText}`);
			}

			const text = JSON.stringify(data, null, 2);
			return {
				content: [{ type: "text", text }],
				details: { operation: args.operation, status: response.status, data },
			};
		} catch (error: unknown) {
			if (error instanceof TypeError && (error as Error).message.includes("fetch")) {
				throw new Error(`Cannot reach API at ${baseUrl}. Is the server running?`);
			}
			throw error;
		}
	},
};

// Renderer
interface FindMeAJobResultDetails {
	operation?: string;
	status?: number;
	data?: any;
}

export const findmeajobRenderer: ToolRenderer<FindMeAJobParams, FindMeAJobResultDetails> = {
	render(
		params: FindMeAJobParams | undefined,
		result: ToolResultMessage<FindMeAJobResultDetails> | undefined,
	): ToolRenderResult {
		const state = result ? (result.isError ? "error" : "complete") : "inprogress";
		const operation = params?.operation || "...";
		const label = operation.replace(/_/g, " ");

		if (result?.isError) {
			return {
				content: html`
				<div class="space-y-2">
					${renderHeader(state, Briefcase, label)}
					<div class="text-sm text-destructive">${result.content.find((c) => c.type === "text")?.text || ""}</div>
				</div>
			`,
				isCustom: false,
			};
		}

		return {
			content: renderHeader(state, Briefcase, label),
			isCustom: false,
		};
	},
};

registerToolRenderer(findmeajobTool.name, findmeajobRenderer);
