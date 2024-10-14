import vscode, { Uri } from "vscode";
import { IWebRenderer } from "../common.types";
import {
  PILLS,
  getIgnoreFileFolder,
  getScanningHTMLSmall,
  logMsg
} from "../util";

interface ISecretInstanceType {
  phrase: string;
  lineNumber?: number;
}

interface ISecretFileType {
  filePath: string;
  instances: Array<ISecretInstanceType>;
}

const renderSecretFiles = (
  webRenderer: IWebRenderer,
  progressHTML: string,
  secretFiles: Array<ISecretFileType>
) => {
  if (secretFiles.length === 0 && !progressHTML) {
    webRenderer.sendMessageToUI("secretContent", {
      htmlContent: `<div class="content-box box box-success-alt">
            <div class="field-label">Great</div>
            <div class="field-value">There are no files with secret phrases.</div>
          </div>`,
      Count: 0,
      showSummary: true,
      summaryHeader: ``,
      summaryTableData: ``
    });
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  let htmlStr = `<div><h3 class='grey-header'>Files With Secret Phrases: ${secretFiles.length}</h3>`;

  htmlStr += `<div>
    
    <table class='table table-striped table-bordered table-sm simple-table'>
      <tr>
        <th>#</th>
        <th class='text-align-left'>File</th>
        <th>Phrases</th>
      </tr>
  `;

  const renderInstances = (fl: ISecretFileType) => {
    let str: Array<string> = [];
    fl.instances.map((ins: ISecretInstanceType) => {
      str.push(`<a href='javascript:void(0)'
          target='_blank'
          class='remove-link-on-browser text-sm badge-link'
          onclick="openFile('${fl.filePath.replace(/\\/g, "\\\\")}',
                            ${ins.lineNumber},1)">${ins.phrase}</a>
      `);
    });

    return str.join(", ");
  };

  (secretFiles || []).forEach((fl: ISecretFileType, index: number) => {
    htmlStr += `
    <tr>
        <td class='text-center'>${index + 1}</td>
        <td class='text-sm text-light-grey'>
          ${fl.filePath.replace(`${workspaceFolder}\\`, "")}
        </td>

        <td>
          ${renderInstances(fl)}
        </td>
      </tr>`;
  });

  htmlStr += `
    </table>
  </div>`;

  const totalInstances = secretFiles.reduce(
    (count: number, obj: ISecretFileType) => count + obj.instances.length,
    0
  );

  webRenderer.sendMessageToUI("secretContent", {
    htmlContent: htmlStr,
    Count: totalInstances,
    subInfo: `${secretFiles.length} File(s)`,
    helpText: progressHTML,
    showSummary: true,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.MODERATE(
        totalInstances,
        "Instances",
        false,
        "Number of instances of secret phrases"
      )}
    </div>
    `,
    summaryTableData: ``
  });
};

const renderSecretResult = async (
  webRenderer: IWebRenderer,
  files: Array<Uri>
) => {
  let secretFiles: Array<ISecretFileType> = [];

  const patterns = [
    /(password|pwd|pass)\s*=\s*[\'"][^\'"]+[\'"]/gi,
    /AKIA[0-9A-Z]{16}/gi, // AWS Access Keys
    /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/gi, // JWT
    /['"]?secret['"]?\s*:\s*['"][^'"]+['"]/gi
  ];

  try {
    const fileReadPromises = files.map(async (fileUri) => {
      try {
        const fileContent = await vscode.workspace.fs.readFile(fileUri);
        const contentStr = Buffer.from(fileContent).toString("utf8");
        return { filePath: fileUri.fsPath, content: contentStr };
      } catch (error) {
        return null;
      }
    });

    const fileContents = await Promise.all(fileReadPromises);
    fileContents.forEach((file, index: number) => {
      if (file) {
        const text = file.content;
        if (text) {
          let instances: Array<ISecretInstanceType> = [];
          const lines = text.split("\n");
          patterns.forEach((pattern) => {
            let match: any;

            while ((match = pattern.exec(text))) {
              let phrase = match[1] || match[2];

              let lineNumber = -1;
              lines.map((line, lineIndex) => {
                if (line.indexOf(phrase || match[0]) > -1) {
                  lineNumber = lineIndex;
                }
              });

              if (!phrase) {
                const val = match[0];
                if (val.startsWith("eyJ")) {
                  phrase = "JWT Token";
                } else if (val.startsWith("AKIA")) {
                  phrase = "AWS Access Token";
                } else {
                  phrase = val;
                }
              }

              instances = [
                ...instances,
                {
                  phrase,
                  lineNumber
                }
              ];
            }
          });

          if (instances.length > 0) {
            const existingItemIndex: number = secretFiles.findIndex(
              (sec: ISecretFileType) => sec.filePath === file.filePath
            );

            if (existingItemIndex === -1) {
              secretFiles = [
                ...secretFiles,
                {
                  filePath: file.filePath,
                  instances
                }
              ];
            } else {
              const crntItem = secretFiles[existingItemIndex];
              secretFiles[existingItemIndex] = {
                ...crntItem,
                instances: [...crntItem.instances, ...instances]
              };
            }
          }
        }
      }

      renderSecretFiles(
        webRenderer,
        index < files.length - 1
          ? `Scanning ${index} of ${files.length}...`
          : "",
        secretFiles
      );
    });
  } catch (ee) {}
};

export const findSecrets = async (webRenderer: IWebRenderer) => {
  if (vscode.workspace.workspaceFolders) {
    try {
      webRenderer.sendMessageToUI("secretContent", {
        htmlContent: "",
        Count: getScanningHTMLSmall(),
        showSummary: false,
        helpText: ""
      });

      const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

      const filesExtension = `ts,tsx,js,jsx,json`;
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

      vscode.workspace
        .findFiles(searchPattern, ignorePattern)
        .then((files: Array<Uri>) => {
          renderSecretResult(webRenderer, files);
        });
    } catch (ee) {
      webRenderer.sendMessageToUI("secretContent", {
        htmlContent: "",
        Count: "",
        showSummary: false,
        hideSection: true
      });

      logMsg(`Failed finding licensed files : ${JSON.stringify(ee)}`);
    }
  }
};
