import { IRecord, IWebRenderer } from "../common.types";
import {
  PILLS,
  formatNumber,
  getScanningHTML,
  getScanningHTMLSmall,
  renderAccordianItem,
  runNPMCommandWithoutPlatform
} from "../util";

import { PROJECT_STAT } from "../constants";

const renderSections = (
  label: string,
  id: string,
  list: Array<IRecord>,
  parentPath: string
) => {
  if (!list || list.length === 0) {
    return "";
  }

  let htlmStr = `
  <table class='table table-striped table-bordered table-sm simple-table'>
    <tr>
      <th>#</th>
      <th class='text-align-left'>Item</th>
      <th class='text-align-left'>Filename</th>
    </tr>`;

  list.map((fl, index) => {
    if (fl) {
      const flPath = `${parentPath}\\${fl.flName}`.replace(/\\/g, "\\\\");
      htlmStr += `
      <tr>
        <td class='text-center'>${index + 1}</td>
        <td class='text-align-left'>${fl.name}</td>
        <td class='text-align-left'>
          <a href='javascript:void(0)' 
            target='_blank' 
            class='internal-link no-link remove-link-on-browser-1' 
            onclick="openFile('${flPath}',${fl.line},${fl.col})">
              ${fl.flName}
          </a>
        </td>

      </tr>`;
    }
  });

  htlmStr += `</table>`;

  return renderAccordianItem(
    "unused_" + id.toLowerCase(),
    `<div class='flex-group'>
     <div class='flex flex-align-center flex-gap-5'>
      <span class='mr-1'>${label}</span>
      ${PILLS.GENERAL(list.length, id, false, "", true)}
    </div>
</div>`,
    htlmStr
  );
};

const getIssues = (issues: Array<IRecord>) => {
  let exportList: Array<IRecord> = [];
  let enumList: Array<IRecord> = [];
  let typeList: Array<IRecord> = [];
  let duplicateList: Array<IRecord> = [];

  issues.map((issue) => {
    if (issue) {
      if (issue.exports && issue.exports.length > 0) {
        exportList = [
          ...exportList,
          ...issue.exports.map((exp: IRecord) => {
            return {
              ...exp,
              flName: issue.file
            };
          })
        ];
      }

      if (issue.types && issue.types.length > 0) {
        typeList = [
          ...typeList,
          ...issue.types.map((typ: IRecord) => {
            return {
              ...typ,
              flName: issue.file
            };
          })
        ];
      }

      if (issue.duplicates && issue.duplicates.length > 0) {
        issue.duplicates.map((dup: IRecord) => {
          duplicateList = [
            ...duplicateList,
            ...dup.map((itm: IRecord) => {
              return {
                ...itm,
                flName: issue.file
              };
            })
          ];
        });
      }

      if (issue.enumMembers && Object.keys(issue.enumMembers).length > 0) {
        Object.keys(issue.enumMembers).map((key) => {
          const vals = issue.enumMembers[key];
          enumList = [
            ...enumList,
            ...vals.map((val: IRecord) => {
              return {
                ...val,
                name: `${key}.${val.name}`,
                flName: issue.file
              };
            })
          ];
        });
      }
    }
  });

  return {
    exportList,
    enumList,
    typeList,
    duplicateList
  };
};

const renderUnusedFiles = (files: Array<IRecord>, parentPath: string) => {
  let htlmStr = `
  <table class='table table-striped table-bordered table-sm simple-table'>
    <tr>
      <th>#</th>
      <th class='text-align-left'>Filename</th>
    </tr>`;

  files.map((fl, index) => {
    const flPath = `${parentPath}\\${fl}`.replace(/\\/g, "\\\\");
    htlmStr += `
    <tr>
      <td class='text-center'>${index + 1}</td>
      <td class='text-align-left'>
      <a href='javascript:void(0)' 
            target='_blank' 
            class='internal-link no-link remove-link-on-browser-1' 
            onclick="openFile('${flPath}')">
              ${fl}
            </a></td>
    </tr>`;
  });

  htlmStr += `</table>`;

  return renderAccordianItem(
    "ununsed_files",
    `<div class='flex-group'>
     <div class='flex flex-align-center flex-gap-5'>
      <span class='mr-1'>Unused Files</span>
      ${PILLS.GENERAL(files.length, "Files", false, "", true)}
    </div>
</div>`,
    htlmStr
  );
};

const renderUnusedCodes = (webRenderer: IWebRenderer, data: IRecord) => {
  if (!data || Object.keys(data).length === 0) {
    webRenderer.sendMessageToUI("unusedCodeContent", {
      htmlContent: `<div class="content-box box box-success-alt">
              <div class="field-label">Great</div>
              <div class="field-value">There are no ununsed code instances.</div>
            </div>`,
      Count: 0,
      showSummary: false,
      summaryHeader: ``,
      summaryTableData: ``
    });
    return;
  }

  const { files = [], issues = [] } = data;
  const { exportList, enumList, typeList, duplicateList } = getIssues(issues);
  const total =
    files.length +
    exportList.length +
    enumList.length +
    typeList.length +
    duplicateList.length;

  webRenderer.projectStat[PROJECT_STAT.UNUSED_CODE] = {
    t: total,
    files: files.length,
    exports: exportList.length,
    enums: enumList.length,
    types: typeList.length,
    duplicates: duplicateList.length,
    ts: new Date().toUTCString()
  };

  // NODE_API.sendProjectStat(webRenderer);

  let content = ``;
  content += `<div class='accordion'>`;
  content += renderUnusedFiles(files, webRenderer.parentPath);
  content += renderSections(
    "Unused Exports",
    "Exports",
    exportList,
    webRenderer.parentPath
  );
  content += renderSections(
    "Unused Enums",
    "Enums",
    enumList,
    webRenderer.parentPath
  );
  content += renderSections(
    "Unused Types",
    "Types",
    typeList,
    webRenderer.parentPath
  );
  content += renderSections(
    "Duplicates",
    "Duplicates",
    duplicateList,
    webRenderer.parentPath
  );
  content += `</div>`;

  webRenderer.sendMessageToUI("unusedCodeContent", {
    htmlContent: content,
    Count: formatNumber(total),
    showSummary: true,
    subInfo: `Files, Exports, Types`,
    summaryHeader: `<div class='flex-group'>
      ${PILLS.GENERAL(formatNumber(files.length), "Files", false, "", true)}
      ${PILLS.GENERAL(
        formatNumber(total - files.length),
        "Issues",
        false,
        "",
        true
      )}
    </div>`,
    summaryTableData: `
    <div class='flex-1'>
      <div class="content">
        <table class='table table-striped table-bordered table-sm simple-table'> 
            <tr>
              <th class='text-right'>Files</th>
              <th class='text-right'>Exports</th>
              <th class='text-right'>Enums</th>
              <th class='text-right'>Types</th>
              <th class='text-right'>Duplicates</th>
              <th class='text-right'>Total</th>
            </tr>
            <tr>
              <td class='text-right'>${formatNumber(files.length)}</td>
              <td class='text-right'>${formatNumber(exportList.length)}</td>
              <td class='text-right'>${formatNumber(enumList.length)}</td>
              <td class='text-right'>${formatNumber(typeList.length)}</td>
              <td class='text-right'>${formatNumber(duplicateList.length)}</td>
              <td class='text-right'><b>${formatNumber(total)}</b></td>
            </tr>
        </table>
      </div>
    </div>`
  });
};

const renderError = (webRenderer: IWebRenderer, errorMsg: string) => {
  webRenderer.sendMessageToUI("unusedCodeContent", {
    htmlContent: errorMsg,
    subInfo: `Something went wrong, while finding unused codes.`,
    showSummary: true
  });
};

export const getUnusedCodes = async (webRenderer: IWebRenderer) => {
  webRenderer.sendMessageToUI("unusedCodeContent", {
    htmlContent: getScanningHTML(" for Unused Code"),
    Count: getScanningHTMLSmall()
  });

  try {
    runNPMCommandWithoutPlatform(
      webRenderer,
      `npx knip@5.30.2 --reporter json --exclude dependencies --exclude files --exclude unlisted --exclude unresolved `,
      (success, resp) => {
        if (success && resp && !resp.stderr) {
          renderUnusedCodes(webRenderer, JSON.parse(resp.stdout || "{}"));
          return;
        }

        renderError(
          webRenderer,
          `<span class='text-danger'>Error finding ununsed codes [${JSON.stringify(
            resp.stderr || {}
          )}].</span>`
        );
      }
    );
  } catch (output) {
    renderError(
      webRenderer,
      `<span class='text-danger'>Error caught finding ununsed codes [${JSON.stringify(
        output || {}
      )}].</span>`
    );
  }
};
