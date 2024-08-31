const { writeFile } = require("fs");
const path = require("path");
const vscode = require("vscode");
const { posix } = require("path");
const { window, ViewColumn, workspace, Uri } = require("vscode");

const {
  REPORT_FILE_NAME,
  REPORT_FOLDER_NAME,
  REPORT_TITLE,
  MSGS,
  SECTIONS_IDS,
  COMMANDS,
  SOURCE_TYPE
} = require("./constants");

const {
  NODE_API,
  logMsg,
  logErrorMsg,
  saveVulDataInExtensionState,
  runOtherExtensionCommand,
  installExtension,
  getExtensionFileSrc,
  icreonIcon
} = require("./util");

const { runESLint } = require("./audit-generator-utilities/eslint-utilities");

const {
  getCodeScores,
  getDuplicateCodes
} = require("./audit-generator-utilities/code-quality-utilities");

const {
  runNPMAudit
} = require("./audit-generator-utilities/npm-audit-utilities");

const {
  getOutdatedPackages
} = require("./audit-generator-utilities/outdated-packages-utilities");

const {
  findLicensedFiles
} = require("./audit-generator-utilities/licensed-utilities");

const {
  renderInstalledPackages
} = require("./audit-generator-utilities/package-dependencies-utilities");

const { initializeNPMSearch } = require("./audit-generator");

const { showTopicInfo, startTopicSteps } = require("./knowledge-center");

const {
  startNPMSearch,
  showNPMPackageInfo,
  removeFromRecent,
  scanPackageForVulnerability,
  installNPMPackage
} = require("./npm-search");

const {
  renderPrettierStatus,
  renderSuggestedExtensions
} = require("./dashboard");

const {
  getUnusedCodes
} = require("./audit-generator-utilities/unused-code-utilities");

const {
  aiStartWritingUnitTests,
  aiWriteTestsToFile,
  aiRunTestForSingleFile,
  terminateUnitTestRun,
  aiSaveOpenAPIKey
} = require("./ai-dashboard");
const { searchInGPT } = require("./open-ai-util");
const { saveConfigurations } = require("./config-page");

let webviews = new Map();

class WebRenderer {
  initialized = false;
  template = null;
  title = "";
  panel = null;
  panelId = null;
  context = null;
  content = null;
  appMeta = null;
  parentPath = "";

  reportData = null;
  outdatedPackages = [];
  npmAuditViewData = {};
  packagesWithVersion = {};
  pkgJSON = null;
  uri = {};
  packageLockFile = null;
  extensionPath = "";
  pckName = "";
  selectedFiles = [];

  projectStat = {};
  tempData = {};

  constructor(template, title) {
    this.title = title;
    this.template = template;
  }

  get applicationName() {
    if (this.appMeta) {
      return this.appMeta.appName;
    }
    return null;
  }

  performKnowledgeAction = (command, data) => {
    switch (command) {
      case "showTopicDetails":
        showTopicInfo(this, data);
        break;

      case "executeTopicSteps":
        startTopicSteps(this, data);
        break;
    }
  };

  performNPMSearchAction = (command, data) => {
    switch (command) {
      case "searchNPMPackages":
        startNPMSearch(this, data);
        break;

      case "showNPMPackageInfo":
        showNPMPackageInfo(this, data);
        break;

      case "removeFromRecent":
        removeFromRecent(this, data);
        break;

      case "scanVulnerability":
        scanPackageForVulnerability(this, data.packageName, data.version);
        break;

      case "scanVulnerabilityForSingle":
        scanPackageForVulnerability(this, data.packageName, data.version, true);
        break;

      case "installPackage":
        installNPMPackage(this, data.packageName, data.version, data.type);
        break;
    }
  };

  renderOtherFeaturePage = (pageID) => {
    switch (pageID) {
      case "dashboard":
        runOtherExtensionCommand(COMMANDS.DASHBOARD, this.uri);
        break;

      case "auditing":
        runOtherExtensionCommand(COMMANDS.NPM_AUDIT_SINGLE, this.uri);
        break;

      case "npm_search":
        runOtherExtensionCommand(COMMANDS.NPM_SEARCH, this.uri);
        break;

      case "knowledge_center":
        runOtherExtensionCommand(COMMANDS.KNOWLEDGE_CENTER, this.uri);
        break;

      case "ai_utilities":
        runOtherExtensionCommand(COMMANDS.AI_DASHBOARD, this.uri);
        break;

      case "ai_search":
        runOtherExtensionCommand(COMMANDS.AI_SEARCH, this.uri);
        break;

      case "config":
        runOtherExtensionCommand(COMMANDS.CONFIGURATION, this.uri);
        break;
    }
  };

  startChecklistAuditing = (auditCheckList) => {
    this.projectStat = {};
    auditCheckList
      .filter((itm) => itm.selected)
      .map((itm) => {
        switch (itm.id) {
          case SECTIONS_IDS.VULNERABILITIES:
            runNPMAudit(this);
            break;

          case SECTIONS_IDS.DEPENDENCIES:
            renderInstalledPackages(this);
            break;

          case SECTIONS_IDS.ESLINT:
            runESLint(this);
            break;

          case SECTIONS_IDS.OUTDATED_PACKAGES:
            getOutdatedPackages(this);
            break;

          case SECTIONS_IDS.CODE_SCORE:
            getCodeScores(this);
            break;

          case SECTIONS_IDS.DUPLICATE_CODES:
            getDuplicateCodes(this);
            break;

          case SECTIONS_IDS.LICENSED:
            findLicensedFiles(this);
            break;

          case SECTIONS_IDS.UNUSED_CODES:
            getUnusedCodes(this);
            break;
        }
      });
  };

  init = async (context) => {
    this.context = context;
    this.initializePanel(context);
    this.onClosePanel();
  };

  initializePanel = (context) => {
    if (!this.panel) {
      this.panel = createPanel(this.title, context.extensionPath);
      this.panelId = new Date().getMilliseconds();
      webviews.set(this.panelId, this.panel);
    }

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "downloadReportAsHTML":
            this.createReport("html", message.webContent);
            return;

          case "openFile":
            const uri = vscode.Uri.file(message.filePath);
            const editors = vscode.window.visibleTextEditors;

            vscode.workspace.openTextDocument(uri).then(async (doc) => {
              let targetEditor = editors.find(
                (editor) => editor.document.uri.fsPath === uri.fsPath
              );
              if (targetEditor) {
                await vscode.window.showTextDocument(
                  targetEditor.document,
                  targetEditor.viewColumn
                );
              } else {
                targetEditor = await vscode.window.showTextDocument(
                  doc,
                  ViewColumn.Beside,
                  true
                );
              }

              if (message.line) {
                const position = new vscode.Position(
                  message.line,
                  message.column
                );

                const range = new vscode.Range(position, position);
                targetEditor.selection = new vscode.Selection(
                  position,
                  position
                );
                targetEditor.revealRange(
                  range,
                  vscode.TextEditorRevealType.InCenter
                );
              }
            });
            return;

          case "updatePackage":
            const terminal = vscode.window.createTerminal(`Update Package`);
            terminal.sendText(`cd ${message.rootFolder}`);
            terminal.show();
            terminal.sendText(
              `npm install ${message.pkgName}@${message.pkgNumber} --legacy-peer-deps`
            );
            return;

          case "updateAllPackage":
            let updateStr = ``;
            const updateType = message.updateType;
            switch (updateType) {
              case "wanted":
                (this.outdatedPackages || []).map((pkg) => {
                  updateStr = `${updateStr} ${pkg.key}@${pkg.wanted} `;
                });

                break;
              case "latest":
                (this.outdatedPackages || []).map((pkg) => {
                  updateStr = `${updateStr} ${pkg.key}@${pkg.latest} `;
                });
                break;
            }

            const updateTerminal =
              vscode.window.createTerminal(`Update All Packages`);
            updateTerminal.sendText(`cd ${message.rootFolder}`);
            updateTerminal.show();
            updateTerminal.sendText(
              `npm install ${updateStr} --legacy-peer-deps`
            );

            return;

          case "autoFixVulnerabilities":
            const terminalVul = vscode.window.createTerminal(`Update Package`);
            terminalVul.sendText(`cd ${message.rootFolder}`);
            terminalVul.show();
            terminalVul.sendText(`npm audit fix --force`);
            return;

          case "startAuditing":
            this.startChecklistAuditing(message.auditChecklist);
            return;

          case "knowledgeCenterCommand":
            this.performKnowledgeAction(message.subCommand, message.topicId);
            return;

          case "npmSearchCommand":
            this.performNPMSearchAction(message.subCommand, message.data);
            return;

          case "renderPage":
            this.renderOtherFeaturePage(message.pageID);
            return;

          case "openNPMViewer":
            initializeNPMSearch(this.context, uri, message.pkgName);
            return;

          case "submitVulnerabilityData":
            saveVulDataInExtensionState(message.data, this.context);

            return;

          case "submitDashboardStat":
            NODE_API.sendProjectStat(this);
            break;

          case "runPackageScript":
            const terminalScript = vscode.window.createTerminal(
              `Run Command - ${message.data.script}`
            );
            terminalScript.sendText(`cd ${this.parentPath}`);
            terminalScript.show();
            terminalScript.sendText(`npm run ${message.data.script}`);
            break;

          case "installExtension":
            const { extensionID, extensionName, source } = message;
            installExtension(extensionID, extensionName, (success) => {
              if (success) {
                switch (source) {
                  case "project_info":
                    renderPrettierStatus(this, true);
                    break;

                  case "suggested_extensions":
                    if (extensionID === "esbenp.prettier-vscode") {
                      renderPrettierStatus(this, true);
                    }
                    renderSuggestedExtensions(this);
                    break;
                }
              }
            });
            break;

          case "saveOpenAPIKey":
            aiSaveOpenAPIKey(this, message.apiKey);
            break;

          case "saveConfigurations":
            saveConfigurations(this, message.data);
            break;

          case "aiWriteUnitTestForAllFiles":
            aiStartWritingUnitTests(this, message.data);
            break;

          case "terminateUnitTestRun":
            terminateUnitTestRun(this);
            break;

          case "aiWriteTestFile":
            aiWriteTestsToFile(this, message.action);
            break;

          case "aiRunTestForSingleFile":
            aiRunTestForSingleFile(this, message.index);
            break;

          case "searchInGPT":
            searchInGPT(this, message.data);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        webviews.delete(this.panelId);
      },
      null,
      context.subscriptions
    );
  };

  setNPMAuditData = (data) => {
    this.npmAuditViewData = data;
  };

  get npmAuditData() {
    if (this.npmAuditViewData) {
      return this.npmAuditViewData;
    }
    return {};
  }

  sendMessageToUI = (msg, data) => {
    this.panel.webview.postMessage({ command: msg, data });
  };

  createReport = (reportType, content) => {
    createReportFile(this, content, reportType);
  };

  onClosePanel = () => {
    this.panel.onDidDispose(() => {
      this.panel = null;
      this.panelId = null;
      this.initialized = false;
    }, null);
  };

  renderAppHeaderContent = async (reportTitle) => {
    return `
    <div class='app-header-section'>
        <div class='header-left-section'>
          <h1 class='app-name'>
            ${this.appMeta.appName} 
            <span class='app-version'>(v${this.appMeta.appVersion})</span>
          </h1>

          ${
            this.appMeta.appDescription
              ? `<div class="app-desc i">${this.appMeta.appDescription}</div>`
              : ""
          }
        </div>

        <div class='header-right-section'>
          <div class='icreon-icon'>${icreonIcon("#212529")}</div>
          <h3 class="header grey-header">${reportTitle}
            <span class='email-link header-link-actions'>
                <span class='color-grey' id='downloadButton'>
                  <span>&nbsp;|&nbsp;&nbsp;<a class='no-link' href='javascript:void(0)' id='downloadLink' onclick="downloadReport('html')">Download</a>
                </span>
            </span>
          </h3>
        </div>
    </div>`;
  };

  renderAppFooterContent = () => {
    return `
      <div id="nodeVerionsLabel" class='hide-on-browser' ></div>
    `;
  };

  getScriptSrc = () => {
    return getExtensionFileSrc(
      this.extensionPath,
      this.panel,
      "out/webrenderer-script.js"
    );
  };

  getStyleSrc = () => {
    return getExtensionFileSrc(this.extensionPath, this.panel, "out/style.css");
  };
  renderContent = async (content, reportTitle, sourceType) => {
    const scriptSrc = this.getScriptSrc();
    const styleSrc = this.getStyleSrc();

    let htmlStr = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>
          ${reportTitle || REPORT_TITLE}
          ${this.applicationName ? ` - ${this.applicationName}` : ""}
        </title>

        <link href="${styleSrc}" rel="stylesheet">
        <script src="${scriptSrc}"></script>
    </head>

    <body>
      <div class='app'>
        <div class='app-header'>
            ${await this.renderAppHeaderContent(reportTitle)}
        </div>

        <div class='app-body'>
          <div class='body-content'>
              <div class='left-section hide-on-browser'>
                <div class='menu-items'>
                  <ul>
                  ${
                    sourceType === SOURCE_TYPE.PROJECT
                      ? `<li class='menu-li-item src-project' id='li_auditing' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('auditing')">Auditing</a>
                    </li>

                    <li class='menu-li-item src-project' id='li_npm_search' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('npm_search')">NPM Search</a>
                    </li>

                    <li class='menu-li-item src-project' id='li_knowledge_center' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('knowledge_center')">Knowledge Center</a>
                    </li>

                    <li class='menu-li-item src-project' id='li_ai_search'>
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('ai_search')">ChatGPT Search</a>
                    </li>

                    <li class='menu-li-item src-project' id='li_project_info' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('dashboard')">Project Info</a>
                    </li>
                    `
                      : ""
                  }

                  ${
                    sourceType === SOURCE_TYPE.AI
                      ? `<li class='menu-li-item src-ai' id='li_ai_utilities' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('ai_utilities')">AI Utilities</a>
                    </li>`
                      : ""
                  }

                    <li class='menu-li-item' id='li_config' >
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('config')">Configuration</a>
                    </li>
                  </ul>
                </div>
              </div>
            
              <div class='right-section'>
                ${content}
              </div>
            </div>
        </div>
     
        <div class='app-footer'>
            ${this.renderAppFooterContent()}
        </div>
    </div>

   </body>
 </html>`;

    this.content = htmlStr;
    renderContentOnPanel(this.panel, htmlStr);
  };

  renderLoader = () => {
    renderLoader(this, this.panel, this.title);
  };

  renderError = (meta) => {
    renderError(this, this.panel, meta);
  };

  setAppMetaData = (appData) => {
    this.appMeta = appData;
  };

  setReportData = (data) => {
    this.reportData = data;
  };
}

const createPanel = (title, extensionPath) => {
  return window.createWebviewPanel(
    title.replace(" ", "").trim(),
    title,
    ViewColumn.One,
    {
      localResourceRoots: [
        vscode.Uri.file(path.join(extensionPath, "images")),
        vscode.Uri.file(path.join(extensionPath, "media")),
        vscode.Uri.file(path.join(extensionPath, "out"))
      ],
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
};

const renderContentOnPanel = (panel, content) => {
  panel.webview.html = content;
};

const renderLoader = async (_this, panel, title) => {
  const styleSrc = _this.getStyleSrc();
  const content = `<!DOCTYPE html>
  <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${REPORT_TITLE}${
    _this.applicationName ? ` - ${_this.applicationName}` : ""
  }</title>
        <link href="${styleSrc}" rel="stylesheet">
   </head>
  
    <body>
      <h1 class="header">${title}</h1>
      <div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px"></div>
      <div>Running ${title}...</div>
      <br />
    </body>
  </html>
`;

  renderContentOnPanel(panel, content);
};

const renderError = async (_this, panel, meta) => {
  const styleSrc = _this.getStyleSrc();
  const { actionHeader, hasSolution, message } = meta;

  const content = `<!DOCTYPE html>
  <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${REPORT_TITLE}${
    _this.applicationName ? ` - ${_this.applicationName}` : ""
  }</title>
        <style>
          body{ background: #ffa9a9; color:black; }
        </style>

        <link href="${styleSrc}" rel="stylesheet">
   </head>
  
    <body>
      <h1 class="header">${actionHeader} Failed</h1>
      <div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px;"> </div>
      <br/>
  
      <div class="text-danger b mb-2">${
        message || "Something went wrong, please try again after sometime."
      }</div>
  
      ${hasSolution ? `<div class="box box-info">${hasSolution}</div>` : ""}
    </body>
  </html>
`;

  _this.content = content;
  panel.webview.html = content;
};

const createReportFile = async (webRenderedRef, content, reportType) => {
  const folderUri = workspace.workspaceFolders[0].uri;

  const reportFileName = posix.join(
    folderUri.path,
    `${REPORT_FOLDER_NAME}/${REPORT_FILE_NAME}`
  );

  try {
    webRenderedRef.sendMessageToUI("downloadingStart");
    content += `<style>.header-link-actions { display: none;} body, table { font-size:12px!important;}
    .hide-on-browser { display:none}
    .remove-link-on-browser { text-decoration:none; color:black; pointer-events:none; cursor:none; }
    .text-with-icon { justify-content: center!important; }
    .show-on-browser{display: block!important;}
    .right-section{ margin-left: 15px;}
    .app-footer{ display:none;}
    </style>`;

    content += `<link href="out/style.css" rel="stylesheet"></link>`;
    content += `<script src='out/webrenderer-script.js'></script>`;
    let fileUri = folderUri.with({ path: `${reportFileName}.${reportType}` });
    let filters = null;
    let reportContent = content;
    let saveDialogTitle = `Save ${REPORT_TITLE}`;

    switch (reportType) {
      case "html":
        filters = { WebPages: ["html"] };
        break;
    }

    if (filters) {
      if (webRenderedRef.appMeta) {
        fileUri = folderUri.with({
          path: `${reportFileName}-${webRenderedRef.appMeta.appName}.${reportType}`
        });

        saveDialogTitle = `Save ${REPORT_TITLE} for ${
          webRenderedRef.appMeta.appName || "Application"
        }`;
      }

      const uri = await window.showSaveDialog({
        filters,
        defaultUri: fileUri,
        saveLabel: `Save Report`,
        title: saveDialogTitle
      });

      if (!uri) {
        webRenderedRef.sendMessageToUI("downloadingEnd");
      }

      writeFile(uri.fsPath, reportContent, () => {
        logMsg(MSGS.REPORT_CREATED, true);
        webRenderedRef.sendMessageToUI("downloadingEnd");
      });
    }
  } catch (e) {
    webRenderedRef.sendMessageToUI("downloadingEnd");
    if (reportType === "pdf") {
      logErrorMsg(MSGS.PDF_ERROR, true);
    }
  }
};

const createFolder = async (folderName) => {
  const workSpaceUri = workspace.workspaceFolders[0].uri;
  const folderUri = Uri.parse(`${workSpaceUri.path}/${folderName}`);
  await workspace.fs.createDirectory(folderUri);
};

module.exports = {
  createPanel,
  renderContentOnPanel,
  renderLoader,
  renderError,
  createFolder,
  WebRenderer
};
