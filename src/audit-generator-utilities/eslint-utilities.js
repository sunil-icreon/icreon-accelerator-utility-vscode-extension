const vscode = require("vscode");
const {
  logMsg,
  formatNumber,
  getScanningHTMLSmall,
  PILLS,
  runNPMCommand,
  logInFile,
  NODE_API
} = require("../util");
const { IGNORE_PATHS, PROJECT_STAT } = require("../constants");

const renderLintCount = (webRenderer, total, progressHTML, lintIssues) => {
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

    (itm.messages || []).map((msg) => {
      const flName = itm.fileName.replace(/\\/g, "\\\\");
      vulStr += `<tr>
                <td class='td-lint-1'>
                  <a href='javascript:void(0)' 
                    target='_blank' 
                    class='remove-link-on-browser' 
                    onclick="openFile('${flName}', ${msg.line - 1}, ${
        msg.column
      })">
                      ${msg.line}:${msg.column}
                  </a>
                </td>

                <td class='td-lint-2 ${
                  msg.severity === 1 ? "text-moderate" : "text-high"
                }'>${msg.severity === 1 ? "warning" : "error"}</td>
                <td class='td-lint-3'>${msg.message}</td>
                <td class='td-lint-4'>${msg.ruleId}</td>
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

  NODE_API.sendProjectStat(webRenderer);

  webRenderer.sendMessageToUI("esLintContent", {
    htmlContent: vulStr,
    Count: totalIssues,
    helpText: progressHTML,
    showSummary: lintIssues.length > 0,
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

const renderESLintResult = (webRenderer, searchPattern, ignorePattern) => {
  let total = {
    errors: 0,
    fatalErrorCount: 0,
    fixableErrorCount: 0,
    warnings: 0,
    fixableWarningCount: 0
  };

  let lintIssues = [];
  try {
    const eslIntCommand = `npx eslint ${searchPattern} -f json `;
    runNPMCommand(webRenderer, eslIntCommand, (success, resp) => {
      if (success && !resp.stderr) {
        const results = JSON.parse(resp.stdout || "[]");
        if (results && results.length > 0) {
          results.map((result) => {
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

const runESLint = async (webRenderer) => {
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

      let ignorePattern = `**/{${IGNORE_PATHS.FOLDER.join(
        ","
      )},${IGNORE_PATHS.FILES.join(",")}}/**`;

      vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
        renderESLintResult(webRenderer, searchPattern, ignorePattern);
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

module.exports = {
  runESLint
};