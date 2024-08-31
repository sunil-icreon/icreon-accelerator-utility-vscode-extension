const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const {
  PILLS,
  logMsg,
  getScanningHTMLSmall,
  containsLicense,
  getFileExtension,
  getIgnoreFileFolder
} = require("../util");

const { PROJECT_STAT } = require("../constants");

const renderLicensedFiles = (
  webRenderer,
  progressHTML,
  licensedFiles,
  externalFiles
) => {
  if (licensedFiles.length === 0 && externalFiles.length === 0) {
    webRenderer.sendMessageToUI("licensedContent", {
      htmlContent: `<div class="content-box box box-success-alt">
            <div class="field-label">Great</div>
            <div class="field-value">There are no external licensed files.</div>
          </div>`,
      Count: 0,
      showSummary: false,
      summaryHeader: ``,
      summaryTableData: ``
    });
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  let htmlStr = `<div><h3 class='grey-header'>Licensed Files: ${licensedFiles.length}</h3>`;

  htmlStr += `<div>
    
    <table class='table table-striped table-bordered table-sm simple-table'>
      <tr>
        <th>#</th>
        <th class='text-align-left'>External File References</th>
        <th>Licensed</th>
      </tr>
  `;

  (externalFiles || [].join(licensedFiles || [])).forEach((flName, index) => {
    htmlStr += `
    <tr>
        <td class='text-center'>${index + 1}</td>
        <td>
          <a href='javascript:void(0)' 
            target='_blank' 
            class='remove-link-on-browser' 
            onclick="openFile('${flName.replace(/\\/g, "\\\\")}')">
              ${flName.replace(`${workspaceFolder}\\`, "")}
            </a>
        </td>
        <td class='text-center'>${
          licensedFiles.includes(flName)
            ? `<span class='text-high b'>Yes</span>`
            : `<span class='text-green'>No</span>`
        }</td>
      </tr>`;
  });

  htmlStr += `
    </table>
  </div>`;

  webRenderer.sendMessageToUI("licensedContent", {
    htmlContent: htmlStr,
    Count: licensedFiles.length,
    subInfo: `${externalFiles.length} External File(s)`,
    helpText: progressHTML,
    showSummary: externalFiles.length > 0,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.MODERATE(
        licensedFiles.length,
        "Licensed Files",
        false,
        "Licensed Files"
      )}
    </div>
    `,
    summaryTableData: ``
  });
};

const ignoreFontFilesOpening = ["font", "woff", "woff2", "ttf", "otf"];
const renderLicensedtResult = (webRenderer, files) => {
  let ctr = 0;
  let licensedFiles = [];
  let externalFiles = [];
  try {
    for (const file of files) {
      try {
        ctr++;
        vscode.workspace.openTextDocument(file).then(async (document) => {
          const fileExtension = getFileExtension(document.fileName);
          const isExcludedFile = ignoreFontFilesOpening.includes(fileExtension);
          const text = isExcludedFile ? "" : document.getText();

          if (text && containsLicense(text)) {
            if (licensedFiles.indexOf(document.fileName) === -1) {
              licensedFiles = [...licensedFiles, document.fileName];
            }
          }

          const matches = text.match(
            /<link[^>]+href="([^"]+\.css)"|import\s+['"]([^'"]+\.scss)['"]/g
          );
          if (matches) {
            matches.forEach((match) => {
              const urlMatch = match.match(
                /href="([^"]+\.css)"|import\s+['"]([^'"]+\.scss)['"]/
              );
              if (urlMatch) {
                const url = urlMatch[1] || urlMatch[2];
                if (url && !url.startsWith("http")) {
                  const absolutePath = path.resolve(
                    webRenderer.parentPath,
                    url
                  );
                  if (fs.existsSync(absolutePath)) {
                    if (
                      !isExcludedFile &&
                      containsLicense(fs.readFileSync(absolutePath))
                    ) {
                      if (licensedFiles.indexOf(absolutePath) === -1) {
                        licensedFiles = [...licensedFiles, absolutePath];
                      }
                    }

                    if (externalFiles.indexOf(absolutePath) === -1) {
                      externalFiles.push(absolutePath);
                    }
                  }
                }
              }
            });
          }

          renderLicensedFiles(
            webRenderer,
            ctr < files.length - 1
              ? `Scanning ${ctr} of ${files.length}...`
              : "",
            licensedFiles,
            externalFiles
          );
        });
      } catch (ee) {}
    }

    webRenderer.projectStat[PROJECT_STAT.LICENSED] = {
      licensed: licensedFiles.length,
      extFiles: externalFiles.length,
      ts: new Date().toUTCString()
    };

    // NODE_API.sendProjectStat(webRenderer);
  } catch (e) {
    webRenderer.sendMessageToUI("licensedContent", {
      htmlContent: "",
      Count: "",
      showSummary: false,
      hideSection: true
    });
  }
};

const findLicensedFiles = async (webRenderer) => {
  if (vscode.workspace.workspaceFolders) {
    try {
      webRenderer.sendMessageToUI("licensedContent", {
        htmlContent: "",
        Count: getScanningHTMLSmall(),
        showSummary: false,
        helpText: ""
      });

      const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

      const filesExtension = `ts,tsx,js,jsx,css,scss,font,woff,woff2,ttf,otf`;
      let searchPattern = `**/${rootFolder}/**/*.{${filesExtension}}`;
      if (vscode.workspace.workspaceFolders[0].name === rootFolder) {
        searchPattern = `**/**/*.{${filesExtension}}`;
      }

      const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
        webRenderer.context
      );

      let ignorePattern = `**/{${ignoredFolders.join(",")},${ignoredFiles.join(
        ","
      )}}/**`;

      vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
        renderLicensedtResult(webRenderer, files);
      });
    } catch (ee) {
      webRenderer.sendMessageToUI("licensedContent", {
        htmlContent: "",
        Count: "",
        showSummary: false,
        hideSection: true
      });

      logMsg(`Failed finding licensed files : ${JSON.stringify(ee)}`);
    }
  }
};

module.exports = {
  findLicensedFiles
};
