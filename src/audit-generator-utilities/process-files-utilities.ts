import vscode from "vscode";
import { IRecord, IWebRenderer } from "../common.types";
const { getScanningHTML } = require("../util");
const MAX_LINE_COUNT = 600;

const getFunctionCount = (document: IRecord) => {
  const text = document.getText();
  const functionMatches =
    text.match(/function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/g) || [];
  const arrowFunctionMatches =
    text.match(/([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*\(.*\)\s*=>/g) || [];
  return functionMatches.length + arrowFunctionMatches.length;
};

const separateFilesByExtension = (filesList: Array<IRecord>) => {
  const separatedFiles: IRecord = {};

  filesList.forEach((file) => {
    const extension = file.fsPath.split(".").pop();
    if (!separatedFiles[extension]) {
      separatedFiles[extension] = [];
    }
    separatedFiles[extension].push(file);
  });

  return separatedFiles;
};

const renderFilesSummary = (
  webRenderer: IWebRenderer,
  files: Array<IRecord>
) => {
  const filesGroupByExtension = separateFilesByExtension(files);
  let vulStr = `<div><h3>File System Analysis</h3>`;

  vulStr += `<div>
  <div class="content">`;

  for (const [ext, groupedFiles] of Object.entries(filesGroupByExtension)) {
    vulStr += `
    <div class="content-box box box-grey">
    <div class="field-label">.${ext}</div>
    <div class="field-value">${groupedFiles.length}</div>
  </div>
    `;
  }

  vulStr += `
  <div class="content-box box box-grey">
    <div class="field-label">Total</div>
    <div class="field-value">${files.length}</div>
  </div>
  `;
  vulStr += `</div>`;
  vulStr += `</div>`;

  vulStr += `<div id="totalFileLabel"></div>`;

  webRenderer.sendMessageToUI("fileSummaryContent", {
    htmlContent: vulStr
  });
};

const renderLargeFiles = (
  largeFilesList: Array<IRecord>,
  showScanning: boolean,
  totalFiles: number,
  filesProcessed: number
) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  let vulStr = `<div>


  <h3>Large Files (files with ${MAX_LINE_COUNT}+ lines): ${largeFilesList.length} of ${totalFiles} files</h3>`;

  vulStr += `<div>
  <table class='table table-striped table-bordered table-sm'>
  <tr>
  <th class='text-align-left'>#</th>
  <th class='text-align-left'>Filename</th>
  <th class='text-right'>Line(s)</th>
  <th class='text-right'>Function(s)</th>
  </tr>
  
  `;
  let ctr = 0;
  for (const file of largeFilesList) {
    vulStr += `
    <tr>
    <td>${++ctr}</td>
    <td><a href='javascript:void(0)' target='_blank' class='remove-link-on-browser' onclick="openFile('${file.fileName.replace(
      /\\/g,
      "\\\\"
    )}')">${file.fileName.replace(`${workspaceFolder}\\`, "")}</a>
    </td>
    <td class='text-right'>${file.lineCount}</td>
    <td class='text-right'>${getFunctionCount(file)}</td>
    </tr>
    `;
  }

  if (showScanning) {
    vulStr += `
    <tr>
      <td colspan='4' class='text-center'><b>${getScanningHTML(
        `files (${((filesProcessed / totalFiles) * 100).toFixed(0)}%)`
      )}</b></td>
    </tr>
    `;
  }

  vulStr += `</table></div>`;
  vulStr += `</div>`;
  return vulStr;
};

const renderLargeFilesContent = async (
  webRenderer: IWebRenderer,
  files: Array<IRecord>
) => {
  let ctr = 0;
  let largeFilesList: Array<IRecord> = [];
  for (const file of files) {
    vscode.workspace.openTextDocument(file).then((document) => {
      if (document.lineCount > MAX_LINE_COUNT || ctr === files.length - 1) {
        largeFilesList = [...largeFilesList, document];
        webRenderer.sendMessageToUI("largeFilesContent", {
          htmlContent: renderLargeFiles(
            largeFilesList,
            ctr < files.length - 1,
            files.length,
            ctr
          )
        });
      }
      ctr++;
    });
  }
};

export const renderProcessedFiles = (
  webRenderer: IWebRenderer,
  files: Array<IRecord>
) => {
  if (!files || files.length === 0) {
    webRenderer.sendMessageToUI("fileSummaryContent", {
      htmlContent: null
    });

    return;
  }
  renderFilesSummary(webRenderer, files);
  renderLargeFilesContent(webRenderer, files);
};
