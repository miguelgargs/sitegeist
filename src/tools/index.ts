import { BashRenderer, CalculateRenderer, GetCurrentTimeRenderer, registerToolRenderer } from "@mariozechner/pi-web-ui";
import "./skill.js";
import "./findmeajob.js";
import "./stepstonefindmeajob.js";
import "./ask-user-which-element.js"; // Import for side effects (registers renderer)

// Register all built-in tool renderers
registerToolRenderer("calculate", new CalculateRenderer());
registerToolRenderer("get_current_time", new GetCurrentTimeRenderer());
registerToolRenderer("bash", new BashRenderer());

export { AskUserWhichElementTool, askUserWhichElementTool } from "./ask-user-which-element.js";
export { findmeajobTool } from "./findmeajob.js";
// Export sitegeist-specific REPL tool instead of web-ui default
export { createReplTool, javascriptReplTool } from "./repl/repl.js";
export { requestUserScriptsPermission } from "./repl/userscripts-helpers.js";
export { skillTool } from "./skill.js";
export { stepstonefindmeajobTool } from "./stepstonefindmeajob.js";
