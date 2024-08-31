const vscode = require("vscode");

const { registerCommand, appendInExtensionState, logMsg } = require("./util");

const {
  npmAuditReportCommand,
  initializeKnowledgeCenter,
  initializeNPMSearch,
  runCommandOnSelection,
  initializeDashboard,
  initializeAIDashboard,
  initializeAISearch,
  initializeConfig
} = require("./audit-generator");

const { COMMANDS, LOCAL_STORAGE } = require("./constants");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  console.log(
    'Congratulations, your extension "icreon.accelerator.audit-report" is now active!'
  );

  vscode.commands.registerCommand(
    "icreon-accelerator-utility.openSettings",
    () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "icreon-accelerator-utility"
      );
    }
  );

  // vscode.workspace.onDidChangeConfiguration((event) => {
  //   if (event.affectsConfiguration("icreon-accelerator-utility.apiURL")) {
  //     // Update your extension's behavior based on the new setting value
  //   }
  // });

  //dashboard
  const dashboardCmd = vscode.commands.registerCommand(
    COMMANDS.DASHBOARD,
    (uri) => {
      initializeDashboard(context, uri);
    }
  );
  context.subscriptions.push(dashboardCmd);

  // Auditing
  const npmAuditCmd = registerCommand(
    COMMANDS.NPM_AUDIT,
    (parentContext, parentUri) =>
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

  // AI Search Page
  const configCmd = vscode.commands.registerCommand(
    COMMANDS.CONFIGURATION,
    async (uri) => {
      initializeConfig(context, uri);
    }
  );
  context.subscriptions.push(configCmd);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
