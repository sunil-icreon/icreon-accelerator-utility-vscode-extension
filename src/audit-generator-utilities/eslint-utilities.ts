import vscode from "vscode";
import { IRecord, IWebRenderer } from "../common.types";
import {
  PILLS,
  formatNumber,
  getIgnoreFileFolder,
  getScanningHTMLSmall,
  logMsg,
  runNPMCommand
} from "../util";

const { PROJECT_STAT } = require("../constants");

const renderLintCount = (
  webRenderer: IWebRenderer,
  total: IRecord,
  progressHTML?: string,
  lintIssues?: Array<IRecord>
) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  const totalIssues = formatNumber(
    total.errors + total.warnings + total.fixableWarningCount
  );

  let vulStr = `<div>`;

  vulStr += `<div>
    <table class='table table-striped table-bordered table-sm'>
  `;

  (lintIssues || []).forEach((itm) => {
    vulStr += `
    <tr>
        <td>
          <div><b>${itm.filePath.replace(`${workspaceFolder}\\`, "")}</b></div>
          <table class='table table-striped table-bordered table-sm table-no-border pl-2 mt-1 mb-1'>`;

    (itm.messages || []).map((msg: IRecord) => {
      const flName = itm.fileName.replace(/\\/g, "\\\\");
      vulStr += `<tr>
                <td style='width:100px'>
                  <a href='javascript:void(0)' 
                    target='_blank' 
                    class='remove-link-on-browser' 
                    onclick="openFile('${flName}', ${msg.line - 1}, ${
        msg.column
      })">
                      ${msg.line}:${msg.column}
                  </a>
                </td>

                <td style='width:150px' ${
                  msg.severity === 1 ? "text-moderate" : "text-high"
                }'>${msg.severity === 1 ? "warning" : "error"}</td>
                <td>${msg.message}</td>
                <td style='width: 20%'>${msg.ruleId}</td>
              </tr>
                `;
    });

    vulStr += `
            </table>
        </td>
    </tr>
    `;
  });

  vulStr += `
    </table>
  </div>`;

  webRenderer.projectStat[PROJECT_STAT.ESLINT] = {
    t: total.errors + total.warnings + total.fixableWarningCount,
    errors: total.errors,
    warnings: total.warnings + total.fixableWarningCount,
    ts: new Date().toUTCString()
  };

  // NODE_API.sendProjectStat(webRenderer);

  webRenderer.sendMessageToUI("esLintContent", {
    htmlContent: vulStr,
    Count: totalIssues,
    helpText: progressHTML,
    showSummary: (lintIssues || []).length > 0,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.HIGH(total.errors, "E", false, "Errors")}
      ${PILLS.SEVERITY.MODERATE(
        total.warnings + total.fixableWarningCount,
        "W",
        false,
        "Warnings"
      )}
    </div>
    `,
    summaryTableData: `
    <h3 class='grey-header'>Issues: ${formatNumber(totalIssues)}</h3> 
    <div class='flex-1'>
      <div class="content">
        <table class='table table-striped table-bordered table-sm simple-table'> 
            <tr>
              <th class='text-right text-high'>Errors</th>
              <th class='text-right text-high'>Fatal Errors</th>
              <th class='text-right text-moderate'>Warnings</th>
              <th class='text-right'>Total</th>
            </tr>
            <tr>
              <td class='text-right text-high'>${formatNumber(
                total.errors
              )}</td>
              <td class='text-right text-high'>${formatNumber(
                total.fatalErrorCount
              )}</td>
              <td class='text-right text-moderate'>${formatNumber(
                total.warnings + total.fixableWarningCount
              )}</td>
              <td class='text-right'><b>${formatNumber(totalIssues)}</b></td>
            </tr>
        </table>
      </div>
    </div>`
  });
};

const renderESLintResult = (
  webRenderer: IWebRenderer,
  searchPattern: string
) => {
  let total = {
    errors: 0,
    fatalErrorCount: 0,
    fixableErrorCount: 0,
    warnings: 0,
    fixableWarningCount: 0
  };

  let lintIssues: Array<IRecord> = [];

  try {
    const eslIntCommand = `npx eslint ${searchPattern} -f json `;
    runNPMCommand(webRenderer, eslIntCommand, (success, resp) => {
      if (success && !resp.stderr) {
        const results = JSON.parse(resp.stdout || "[]");
        if (results && results.length > 0) {
          results.map((result: IRecord) => {
            if ((result.messages || []).length > 0) {
              lintIssues = [
                ...lintIssues,
                { ...result, fileName: result.filePath }
              ];
              total.errors += Number(result.errorCount);
              total.warnings += Number(result.warningCount);
              total.fatalErrorCount += Number(result.fatalErrorCount);
              total.fixableErrorCount += Number(result.fixableErrorCount);
              total.fixableWarningCount += Number(result.fixableWarningCount);
            }
          });
          renderLintCount(webRenderer, total, "", lintIssues);
        }

        return;
      }

      webRenderer.sendMessageToUI("esLintContent", {
        htmlContent: "",
        Count: "",
        showSummary: false,
        hideSection: true
      });
    });
  } catch (e) {
    webRenderer.sendMessageToUI("esLintContent", {
      htmlContent: "",
      Count: "",
      showSummary: false,
      hideSection: true
    });
  }
};

export const runESLint = async (webRenderer: IWebRenderer) => {
  if (vscode.workspace.workspaceFolders) {
    try {
      webRenderer.sendMessageToUI("esLintContent", {
        htmlContent: "",
        Count: getScanningHTMLSmall(),
        showSummary: false,
        helpText: ""
      });

      const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

      let searchPattern = `**/${rootFolder}/**/*.{ts,tsx,js,jsx}`;
      if (vscode.workspace.workspaceFolders[0].name === rootFolder) {
        searchPattern = `**/**/*.{ts,tsx,js,jsx}`;
      }

      const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
        webRenderer.context
      );

      let ignorePattern = `**/{${ignoredFolders.join(",")},${ignoredFiles.join(
        ","
      )}}/**`;

      vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
        renderESLintResult(webRenderer, searchPattern);
      });
    } catch (ee) {
      webRenderer.sendMessageToUI("esLintContent", {
        htmlContent: "",
        Count: "",
        showSummary: false,
        hideSection: true
      });

      logMsg(`Failed running lint command : ${JSON.stringify(ee)}`);
    }
  }
};
