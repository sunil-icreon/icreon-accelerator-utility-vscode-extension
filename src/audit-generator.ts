import { IContext, IRecord, IUri, IWebRenderer } from "./common.types";

import vscode from "vscode";

import {
  checkVersionUpdate,
  getApplicationMeta,
  GLOBAL_STATE_MANAGER,
  initWebRenderer
} from "./util";

import {
  LOCAL_STORAGE,
  PAGE_TITLE,
  REPORT_TEMPLATE,
  REPORT_TITLE,
  SECTIONS,
  SECTIONS_IDS,
  SOURCE_TYPE
} from "./constants";

import { renderAIDashboard } from "./ai-dashboard";
import { renderAISearchPage } from "./ai-search-page";
import { renderConfigPage } from "./config-page";
import { renderDashboard } from "./dashboard";
import { checkedIcon, unCheckedIcon } from "./icons";
import { renderKnowledgeCenter } from "./knowledge-center";
import { renderNPMSearch, showNPMPackageInfo } from "./npm-search";
import { renderSnippetAddPage } from "./snippet-utilities";
import { WebRenderer } from "./web-renderer";

let webRenderer: IWebRenderer = new WebRenderer(REPORT_TEMPLATE, REPORT_TITLE);

const renderNPMAuditSectionContent = (sections: Array<IRecord>) => {
  let selectionStr = `
  <h1 class='h1'>Select audit items from the checklist</h1>
  <div class='checklist-group'>
`;

  sections
    .filter((section) => !section.silent)
    .map((section) => {
      selectionStr += `
      <div class='checklist-item ${
        section.selected ? "selected" : ""
      }' data-sectionid="${section.id}" id='checklist_item_${
        section.id
      }' onclick="toggleChecklistItem('${section.id}')">
        <div class='content flex-justify-start flex-align-center'>
          <div class='selection-icon'>
            <div class='checked_icon'>
              <span id='${section.id}_check_icon'
                    style="display:${section.selected ? "block" : "none"}"  
                >
                ${checkedIcon}
              </span>

              <span id='${section.id}_uncheck_icon' 
                    style="display:${!section.selected ? "block" : "none"}">
                ${unCheckedIcon}
              </span>

            </div> 
          </div>
          <div class='info-section'>
            <div class='header'>${section.label}</div>
            <div class='info'>${section.info}</div>
          </div>
        </div>
      </div>
  `;
    });

  selectionStr += `</div>`;
  selectionStr += `
  <div class='checklist-select-button'>
    <button id='start_audit_button' 
            type="button" 
            onclick="startAuditing()">
            Start Auditing 
            <span id='checklist_count'>
              (${sections.filter((sec) => sec.selected).length})
            </span>
    </button>
  </div>`;

  return selectionStr;
};

const renderBriefInfo = async (sections: Array<IRecord>) => {
  const serverURL = await GLOBAL_STATE_MANAGER.getItem(
    webRenderer.context,
    LOCAL_STORAGE.PROJECT_INFO_SERVER_URL
  );

  let briefInfo = `
  <div class='brief-info'>
    <div class='flex-group'>`;

  sections.map((section) => {
    briefInfo += `<div class='flex-1 flex-direction-column' style="display:none" id='${section.id}_brief_section'>
        <div class='info-box cursor-pointer' id='${section.id}_info_box' onclick="openTab(event, '${section.id}')" >
            <div class='info-header'>${section.label}</div>
            <div class='info-count'><div id='${section.id}_count'>-</div></div>
            <div class='info-sub'><div id='${section.id}_info_sub'></div></div>
            <div class='brief-info-help-text'><div id='${section.id}_help_text'></div></div>
        </div>
      <div class='flex-1 box-1 summary-table' id="${section.id}_temp" style="display:none"></div>
  </div>`;
  });

  briefInfo += `
    </div>  

    ${
      serverURL
        ? `<button type='button' 
                    class='submit-btn hide-on-browser mt-1' 
                    data-tooltip='Url: ${serverURL}'
                    id='btn_submit_project_info'
                    onclick="submitDashboardStat()">
                    Submit Project Information
                </button>`
        : ""
    }     
  </div>`;

  return briefInfo;
};

const renderTabsContent = (sections: Array<IRecord>) => {
  let htmlStr = `
    <div class="tabs" style='display:none' id='summary_tabs'>`;

  htmlStr += `
        <div class="tab-buttons">`;
  sections.map((section) => {
    htmlStr += `<button 
                  class="tab-button" 
                  id="${section.id}_accordian_item" 
                  style='display:none'
                  type='button' 
                  onclick="openTab(event, '${section.id}')">
                  <div class='tab-btn-content'>
                      <div class='tab-btn-label'>${section.label}</div>
                      <div class='tab-btn-value' id="${section.id}_summary_header"></div>
                  </div>
                </button>`;
  });

  htmlStr += `
         </div>`;

  sections.map((section) => {
    htmlStr += `
          <div id="${section.id}" class="tab-content">
              <div class='flex-1 mb-2' id="${section.id}_summary_table"></div>
              <div id="${section.id}_summary_main_content"></div>
          </div>`;
  });

  htmlStr += `
        </div>
      </div>
  `;

  return htmlStr;
};

const renderAppBodyContent = async (
  content: string,
  sections: Array<IRecord>
) => {
  let htmlStr = ``;
  htmlStr += `
    <div id='selection_section'>
        ${renderNPMAuditSectionContent(sections)}
    </div>

    <div id='detailed_section' style="display:none">
      ${await renderBriefInfo(sections)}
      <br />

      ${content}
    
    <div id="summary_divider" style="display:none">
      <br />
      <div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px"></div>
      <br />
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        toggleLeftMenuItem('li_auditing');
      });
    </script>
    `;

  htmlStr += renderTabsContent(sections);
  return htmlStr;
};

const createHTMLReport = async (webRenderer: IWebRenderer) => {
  let view = {};

  webRenderer.setReportData(view);

  const applicationMeta = await getApplicationMeta(webRenderer);
  if (applicationMeta) {
    const { appName, version, description, appTotalDep } = applicationMeta;
    view = { ...view, appName, version, description, appTotalDep };
    webRenderer.setAppMetaData(applicationMeta);
  }

  let content = ``;

  webRenderer.content = content;

  let showESLintOption = false;
  if (webRenderer.pkgJSON) {
    const { devDependencies, dependencies } = webRenderer.pkgJSON;
    showESLintOption =
      Object.keys(devDependencies).findIndex((p) => p === "eslint") > -1 ||
      Object.keys(dependencies).findIndex((p) => p === "eslint") > -1;
  }

  let sections = [...SECTIONS];
  if (!showESLintOption) {
    sections = sections.filter((s) => s.id !== SECTIONS_IDS.ESLINT);
  }

  content = await renderAppBodyContent(content, sections);
  webRenderer.renderContent(content, REPORT_TITLE, SOURCE_TYPE.PROJECT);
};

export const renderNpmAuditReportCommand = async (
  webRenderer: IWebRenderer
) => {
  await createHTMLReport(webRenderer);
  checkVersionUpdate(webRenderer);
  // getNodeVersions(webRenderer);
};

export const npmAuditReportCommand = async (context: IContext, uri: IUri) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.AUDIT,
    uri
  );
  await renderNpmAuditReportCommand(webRenderer);
};

export const runCommandOnSelection = async (
  context: IContext,
  data: string | IRecord | null,
  uri: IUri
) => {
  if (data) {
    await webRenderer.init(context);
    webRenderer.renderContent("", PAGE_TITLE.TITLE, SOURCE_TYPE.PROJECT);
    showNPMPackageInfo(webRenderer, data);
    return;
  }

  const editor = vscode.window.activeTextEditor;

  if (editor) {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    initializeNPMSearch(context, uri, selectedText);
  }
};

export const initializeKnowledgeCenter = async (
  context: IContext,
  uri: IUri
) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.TITLE,
    uri
  );
  await renderKnowledgeCenter(webRenderer, uri);
};

export const renderInitializeNPMSearch = async (
  webRenderer: IWebRenderer,
  uri?: IUri,
  pckName?: string
) => {
  await renderNPMSearch(webRenderer);

  if (pckName) {
    showNPMPackageInfo(webRenderer, pckName);
  }

  // getNodeVersions(webRenderer);
};

export const initializeNPMSearch = async (
  context: IContext,
  uri?: IUri,
  pckName?: string
) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.NPM_SEARCH,
    uri,
    pckName
  );
  await renderInitializeNPMSearch(webRenderer, uri, pckName);
};

export const initializeDashboard = async (context: IContext, uri: IUri) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.DASHBOARD,
    uri
  );
  await renderDashboard(webRenderer);
};

export const initializeAIDashboard = async (context: IContext, uri: IUri) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.AI_DASHBOARD,
    uri
  );
  await renderAIDashboard(webRenderer, uri);
};

export const initializeAISearch = async (context: IContext, uri: IUri) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.AI_SEARCH,
    uri
  );
  await renderAISearchPage(webRenderer);
};

export const initializeConfig = async (
  context: IContext,
  uri: IUri,
  sourceType = SOURCE_TYPE.PROJECT
) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.CONFIGURATION,
    uri
  );

  await renderConfigPage(webRenderer, sourceType);
};

export const initializeAddToSnippet = async (context: IContext, uri: IUri) => {
  webRenderer = await initWebRenderer(
    webRenderer,
    context,
    PAGE_TITLE.ADD_SNIPPET,
    uri
  );

  await renderSnippetAddPage(webRenderer);
};
