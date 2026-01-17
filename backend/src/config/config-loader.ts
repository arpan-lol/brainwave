import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { WorkflowConfig } from "../agents/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let WORKFLOW_CONFIG_CACHE: any | null = null;

export function loadWorkflowConfig(): any {
  if (WORKFLOW_CONFIG_CACHE) {
    return WORKFLOW_CONFIG_CACHE;
  }

  try {
    const configPath = join(__dirname, "../config/workflow-config.json");
    const rawData = readFileSync(configPath, "utf-8");
    WORKFLOW_CONFIG_CACHE = JSON.parse(rawData);
    return WORKFLOW_CONFIG_CACHE;
  } catch (error) {
    console.error("Failed to load workflow config:", error);
    throw new Error("Workflow configuration not found");
  }
}

export function getRouterConfig() {
  const config = loadWorkflowConfig();
  return config.router;
}

export function getCreativeConfig() {
  const config = loadWorkflowConfig();
  return config.creative;
}

export function getValidationConfig() {
  const config = loadWorkflowConfig();
  return config.validation;
}

export function getWorkflowErrorHandling() {
  const config = loadWorkflowConfig();
  return config.workflow.error_handling;
}

export function getHITLConfig() {
  const config = loadWorkflowConfig();
  return config.hitl;
}

export function reloadWorkflowConfig(): void {
  WORKFLOW_CONFIG_CACHE = null;
}
