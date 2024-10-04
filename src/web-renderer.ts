// @ts-nocheck
const { writeFile } = require("fs");
import path from "path";
import vscode from "vscode";
const { posix } = require("path");
const { window, ViewColumn, workspace, Uri } = require("vscode");

const printScript = `function openTab(evt, tabName) {
  let i, tabcontent, tablinks;
  let activeTab = null;

  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
    tabcontent[i].classList.remove("active");

    if (tabcontent[i].id === tabName) {
      activeTab = tabcontent[i];
    }
  }

  tablinks = document.getElementsByClassName("tab-button");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove("active");
  }

  evt.currentTarget.classList.add("active");

  const activeTabBtn = document.getElementById(tabName + "_accordian_item");
  if (activeTabBtn) {
    activeTabBtn.classList.add("active");
  }

  if (activeTab) {
    activeTab.style.display = "block";
    activeTab.classList.add("active");
  }

  let infoBoxes = document.getElementsByClassName("info-box");
  for (i = 0; i < infoBoxes.length; i++) {
    infoBoxes[i].classList.remove("selected");
  }

  const activeInfoBox = document.getElementById(tabName + "_info_box");
  if (activeInfoBox) {
    activeInfoBox.classList.add("selected");
  }
}

function openAccordian(id, event) {
  var header = document.getElementById(id + "_accordian_btn");

  if (!header) {
    return;
  }

  var content = document.getElementById(id + "_accordian_content");
  var icon = header.querySelector(".icon");
  var isOpen =
    content.style.display === "block" || content.style.display === "flex";

  // Close all accordion contents
  document.querySelectorAll(".accordion-content").forEach(function (item) {
    item.style.display = "none";
  });

  // Reset all icons
  document.querySelectorAll(".icon").forEach(function (icon) {
    icon.classList.remove("rotate");
    icon.textContent = "+";
  });

  // Toggle the clicked accordion item
  if (!isOpen) {
    content.style.display = "block";
    icon.classList.add("rotate");
    icon.textContent = "−";
  }
}

const showElement = (id, flag, blockProperty) => {
  const elm = document.getElementById(id);
  if (elm) {
    if (flag === true) {
      elm.style.display = blockProperty || "block";
    }
    if (flag === false) {
      elm.style.display = "none";
    }
  }
};

function toggleCopyRight(flag) {
  showElement("copyrightContent", flag, "flex");
}
`;

import {
  COMMANDS,
  MSGS,
  REPORT_FILE_NAME,
  REPORT_FOLDER_NAME,
  REPORT_TITLE,
  SECTIONS_IDS,
  SOURCE_TYPE
} from "./constants";

import {
  NODE_API,
  getExtensionFileSrc,
  getExtensionVersion,
  getFileData,
  installExtension,
  logErrorMsg,
  logMsg,
  runOtherExtensionCommand,
  saveVulDataInExtensionState
} from "./util";

import { runESLint } from "./audit-generator-utilities/eslint-utilities";

import {
  getCodeScores,
  getDuplicateCodes
} from "./audit-generator-utilities/code-quality-utilities";

import { runNPMAudit } from "./audit-generator-utilities/npm-audit-utilities";

import { getOutdatedPackages } from "./audit-generator-utilities/outdated-packages-utilities";

import { findLicensedFiles } from "./audit-generator-utilities/licensed-utilities";

import { renderInstalledPackages } from "./audit-generator-utilities/package-dependencies-utilities";

import { initializeNPMSearch } from "./audit-generator";

import {
  addNewTopic,
  addStepToTopic,
  closeAddUpdateTopic,
  editTopic,
  saveNewTopic,
  showTopicInfo,
  startTopicSteps
} from "./knowledge-center";

import {
  installNPMPackage,
  removeFromRecent,
  scanPackageForVulnerability,
  showNPMPackageInfo,
  startNPMSearch
} from "./npm-search";

import { renderPrettierStatus, renderSuggestedExtensions } from "./dashboard";

import { getUnusedCodes } from "./audit-generator-utilities/unused-code-utilities";

import {
  aiRunTestForSingleFile,
  aiStartWritingUnitTests,
  aiWriteTestsToFile,
  terminateUnitTestRun
} from "./ai-dashboard";
import { IAAnalyticsType } from "./analytics";
import { IRecord, IWebRenderer } from "./common.types";
import { saveConfigurations } from "./config-page";
import { getCopyrightContent } from "./copy-right";
import { icreonIcon } from "./icons";
import { populateAIModelDropdown, searchInGPT } from "./open-ai-util";
import { saveAutoCompleteSnippet } from "./snippet-utilities";

let webviews = new Map();

export class WebRenderer {
  initialized = false;
  template = null;
  extensionVersion = "";
  title = "";
  panel = null;
  panelId = null;
  context = {};
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
  analytics: IAAnalyticsType = {};

  constructor(template: string, title: string) {
    this.title = title;
    this.template = template;
  }

  get applicationName() {
    if (this.appMeta) {
      return this.appMeta.appName;
    }
    return null;
  }

  performKnowledgeAction = (command: string, topicId: any, data: any) => {
    switch (command) {
      case "showTopicDetails":
        showTopicInfo(this, topicId);
        this.sendAnalytics(
          "COMMAND",
          "SOLUTIONS_HUB",
          `Viewed Topic Details`,
          `Topic ID: ${topicId}`
        );
        break;

      case "executeTopicSteps":
        startTopicSteps(this, topicId);
        this.sendAnalytics(
          "COMMAND",
          "SOLUTIONS_HUB",
          `Integrated Solution`,
          `Topic ID: ${topicId}`
        );
        break;

      case "addTopic":
        addNewTopic(this);
        break;

      case "editTopic":
        editTopic(this, topicId);
        break;

      case "closeAddTopic":
        closeAddUpdateTopic(this);
        break;

      case "saveNewTopic":
        saveNewTopic(this, data);
        break;

      case "addStepToTopic":
        addStepToTopic(this);
        break;
    }
  };

  performNPMSearchAction = (command: string, data: any) => {
    switch (command) {
      case "searchNPMPackages":
        startNPMSearch(this, data);
        this.sendAnalytics(
          "COMMAND",
          "NPM SEARCH",
          `Searched Dependency`,
          `Keyword: ${data}`
        );
        break;

      case "showNPMPackageInfo":
        showNPMPackageInfo(this, data);
        this.sendAnalytics(
          "COMMAND",
          "NPM SEARCH",
          `Viewed Dependency Details`,
          `Dependency Name: ${data}`
        );
        break;

      case "removeFromRecent":
        removeFromRecent(this, data);
        break;

      // case "scanVulnerability":
      //   scanPackageForVulnerability(this, data.packageName, data.version);
      //   break;

      case "scanVulnerabilityForSingle":
        scanPackageForVulnerability(this, data.packageName, data.version, true);
        this.sendAnalytics(
          "COMMAND",
          "NPM SEARCH",
          `Scanned Dependency For Vulnerability`,
          `Dependency Name: ${data.packageName}@${data.version}`
        );
        break;

      case "installPackage":
        installNPMPackage(this, data.packageName, data.version, data.type);
        this.sendAnalytics(
          "COMMAND",
          "NPM SEARCH",
          `Installed Searched Dependency`,
          `Dependency Name: ${data.packageName}@${data.version}`
        );
        break;
    }
  };

  renderOtherFeaturePage = (pageID: string, sourceType: string) => {
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
        runOtherExtensionCommand(COMMANDS.CONFIGURATION, this.uri, sourceType);
        break;
    }
  };

  startChecklistAuditing = (auditCheckList: Array<IRecord>) => {
    this.projectStat = {};
    auditCheckList
      .filter((itm) => itm.selected)
      .map((itm) => {
        switch (itm.id) {
          case SECTIONS_IDS.VULNERABILITIES:
            runNPMAudit(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Vulnerabilities", "");
            break;

          case SECTIONS_IDS.DEPENDENCIES:
            renderInstalledPackages(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Dependencies", "");
            break;

          case SECTIONS_IDS.ESLINT:
            runESLint(this);
            this.sendAnalytics("COMMAND", "AUDITING", "ESLint Issues", "");
            break;

          case SECTIONS_IDS.OUTDATED_PACKAGES:
            getOutdatedPackages(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Outdated Packages", "");
            break;

          case SECTIONS_IDS.CODE_SCORE:
            getCodeScores(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Code Scores", "");
            break;

          case SECTIONS_IDS.DUPLICATE_CODES:
            getDuplicateCodes(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Duplicate Codes", "");
            break;

          case SECTIONS_IDS.LICENSED:
            findLicensedFiles(this);
            break;

          case SECTIONS_IDS.UNUSED_CODES:
            getUnusedCodes(this);
            this.sendAnalytics("COMMAND", "AUDITING", "Unused Code", "");
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
            this.sendAnalytics(
              "COMMAND",
              "UPDATE_PACKAGE",
              "Updated Sigle Package",
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

            this.sendAnalytics(
              "COMMAND",
              "UPDATES_ALL_PACKAGE",
              `Updated All Packages to ${updateType} version`,
              `npm install ${updateStr} --legacy-peer-deps`
            );

            return;

          case "autoFixVulnerabilities":
            const terminalVul = vscode.window.createTerminal(`Update Package`);
            terminalVul.sendText(`cd ${message.rootFolder}`);
            terminalVul.show();
            terminalVul.sendText(`npm audit fix --force`);

            this.sendAnalytics(
              "COMMAND",
              "VULNERABILITIES",
              `Auto fixed vulnerabilities`,
              `npm audit fix --force`
            );
            return;

          case "startAuditing":
            this.startChecklistAuditing(message.auditChecklist);
            return;

          case "knowledgeCenterCommand":
            this.performKnowledgeAction(
              message.subCommand,
              message.topicId,
              message.data
            );
            return;

          case "npmSearchCommand":
            this.performNPMSearchAction(message.subCommand, message.data);
            return;

          case "renderPage":
            this.renderOtherFeaturePage(message.pageID, message.sourceType);
            return;

          case "openNPMViewer":
            initializeNPMSearch(this.context, uri, message.pkgName);
            return;

          case "submitVulnerabilityData":
            saveVulDataInExtensionState(message.data, this.context);
            return;

          case "submitDashboardStat":
            NODE_API.sendProjectStat(this);

            const apiURL = await NODE_API.geProjectStatURL(webRenderer);
            this.sendAnalytics(
              "COMMAND",
              "SUBMITTED PROJECT STATS",
              `Submitted Project Statistics To External Source`,
              `API: ${apiURL}`
            );
            break;

          case "runPackageScript":
            const terminalScript = vscode.window.createTerminal(
              `Run Command - ${message.data.script}`
            );
            terminalScript.sendText(`cd ${this.parentPath}`);
            terminalScript.show();
            terminalScript.sendText(`npm run ${message.data.script}`);

            this.sendAnalytics(
              "COMMAND",
              "RUN PACKAGE SCRIPT",
              `Ran Script From Project Information Page`,
              ``
            );
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

            this.sendAnalytics(
              "COMMAND",
              "SUGGESTED EXTENSIONS",
              `Istalled Extension from Project Information Page`,
              `Extension: ${extensionName} (${extensionID})`
            );

            break;

          case "saveConfigurations":
            saveConfigurations(this, message.data);

            this.sendAnalytics(
              "COMMAND",
              "UPDATED CONFIGURATIONS",
              `Updated Configurations`,
              ``
            );
            break;

          case "aiWriteUnitTestForAllFiles":
            aiStartWritingUnitTests(this, message.data);
            this.sendAnalytics(
              "COMMAND",
              "WRITE UNIT TEST",
              `Generated Unit Test Cases For Selected Folder`,
              ``
            );
            break;

          case "terminateUnitTestRun":
            terminateUnitTestRun(this);
            break;

          case "aiWriteTestFile":
            aiWriteTestsToFile(this, message.action);
            break;

          case "populateAIModelDropdown":
            populateAIModelDropdown(this, message.provider);
            break;

          case "aiRunTestForSingleFile":
            aiRunTestForSingleFile(this, message.index);
            this.sendAnalytics(
              "COMMAND",
              "WRITE UNIT TEST",
              `Generated Unit Test Cases For Single File`,
              ``
            );
            break;

          case "searchInGPT":
            searchInGPT(this, message.data);
            this.sendAnalytics(
              "COMMAND",
              "AI SEARCH",
              `Search Using AI Search Page`,
              `Data: ${JSON.stringify(message.data)}`
            );
            break;

          case "showEventLog":
            showEventLog(this);
            break;

          case "saveSnippet":
            saveAutoCompleteSnippet(this, message.data);
            this.sendAnalytics(
              "COMMAND",
              "ADD SNIPPET",
              `Added AutoComplete Snippet`
            );
            break;

          case "closeWebview":
            this.panel.dispose();
            return;
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

  sendAnalytics = (
    category: string,
    action: string,
    label: string,
    value: string
  ) => {
    this.analytics.sendEvent(category, action, label, value);
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
            <span class='app-version'>(v${this.appMeta.version})</span>
          </h1>

          ${
            this.appMeta.description
              ? `<div class="app-desc i">${this.appMeta.description}</div>`
              : ""
          }
        </div>

        <div class='header-right-section'>
          <div class='icreon-icon'>${icreonIcon("#212529")}</div>
          <h3 class="header grey-header">
            <span class='white-space-no-wrap'>${reportTitle}</span>
            <span class='email-link header-link-actions'>
                <span class='color-grey' id='downloadButton'>
                  <span>&nbsp;|&nbsp;&nbsp;<a class='no-link' href='javascript:void(0)' id='downloadLink' onclick="downloadReport('html')">Download</a>
                </span>
            </span>
          </h3>
        </div>
    </div>`;
  };

  renderAppFooterContent = async () => {
    const extVersion: string = await getExtensionVersion(this.context);
    return `
      <div id='app_common_info' class='info-pages' style='display:none'></div>
      <div id='analytics_event_log' class='info-pages' style='display:none'></div>

      <div id='copyrightContent' class='copyright-body' style='display:none'>
        ${getCopyrightContent()}
      </div>

      <div class='flex-group float-left'>
        <div>
          ©${new Date().getFullYear()} Icreon.
        </div>

        <button class='footer-link' onclick='toggleCopyRight(true)'>Copyright Notice</button> 
        <button class='footer-link' onclick='showEventLog(true)'>Analytics Log</button> 
      </div>

      <div>
        <div class='text-sm'>Icreon Accelerator: Utilities (v${extVersion})</div>
        <div id="nodeVerionsLabel" style='display:none' class='hide-on-browser' ></div>
      <div>
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
    return getExtensionFileSrc(
      this.extensionPath,
      this.panel,
      "out/css/style.css"
    );
  };

  renderContent = async (content, reportTitle, sourceType) => {
    const scriptSrc = this.getScriptSrc();
    const styleSrc = this.getStyleSrc();
    const favIcon = getExtensionFileSrc(
      this.extensionPath,
      this.panel,
      "images/icreon-fav.png"
    );

    const mediaPath = vscode.Uri.file(
      this.context.asAbsolutePath("images/icreon-fav.png")
    ).with({ scheme: "vscode-resource" });

    let htmlStr = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <link rel="icon" href="${mediaPath}">
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
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('knowledge_center')">Solutions Hub</a>
                    </li>

                    <li class='menu-li-item src-project' id='li_ai_search'>
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('ai_search')">AI Search</a>
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
                      <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('config','${sourceType}')">Configuration</a>
                    </li>
                  </ul>
                </div>

                <div class='user-info' id='user_info_section' style='display:none'>
                    <div id='left_section_user_info'></div>
                </div>
              </div>
            
              <div class='right-section'>
                ${content}
              </div>
            </div>
        </div>
     
        <div class='app-footer'>
            ${await this.renderAppFooterContent()}
        </div>
    </div>

   </body>
 </html>`;

    this.content = htmlStr;
    renderContentOnPanel(this.panel, htmlStr);
    renderUserInfo(this);
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

export const createPanel = (title, extensionPath) => {
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

export const renderContentOnPanel = (panel, content) => {
  panel.webview.html = content;
};

export const renderLoader = async (_this, panel, title) => {
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

export const renderError = async (_this, panel, meta) => {
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

  const cssFilePath = path.join(
    webRenderedRef.extensionPath,
    `/out/css/style.css`
  );
  const styleContent = await getFileData(cssFilePath);

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

    content += `<style>${styleContent}</style>`;
    content += `<script>${printScript}</script>`;

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

export const createFolder = async (folderName) => {
  const workSpaceUri = workspace.workspaceFolders[0].uri;
  const folderUri = Uri.parse(`${workSpaceUri.path}/${folderName}`);
  await workspace.fs.createDirectory(folderUri);
};

export const renderUserInfo = (webrenderer: IWebRenderer) => {
  const { userName, hostname } = webrenderer.userInfo || {};

  let htmlStr = ``;

  if (userName) {
    htmlStr += `<div class='label-value'>
      <div class='lv-label'>User Name</div>
      <div class='lv-value'>${userName}</div>
    </div>`;
  }

  if (hostname) {
    htmlStr += `<div class='label-value'>
      <div class='lv-label'>Host Name</div>
      <div class='lv-value'>${hostname}</div>
    </div>`;
  }

  webrenderer.sendMessageToUI("leftSectionUserInfo", {
    htmlContent: htmlStr
  });
};

export const showEventLog = (webRenderer: IWebRenderer) => {
  webRenderer.analytics?.showEventLog(webRenderer);
};
