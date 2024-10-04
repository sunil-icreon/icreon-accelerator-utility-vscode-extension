import vscode from "vscode";
import { IContext, IUri } from "./common.types";
import { showStatusContent } from "./util";

import { appendInExtensionState } from "./util";

import {
  initializeAddToSnippet,
  initializeAIDashboard,
  initializeAISearch,
  initializeConfig,
  initializeDashboard,
  initializeKnowledgeCenter,
  initializeNPMSearch,
  npmAuditReportCommand,
  runCommandOnSelection
} from "./audit-generator";

import { COMMANDS, LOCAL_STORAGE } from "./constants";
import { populateAddedSnippet } from "./snippet-utilities";

/**
 * @param {vscode.ExtensionContext} context
 */

export async function activate(context: IContext) {
  console.log(
    'Congratulations, your extension "icreon-accelerator-utility" is now active!'
  );

  showStatusContent(context);

  vscode.commands.registerCommand(
    "icreon-accelerator-utility.openSettings",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "icreon-accelerator-utility"
      );
    }
  );

  //dashboard
  const dashboardCmd = vscode.commands.registerCommand(
    COMMANDS.DASHBOARD,
    (uri) => {
      initializeDashboard(context, uri);
    }
  );
  context.subscriptions.push(dashboardCmd);

  // Auditing
  const npmAuditCmd = vscode.commands.registerCommand(
    COMMANDS.NPM_AUDIT,
    (parentContext: IContext, parentUri: IUri) =>
      npmAuditReportCommand(parentContext || context, parentUri)
  );
  context.subscriptions.push(npmAuditCmd);

  let disposable = vscode.commands.registerCommand(
    COMMANDS.NPM_AUDIT_SINGLE,
    async (uri) => {
      npmAuditReportCommand(context, uri);
    }
  );

  context.subscriptions.push(disposable);

  // Utilities
  const knowledgeCenterCmd = vscode.commands.registerCommand(
    COMMANDS.KNOWLEDGE_CENTER,
    async (uri) => {
      initializeKnowledgeCenter(context, uri);
    }
  );
  context.subscriptions.push(knowledgeCenterCmd);

  const npmSearchCmd = vscode.commands.registerCommand(
    COMMANDS.NPM_SEARCH,
    async (uri) => {
      initializeNPMSearch(context, uri);
    }
  );
  context.subscriptions.push(npmSearchCmd);

  const textSelectionCmd = vscode.commands.registerCommand(
    COMMANDS.ON_SELECTION,
    async (data) => {
      if (data) {
        const { pkgName, uri } = data;
        if (pkgName) {
          initializeNPMSearch(context, uri, pkgName);
          return;
        }
      }

      runCommandOnSelection(context, null, data);
    }
  );
  context.subscriptions.push(textSelectionCmd);

  const addToSnippetCmd = vscode.commands.registerCommand(
    COMMANDS.ADD_TO_SNIPPET,
    async (uri) => {
      initializeAddToSnippet(context, uri);
    }
  );
  context.subscriptions.push(addToSnippetCmd);

  const submitVulData = vscode.commands.registerCommand(
    COMMANDS.SUBMIT_VUL_DATA,
    async (data) => {
      if (Array.isArray(data) && data.length > 0) {
        data.map(async (vulForCache) => {
          if (Object.keys(vulForCache).length > 0) {
            await appendInExtensionState(
              LOCAL_STORAGE.VULNERABILITIES,
              vulForCache,
              "id",
              context
            );
          }
        });
      }
    }
  );
  context.subscriptions.push(submitVulData);

  // AI Dashboard
  const aiDashboardCmd = vscode.commands.registerCommand(
    COMMANDS.AI_DASHBOARD,
    async (uri) => {
      initializeAIDashboard(context, uri);
    }
  );
  context.subscriptions.push(aiDashboardCmd);

  // AI Search Page
  const aiSearchPageCmd = vscode.commands.registerCommand(
    COMMANDS.AI_SEARCH,
    async (uri) => {
      initializeAISearch(context, uri);
    }
  );
  context.subscriptions.push(aiSearchPageCmd);

  // AI Config Page
  const configCmd = vscode.commands.registerCommand(
    COMMANDS.CONFIGURATION,
    async (uri, sourceType) => {
      initializeConfig(context, uri, sourceType);
    }
  );
  context.subscriptions.push(configCmd);

  // Add previously added snippets
  populateAddedSnippet(context);
}

export function deactivate() {}
