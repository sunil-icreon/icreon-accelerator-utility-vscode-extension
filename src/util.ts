import fs from "fs";
import os from "os";
import util from "util";
import {
  IAppMetaInfo,
  IContext,
  IRecord,
  IUri,
  IUserInfo,
  IWebRenderer
} from "./common.types";

import http from "http";
import https from "https";
import path, { dirname } from "path";
import semver from "semver";
import vscode, { commands, TextDocument, window, workspace } from "vscode";
import { IAAnalytics } from "./analytics";
import { closeIcon, icreonIcon } from "./icons";

import {
  extensionPrefix,
  IGNORE_PATHS,
  LOCAL_STORAGE,
  SEVERITY_TYPE
} from "./constants";

export const confirmMsg = (msg: any, cb: (flag: boolean) => void) => {
  window
    .showInformationMessage(msg, { modal: true }, ...["Yes", "No"])
    .then((selection: any) => {
      if (selection === "Yes") {
        cb && cb(true);
      } else {
        cb && cb(false);
      }
    });
};

export const logMsg = (msg: any, inModal?: boolean) => {
  msg = typeof msg === "string" ? msg : JSON.stringify(msg);
  window.showInformationMessage(msg, {
    modal: inModal || false
  });
};

export const logErrorMsg = (msg: string, inModal?: boolean) => {
  window.showErrorMessage(msg, { modal: inModal || false });
};

export const logInFile = async (msg: any, extensionPath: string) => {
  if (!msg) {
    return;
  }

  msg = typeof msg === "string" ? msg : JSON.stringify(msg);

  const filePath = path.join(
    extensionPath,
    `temp-log-file${new Date().getMilliseconds()}.txt`
  );
  fs.writeFileSync(filePath, msg);
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
};

export const GLOBAL_STATE_MANAGER = {
  getItem: async (context: IContext, key: string, defaultValue?: any) => {
    return (await context.globalState.get(key)) || defaultValue;
  },
  setItem: async (context: IContext, key: string, value: any) => {
    await context.globalState.update(key, value);
  },
  removeItem: async (context: IContext, key: string) => {
    await context.globalState.update(key, undefined);
  }
};

export const removeExtensionState = async (
  keyName: string,
  data: any,
  id: string,
  context: IContext
) => {
  let currentValue: Array<IRecord> =
    (await context.globalState.get(keyName)) || [];

  if (currentValue && currentValue.length > 0) {
    const foundIndex = currentValue.findIndex((c: IRecord) => c[id] === data);

    if (foundIndex >= 0) {
      currentValue.splice(foundIndex, 1);
    }
  }

  await context.globalState.update(keyName, currentValue);
};

export const saveVulDataInExtensionState = (
  data: Array<IRecord>,
  context: IContext
) => {
  if (Array.isArray(data) && data.length > 0) {
    data.map(async (vulForCache) => {
      if (Object.keys(vulForCache).length > 0) {
        await appendInExtensionState(
          LOCAL_STORAGE.VULNERABILITIES,
          [vulForCache],
          "id",
          context
        );
      }
    });
  }
};

export const appendInExtensionState = async (
  keyName: string,
  data: Array<IRecord>,
  id: string,
  context: IContext
) => {
  let currentValue: Array<IRecord> =
    (await context.globalState.get(keyName)) || [];

  if (currentValue && currentValue.length > 0) {
    if (data && Array.isArray(data)) {
      data.map((item) => {
        const foundIndex = currentValue.findIndex(
          (c: IRecord) => c[id] === item[id]
        );
        if (foundIndex === -1) {
          currentValue = [...currentValue, item];
        } else {
          currentValue[foundIndex] = item;
        }
      });
    }
  } else {
    currentValue = data;
  }

  await context.globalState.update(keyName, currentValue);
};

export const readFromExtensionState = async (
  keyName: string,
  context: IContext
): Promise<IRecord | undefined> => {
  return await context.globalState.get(keyName);
};

export const findFileInParentFolders = (
  filePath: string,
  currentFolder: string
): any => {
  const targetPath = path.join(currentFolder, filePath);
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  const parentFolder = path.dirname(currentFolder);
  if (parentFolder === currentFolder) {
    // Reached the root directory
    return undefined;
  }
  return findFileInParentFolders(filePath, parentFolder);
};

export const findFile = async (fileName: string, parentFolder: string) => {
  const foundFilePath = findFileInParentFolders(fileName, parentFolder);
  if (foundFilePath) {
    return await workspace.openTextDocument(foundFilePath);
  }

  return null;
};

export const getFileContent = async (file: IRecord) => {
  if (!file) {
    return "";
  }

  return await file.getText();
};

export const openFile = async (fileUri: string) => {
  const doc = await workspace.openTextDocument(fileUri);
  await window.showTextDocument(doc, { preview: false });
};

export const getFileData = (filePath: string, returnFormat?: string) => {
  try {
    //@ts-ignore
    return fs.readFileSync(filePath, returnFormat || "utf-8");
  } catch (e) {
    logMsg(e, true);
    return null;
  }
};

export const checkIfFileExist = (filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
};

export const registerCommand = (command: string, handlerMethod: () => void) => {
  return commands.registerCommand(command, async () => {
    await handlerMethod();
  });
};

export const isDarkTheme = () => {
  return window.activeColorTheme.kind === 2;
};

export const sortByKey = (
  list: Array<IRecord>,
  key: string,
  desc?: boolean
) => {
  if (!list || !key) {
    return list;
  }

  if (desc) {
    return list.sort((a, b) =>
      a[key] < b[key] ? 1 : b[key] < a[key] ? -1 : 0
    );
  }

  return list.sort((a, b) => (a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0));
};

export const convertObjectToArray = (
  obj: IRecord,
  keyAttribute: string,
  valueAttribute: string
) => {
  if (!obj || Object.keys(obj).length === 0) {
    return [];
  }

  return Object.keys(obj).map((key) => {
    return { [keyAttribute]: key, [valueAttribute]: obj[key] };
  });
};

export const severityTag = (severity: string) => {
  if (!severity) {
    return "";
  }

  severity = severity || "";
  const severityText = severity.charAt(0).toUpperCase() + severity.slice(1);
  return `<div class='severity-box severity-${severity}'>${severityText}</div>`;
};

export const REPORT_UTIL = {
  isObject: (obj: IRecord) => {
    return typeof obj === "object";
  },
  isString: (txt: IRecord) => {
    return typeof txt === "string";
  },
  ifVialsArrayOfObject: (via: Array<IRecord>) => {
    return via.some(({ dependency }) => dependency != null);
  },
  ifViaIsArrayOfString: (via: Array<IRecord>) => {
    return typeof via[0] === "string";
  },
  ifFixIsBoolean: (fixAvailable: IRecord | boolean) => {
    return typeof fixAvailable === "boolean";
  },
  ifFixIsObject: (fixAvailable: IRecord | boolean) => {
    return typeof fixAvailable === "object";
  },
  sortBySeverity: (list: Array<IRecord>) => {
    return sortByKey(list, "severity");
  },
  sortByDirect: (list: Array<IRecord>, desc?: boolean) => {
    return sortByKey(list, "isDirect", desc);
  },
  buildIsDirect: (vul: IRecord) => {
    return `<div data-tooltip='${
      vul.isDirect
        ? "Package is directly dependent"
        : "Package is not directly dependent, instead any direct dependency is using it"
    }' class='severity-box mr-1 ${
      vul.isDirect ? "is-direct" : "is-indirect"
    }'>&nbsp;</div>
`;
  },
  buildIsFixAvailable: (isBooleanFix: boolean, vul: IRecord) => {
    return isBooleanFix
      ? vul.fixAvailable == true
        ? `<div class="fix-green b mt-1">fix available via 'npm audit fix'</div>`
        : `<div class="fix-red b mt-1">No Fix Available</div>`
      : "";
  },
  buildBreakingFix: (vul: IRecord) => {
    return REPORT_UTIL.ifFixIsObject(vul.fixAvailable)
      ? `<div class="fix-yellow b">fix available via 'npm audit fix --force'</div>
    <div><i>Will install <b>${vul.fixAvailable.name}@ ${
          vul.fixAvailable.version
        }</b>
      ${vul.fixAvailable.isSemVerMajor ? ", which is a breaking change" : ""}
      </i>
    </div>`
      : "";
  },
  buildVunerability: (
    vul: IRecord,
    hasDepenciesList: boolean,
    via: IRecord
  ) => {
    const rightSection = `<div class='vul-detail-right'>
            <div>${REPORT_UTIL.buildScore(via)}</div>
            <div>${REPORT_UTIL.getCWEValue(via.cwe)}</div>
            ${
              via.url
                ? `<div class='bdg-sm'><a href='${via.url}'>${via.url.replace(
                    "https://github.com/advisories/",
                    ""
                  )}</a></div>`
                : ""
            }
          </div>`;

    const sev = `<span class='mr-1'>${REPORT_UTIL.buildSeverity(
      hasDepenciesList,
      vul,
      via
    )}</span>`;

    return hasDepenciesList
      ? `<div>${sev}Depends on vulnerable versions of <b><a href="#${via}" class='internal-link'>${via}</a></b>${rightSection}</div>`
      : `<b>${sev} ${via.title}</b>${
          via.range
            ? `<br/><div class='mt-1'><span class='impacted'>Impacted Versions: <b>${via.range}</b></span>${rightSection}</div>`
            : `${rightSection}`
        }`;
  },
  buildSeverity: (hasDepenciesList: boolean, vul: IRecord, via: IRecord) => {
    return severityTag(hasDepenciesList ? vul.severity : via.severity);
  },
  buildScore: (via: IRecord) => {
    return via.cvss && via.cvss.score
      ? `<div class='bdg-sm'>Score: <span><b>${via.cvss.score}</b>/10</span></div>`
      : "";
  },
  buildPackage: (vul: IRecord, isBooleanFix: boolean) => {
    return `<div>
              ${REPORT_UTIL.buildPackageName(vul)}
              <span class='color-grey'><i>v${vul.range}</i></span>
            </div>
            ${REPORT_UTIL.buildIsFixAvailable(isBooleanFix, vul)}
            <div class='mt-2'>
              ${REPORT_UTIL.buildBreakingFix(vul)}
            </div>`;
  },
  buildPackageName: (vul: IRecord) => {
    return `<b>${renderNPMViewerLink(vul.name)}</b>`;
    //return `<b><a href='https://www.npmjs.com/package/${vul.name}' class='no-link'>${vul.name}</a></b>`;
  },
  getCWEValue: (cweList: Array<string>) => {
    let cweArr = [];
    if (cweList instanceof Array) {
      cweArr = cweList.map((cwe) => {
        const cweVal = cwe.replace("CWE-", "");
        return `<a href='https://cwe.mitre.org/data/definitions/${cweVal}.html'>CWE-${cweVal}</a>`;
      });

      if (cweArr.length > 0) {
        return `<div class='bdg-sm'>${cweArr.join(" | ")}</div>`;
      }

      return "";
    }
    return "";
  },
  getVulnerabilitiesValue: (vul: IRecord) => {
    let vulArr = [];
    if (vul.via instanceof Array) {
      vulArr = vul.via.map((via: IRecord) => {
        const hasDepenciesList = REPORT_UTIL.isString(via);
        return `<li class='li-vul'>
          <div>${REPORT_UTIL.buildVunerability(
            vul,
            hasDepenciesList,
            via
          )}</div>
          
        </li>`;
      });

      if (vulArr.length > 0) {
        return vulArr.join("");
      }

      return "";
    }
  },
  getVulnerabilitiesText: (vul: IRecord) => {
    if (vul.via instanceof Array) {
      let directVul: Array<IRecord> = [];
      let dependentVul: Array<IRecord> = [];
      let returnText = ``;
      let vulText = ``;
      vul.via.map((via) => {
        if (REPORT_UTIL.isObject(via) && directVul.indexOf(via.title) === -1) {
          directVul.push(via.title);
          vulText += `<div><a class='no-link' href='${via.url}'><b>${via.title}</b></a>.</div>`;
        }

        if (REPORT_UTIL.isString(via) && dependentVul.indexOf(via) === -1) {
          dependentVul.push(via);
        }
      });

      if (directVul.length > 0) {
        returnText += ``;
        returnText += vulText;
        returnText += ``;
      }

      if (dependentVul.length > 0) {
        returnText += `<div class='mt-1'>Depends on vulnerable versions of `;
        dependentVul.map((v, indx) => {
          returnText += `${indx > 0 ? ", " : ""}<span class='b'>${v}</span>`;
        });
        returnText += `</div>`;
      }

      return returnText;
    }

    return "";
  },
  getVulnerabilitiesCount: (vul: IRecord) => {
    if (vul.via instanceof Array) {
      return vul.via.length;
    }
    return 0;
  }
};

export const isLowerVersion = (version1: string, version2: string) => {
  try {
    return semver.lt(version1, version2);
  } catch (e) {
    return false;
  }
};

export const getScanningHTML = (text: string) => {
  return `<div class='loader-wrapper box-1 mb-2'>
    <div class="loader"></div>
    <p class='loader-text'>Scanning ${text}...</p>
  </div>`;
};

export const getLoaderWithText = (size?: number, text?: string) =>
  `<div class='small-loader-wrapper'>
      <span class="loader-small mr-1" 
            style="width: ${size || "20"}px; height: ${size || "20"}px;"></span>
      ${text}
   </div>`;

export const getScanningHTMLSmall = (width?: number, height?: number) =>
  `<div class='small-loader-wrapper'><div class="loader-small" style="width: ${
    width || "20"
  }px; height: ${height || "20"}px;"></div></div>`;

export const getSearchingHTML = (text: string) => {
  return `<div class='loader-wrapper box-1 mb-2'>
    <div class="loader"></div>
    <p class='loader-text'>${text}...</p>
  </div>`;
};

export const getPackageJSON = async (file: TextDocument | null) => {
  if (!file) {
    return null;
  }

  const content = await getFileContent(file);
  if (!content) {
    return null;
  }

  return JSON.parse(content);
};

export const writeFile = (filePath: string, fileContent: string) => {
  try {
    ensureDirectoriesExist(filePath);
    fs.writeFileSync(filePath, fileContent);
    return true;
  } catch (e) {
    logErrorMsg(`Error writing file: ${filePath}.`);
    return false;
  }
};

const ensureDirectoriesExist = (filePath: string) => {
  const dir = path.dirname(filePath);
  if (fs.existsSync(dir)) {
    return true;
  }
  ensureDirectoriesExist(dir); // recursively ensure parent directories exist
  fs.mkdirSync(dir);
};

export const getApplicationMeta = async (webRenderer: IWebRenderer) => {
  if (!webRenderer.pkgJSON) {
    return {
      success: false,
      data: "Error: Reading content of package.json"
    };
  }

  const packageJSON = webRenderer.pkgJSON;

  const {
    name,
    version,
    description,
    devDependencies,
    dependencies,
    peerDependencies
  } = packageJSON;

  return {
    appName: name,
    version,
    description,
    appTotalDep: devDependencies
      ? Object.keys(devDependencies).length
      : 0 + dependencies
      ? Object.keys(dependencies).length
      : 0 + peerDependencies
      ? Object.keys(peerDependencies).length
      : 0
  };
};

export const formatNumber = (num: number | string) => {
  if (!num) {
    return 0;
  }

  if (typeof num === "string") {
    num = Number(num);
  }

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + "K";
  } else {
    return num.toString();
  }
};

export const filterBySeverity = (
  vulnerabilityList: Array<IRecord>,
  vulnerabiliy: string
) => {
  return vulnerabilityList.filter((pck) => pck.severity == vulnerabiliy);
};

export const onylFileName = (fileName: string) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  fileName = fileName.replace(`${workspaceFolder}\\`, "");
  return fileName;
};

export const deleteFolderRecursive = (folderPath: string) => {
  if (fs.existsSync(folderPath)) {
    //@ts-ignore
    fs.rm(folderPath, { recursive: true });
  }
};

export const convertSeconds = (seconds: number | string) => {
  if (typeof seconds === "string") {
    seconds = Number(seconds);
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h:${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m`;
};

export const formatDate = (dateObj: string | Date, withTime?: boolean) => {
  let options: any = {
    year: "numeric",
    month: "short",
    day: "2-digit"
  };

  if (withTime) {
    options = {
      ...options,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
  }
  return new Date(dateObj).toLocaleString("en-US", options);
};

export const timeAgo = (date: string | Date) => {
  const now = new Date().getTime();
  const past = new Date(date).getTime();
  const diff = now - past;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return years === 1 ? "1 year ago" : `${years} years ago`;
  } else if (months > 0) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  } else if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else {
    return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
  }
};

export const isStringifiedObject = (value: any) => {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsedValue = JSON.parse(value);
    return typeof parsedValue === "object" && parsedValue !== null;
  } catch (e) {
    return false;
  }
};

export const runNPMCommandWithoutPlatform = (
  webRenderer: IWebRenderer,
  command: string,
  cb: (flag: boolean, resp: any) => void
) => {
  const workingDir = dirname(webRenderer.packageLockFile.uri.path.substring(1));
  const exec = util.promisify(require("child_process").exec);

  try {
    exec(command, {
      windowsHide: true,
      cwd: workingDir
    })
      .then((result: IRecord) => {
        cb &&
          cb(
            true,
            isStringifiedObject(result.stdout)
              ? JSON.parse(result.stdout)
              : result.stdout || result
          );
      })
      .catch((e: IRecord) => {
        cb && cb(true, e);
      });
  } catch (output) {
    cb && cb(false, output);
  }
};

export const runNPMCommand = (
  webRenderer: IWebRenderer,
  command: string,
  cb: (flag: boolean, resp: any) => void
) => {
  const workingDir = dirname(webRenderer.packageLockFile.uri.path.substring(1));
  const exec = util.promisify(require("child_process").exec);

  try {
    exec(command + (process.platform !== "win32" ? "/" : "") + workingDir, {
      windowsHide: true,
      cwd: workingDir,
      maxBuffer: 2048 * 2048
    })
      .then((result: IRecord) => {
        cb &&
          cb(
            true,
            isStringifiedObject(result.stdout)
              ? JSON.parse(result.stdout)
              : result.stdout || result
          );
      })
      .catch((e: IRecord) => {
        cb && cb(true, e);
      });
  } catch (output) {
    cb && cb(false, output);
  }
};

export const PILLS = {
  renderPill: (
    val: string | number,
    label: string,
    showZero: boolean,
    severity: string,
    tooltip?: string,
    hideTooltip?: boolean
  ) => {
    if (!val && !showZero) {
      return "";
    }

    return `<div class='vul-pill vul-pill-${severity.toLowerCase()}' 
    ${!hideTooltip ? `data-tooltip="${tooltip || severity}"` : ""} >
        <div class='label'>${label}</div>
        <div class='value'>${
          typeof val === "number" ? formatNumber(val) : val
        }</div>
      </div>`;
  },
  SUCCESS: (
    val: string | number,
    label: string,
    showZero?: boolean,
    tooltip?: string,
    hideTooltip?: boolean
  ) => {
    return PILLS.renderPill(
      val,
      label,
      showZero || false,
      SEVERITY_TYPE.SUCCESS,
      tooltip,
      hideTooltip ?? true
    );
  },
  GENERAL: (
    val: string | number,
    label: string,
    showZero?: boolean,
    tooltip?: string,
    hideTooltip?: boolean
  ) => {
    return PILLS.renderPill(
      val,
      label,
      showZero || false,
      SEVERITY_TYPE.GENERAL,
      tooltip,
      hideTooltip ?? true
    );
  },
  SEVERITY: {
    CRITICAL: (
      val: string | number,
      label?: string,
      showZero?: boolean,
      tooltip?: string,
      hideTooltip?: boolean
    ) => {
      return PILLS.renderPill(
        val,
        label === undefined ? "C" : label,
        showZero || false,
        SEVERITY_TYPE.CRITICAL,
        tooltip,
        hideTooltip
      );
    },
    HIGH: (
      val: string | number,
      label?: string,
      showZero?: boolean,
      tooltip?: string,
      hideTooltip?: boolean
    ) => {
      return PILLS.renderPill(
        val,
        label === undefined ? "H" : label,
        showZero || false,
        SEVERITY_TYPE.HIGH,
        tooltip,
        hideTooltip
      );
    },
    MODERATE: (
      val: string | number,
      label?: string,
      showZero?: boolean,
      tooltip?: string,
      hideTooltip?: boolean
    ) => {
      return PILLS.renderPill(
        val,
        label ?? "M",
        showZero || false,
        SEVERITY_TYPE.MODERATE,
        tooltip,
        hideTooltip
      );
    },
    LOW: (
      val: string | number,
      label?: string,
      showZero?: boolean,
      tooltip?: string,
      hideTooltip?: boolean
    ) => {
      return PILLS.renderPill(
        val,
        label ?? "L",
        showZero || false,
        SEVERITY_TYPE.LOW,
        tooltip,
        hideTooltip
      );
    },
    INFO: (
      val: string | number,
      label?: string,
      showZero?: boolean,
      tooltip?: string,
      hideTooltip?: boolean
    ) => {
      return PILLS.renderPill(
        val,
        label || "",
        showZero || false,
        SEVERITY_TYPE.INFO,
        tooltip,
        hideTooltip
      );
    },
    NO_VULNERABILITY: `<div class='pill-sm white-space-no-wrap box-success-alt text-center' data-tooltip='No Vulnerabilities'>No Vulnerability</div>`,
    TOTAL: (val: string | number) =>
      `<div class='severity-box severity-info' data-tooltip="Total">${val}</div>`,
    GENERAL: (val: string | number) => {
      return `<div class='severity-box'>${val}</div>`;
    }
  }
};

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const sortVersions = (versions: IRecord) => {
  const versionStrings = Object.keys(versions);
  return versionStrings.sort((a, b) => semver.compare(b, a));
};

export const hrDivider = `<div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px; margin-top: 15px"></div>`;

export const getPackageId = (pckName: string, version: string) => {
  return `${pckName || ""}_${version || ""}`
    .toString()
    .replace(/\@/g, "_")
    .replace(/\./g, "_")
    .replace(/\-/g, "_")
    .replace(/\^/g, "_");
};

export const containsLicense = (content: string) => {
  return /MIT License|Apache License|GNU General Public License|Creative Commons/i.test(
    content
  );
};

export const getFileExtension = (filename: string) => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1] : "";
};

export const extractPackages = (dependencies: IRecord, packages?: IRecord) => {
  packages = packages || {};
  for (const [name, info] of Object.entries(dependencies)) {
    let pkgName: string | undefined = name;

    if (name.indexOf("@") > -1) {
      pkgName = `@${name.split("@")[1]}`;
    } else {
      pkgName = name.split("/").pop();
    }

    packages[pkgName || ""] = info?.version || info;

    if (info.dependencies) {
      extractPackages(info.dependencies, packages);
    }
  }
  return packages;
};

export const getDirectPackages = (webRenderer: IWebRenderer) => {
  let directDependencies = {};

  if (webRenderer.pkgJSON) {
    const {
      devDependencies,
      dependencies,
      peerDependencies,
      optionalDependencies
    } = webRenderer.pkgJSON;

    directDependencies = {
      ...directDependencies,
      ...(dependencies || {})
    };
    directDependencies = {
      ...directDependencies,
      ...(devDependencies || {})
    };
    directDependencies = {
      ...directDependencies,
      ...(peerDependencies || {})
    };
    directDependencies = {
      ...directDependencies,
      ...(optionalDependencies || {})
    };
  }

  return directDependencies;
};

export const cleanVersion = (version: string) => {
  if (!version) {
    return "";
  }

  return version.replace("~", "").replace("^", "");
};

export const renderAccordianItem = (
  id: string,
  headerContent: string,
  accordianContent: string
) => `
<div class="accordion-item" id="${id}_accordian_item" >
    <button class="accordion-header" id='${id}_accordian_btn' onclick="openAccordian('${id}')">
        <div class='summary-box'>
            ${headerContent}
        </div>
      <span class="icon">+</span>
    </button>
  
    <div class="accordion-content" id='${id}_accordian_content'>
      ${accordianContent}
    </div>
</div>`;

export const runOtherExtensionCommand = async (
  command: string,
  ...data: any
) => {
  try {
    await vscode.commands.executeCommand(command, ...data);
  } catch (e) {
    vscode.window.showInformationMessage("Error running command.");
  }
};

export const renderNPMViewerLink = (
  pkgName: string
) => `<a href='javascript:void(0)' 
           class='internal-link'
           onclick="openNPMViewer('${pkgName}')">
             ${pkgName}
        </a>`;

export const initializeAppInfo = async (webRenderer: IWebRenderer) => {
  let view = {};
  webRenderer.setReportData(view);

  const applicationMeta: IAppMetaInfo = await getApplicationMeta(webRenderer);
  if (applicationMeta) {
    const { appName, version, description, appTotalDep } = applicationMeta;
    view = { ...view, appName, version, description, appTotalDep };
    webRenderer.setAppMetaData(applicationMeta);
  }
};

export const getFileDataFromExtension = async (
  extensionPath: string,
  filePath: string,
  returnFormat: string
) => {
  const contentFilePath = path.join(extensionPath, filePath);
  return getFileData(contentFilePath, returnFormat);
};

export const getExtensionFileSrc = (
  extensionPath: string,
  panel: IRecord,
  resourcePath: string
) => {
  if (!extensionPath || !panel || !resourcePath) {
    return "";
  }

  const stylePath = path.resolve(extensionPath, resourcePath);
  return panel.webview.asWebviewUri(vscode.Uri.file(stylePath));
};

export const httpAPI = (
  requestUrl: string,
  method?: string,
  postData?: string
) => {
  return new Promise((resolve, reject) => {
    const url = new URL(requestUrl);

    let postHeader = {};
    if (postData) {
      postHeader = { "Content-Length": Buffer.byteLength(postData) };
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...postHeader
      }
    };

    const httpType = requestUrl.indexOf("https://") > -1 ? https : http;
    const req = httpType.request(options, (res: IRecord) => {
      let data = "";

      res.on("data", (chunk: any) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode < 400) {
          try {
            const json = isStringifiedObject(data) ? JSON.parse(data) : data;
            resolve(json || {});
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Failed : ${res.statusCode}`));
        }
      });
    });

    req.on("error", (error: IRecord) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
};

export const renderPackageScripts = (webRenderer: IWebRenderer) => {
  if (webRenderer.pkgJSON) {
    const { scripts } = webRenderer.pkgJSON;
    if (scripts && Object.keys(scripts).length > 0) {
      let htmlStr = `
      <div class='package-scripts-section'>
      `;
      Object.keys(scripts).map((key) => {
        htmlStr += `
            <div class='script-item'>
              <div>
                <div class='script-name internal-link'>${key}</div>
                 <div class='script-cmd'>${scripts[key]}</div>                
              </div>
              
              <button type='button'
                  class='icon-btn install-btn hide-on-browser float-right'
                  onclick="runScript('${key}')">
                    Run
                </button>
            </div>
              `;
      });

      htmlStr += `
      </div>`;

      return htmlStr;
    }
  }
};

export const generateUserInfo = (): IUserInfo => {
  const hostname = os.hostname();
  const platform = os.platform();
  const userName = os.userInfo()?.username;

  // // Get MAC addresses of all network interfaces
  // const networkInterfaces = os.networkInterfaces();
  // let macAddress = "";

  // // Loop over all network interfaces to find the first valid MAC address
  // for (const key in networkInterfaces) {
  //   if (networkInterfaces.hasOwnProperty(key)) {
  //     const interfaces: any = networkInterfaces[key];
  //     for (let i = 0; i < interfaces.length; i++) {
  //       if (!interfaces[i].internal && interfaces[i].mac) {
  //         macAddress = interfaces[i].mac;
  //         break;
  //       }
  //     }
  //   }
  //   if (macAddress) break;
  // }

  return {
    userName,
    hostname,
    platform,
    macAddress: ""
  };
};

export const initWebRenderer = async (
  webRenderer: IWebRenderer,
  context: IContext,
  title: string,
  uri?: IUri,
  pckName?: string
) => {
  // await context.globalState.update(LOCAL_STORAGE.VULNERABILITIES, undefined);

  webRenderer.title = title;
  // if (webRenderer.initialized) {
  //   webRenderer.pckName = pckName;
  //   return webRenderer;
  // }

  webRenderer.initialized = true;
  const parentPath = uri ? path.dirname(uri.fsPath) : "";

  await webRenderer.init(context);
  webRenderer.extensionVersion = await getExtensionVersion(context);
  webRenderer.pckName = pckName;

  webRenderer.pkgJSON = await getPackageJSON(
    await findFile("package.json", parentPath)
  );
  webRenderer.packageLockFile = await findFile("package-lock.json", parentPath);

  if (webRenderer.packageLockFile) {
    webRenderer.parentPath = dirname(
      webRenderer.packageLockFile?.uri?.path.substring(1)
    );
  }

  let packageLockContent = await getPackageJSON(
    await findFile("package-lock.json", parentPath)
  );

  if (packageLockContent) {
    webRenderer.packagesWithVersion = extractPackages(
      packageLockContent.packages
    );
  }

  webRenderer.extensionPath = context.extensionPath;
  webRenderer.uri = uri;
  webRenderer.userInfo = generateUserInfo();
  webRenderer.analytics = new IAAnalytics(webRenderer.userInfo);

  NODE_API.getVul(webRenderer, (resp: Array<IRecord>) => {
    if (resp) {
      appendInExtensionState(
        LOCAL_STORAGE.VULNERABILITIES,
        resp,
        "id",
        webRenderer.context
      );
    }
  });

  return webRenderer;
};

export const getFileTypeByExt = (ext: string) => {
  switch (ext) {
    case "ts":
    case "tsx":
      return "TypeScript-JSX";

    case "js":
    case "jsx":
      return "JavaScript-JSX";

    case "css":
      return "CSS";

    case "scss":
      return "SCSS";

    default:
      return ext;
  }
};

export const installExtension = async (
  extensionID: string,
  extensionName: string,
  cb: (success: boolean) => void
) => {
  try {
    await vscode.commands.executeCommand(
      "workbench.extensions.installExtension",
      extensionID
    );

    logMsg(
      `'${extensionName || extensionID}' extension installed successfully.`,
      true
    );

    setTimeout(() => {
      cb && cb(true);
    }, 300);
  } catch (e) {
    cb && cb(false);
    logMsg(
      `Error installing '${
        extensionName || extensionID
      }' extension. Plese check the extension details.`,
      true
    );
  }
};

export const getExtenConfigValue = (configName: string, defaultValue?: any) => {
  const config = vscode.workspace.getConfiguration(extensionPrefix);
  return config.get(configName) || defaultValue;
};

export const NODE_API = {
  getVulnerabilityURL: async (webRenderer: IWebRenderer) =>
    await GLOBAL_STATE_MANAGER.getItem(
      webRenderer.context,
      LOCAL_STORAGE.VULNERABILITY_SERVER_URL
    ),
  geProjectStatURL: async (webRenderer: IWebRenderer) =>
    await GLOBAL_STATE_MANAGER.getItem(
      webRenderer.context,
      LOCAL_STORAGE.PROJECT_INFO_SERVER_URL
    ),
  getVul: async (webRenderer: IWebRenderer, cb: (resp: any) => void) => {
    const apiURL = await NODE_API.getVulnerabilityURL(webRenderer);
    if (!apiURL) {
      return;
    }

    httpAPI(`${apiURL}`).then((resp) => {
      cb && cb(resp);
    });
  },
  saveVul: async (webRenderer: IWebRenderer, vulList: Array<IRecord>) => {
    const apiURL = await NODE_API.getVulnerabilityURL(webRenderer);
    if (!apiURL) {
      return;
    }

    httpAPI(`${apiURL}`, "POST", JSON.stringify({ data: vulList }));
  },
  sendProjectStat: async (webRenderer: IWebRenderer) => {
    const apiURL = await NODE_API.geProjectStatURL(webRenderer);
    if (!apiURL) {
      return;
    }

    const { name, version, description } = webRenderer.pkgJSON;
    httpAPI(
      `${apiURL}`,
      "POST",
      JSON.stringify({
        data: {
          stat: webRenderer.projectStat,
          projectName: name,
          version,
          description
        }
      })
    )
      .then(() => {
        logMsg(`Project information submitted successfully.`, true);
      })
      .catch((e) => {
        logMsg(`Failed submitting project info [${JSON.stringify(e)}].`, true);
      })
      .finally(() => {
        webRenderer.sendMessageToUI("submitProjectInfoContent", {
          isLoading: false
        });
      });
  }
};

export const getAllFilesOfFolder = (
  dirPath: string,
  allowedExtension: Array<string>,
  ignoredFolders: Array<string>,
  ignoredFiles: Array<string>
) => {
  const items = fs.readdirSync(dirPath);
  let allFiles: Array<IRecord> = [];
  items.forEach((item: string) => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoredFolders.includes(item)) {
        allFiles = [
          ...allFiles,
          ...getAllFilesOfFolder(
            fullPath,
            allowedExtension,
            ignoredFolders,
            ignoredFiles
          )
        ];
      }
    } else {
      if (!ignoredFiles.includes(item)) {
        const ext = getFileExtension(item);
        if (allowedExtension.includes(ext)) {
          allFiles = [...allFiles, { name: item, fullPath }];
        }
      }
    }
  });

  return allFiles;
};

export const generateTree = async (
  webRenderer: IWebRenderer,
  dirPath: string,
  allowedExtension: string
) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context
  );

  const items = fs.readdirSync(dirPath);
  const tree: Array<IRecord> = [];

  items.forEach(async (item: string) => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoredFolders.includes(item)) {
        tree.push({
          name: item,
          type: "folder",
          fullPath: fullPath,
          children: await generateTree(webRenderer, fullPath, allowedExtension)
        });
      }
    } else {
      if (!ignoredFiles.includes(item)) {
        const ext = getFileExtension(item);
        if (allowedExtension.includes(ext)) {
          tree.push({
            name: item,
            type: "file",
            fullPath: fullPath
          });
        }
      }
    }
  });

  return tree;
};

export const renderTree = (outputArr: Array<string>, data: Array<IRecord>) => {
  outputArr = [...outputArr, `<ul>`];

  data.forEach((item) => {
    if (item) {
      if (item.type === "folder") {
        const child = renderTree([], item.children || []);
        outputArr = [
          ...outputArr,
          `
        <li class='folder  file-tree-li'>
          <span class='folder-name'>${item.name}</span>
          <span class='child_ui'>${(child || []).join(" ")}</span>
        </li>`
        ];
      }
      if (item.type === "file") {
        outputArr = [
          ...outputArr,
          `<li class='file'>
              <a href='javascript:void(0)' 
                class='internal-link no-link' 
                onclick="openFile('${item.fullPath.replace(/\\/g, "\\\\")}')">
                ${item.name}
              </a>
           </li>`
        ];
      }
    }
  });

  outputArr = [...outputArr, `</ul>`];
  return outputArr;
};

export const renderFormField = (
  fieldId: string,
  label: string,
  field: string,
  config?: {
    hint?: string;
    hidden?: boolean;
    className?: string;
    required?: boolean;
  }
) => {
  const { hint, hidden, className, required } = config || {};

  return `
  <div class='form-field mb-1 ${className}' 
    id='field_${fieldId}' 
    ${hidden ? "style=display:none;" : ""}>
      <span class='field-label'>${label} ${
    required ? `<span class='text-danger'> *</span>` : ""
  }</span>
      ${field}
      ${hint ? `<div class='field-hint'>${hint}</div>` : ""}
  </div>
  `;
};

export const getIgnoreFileFolder = async (
  context: IContext,
  folderKey?: string,
  fileKey?: string
) => {
  const folderPathKey: string =
    folderKey || LOCAL_STORAGE.IGNORE_PATH_STANDARD_FOLDERS;
  const filePathKey: string =
    fileKey || LOCAL_STORAGE.IGNORE_PATH_STANDARD_FILES;

  let ignoredFolder = await GLOBAL_STATE_MANAGER.getItem(
    context,
    folderPathKey
  );

  if (!ignoredFolder) {
    ignoredFolder = IGNORE_PATHS[folderPathKey].join(", ");
  }

  let ignoredFiles = await GLOBAL_STATE_MANAGER.getItem(context, filePathKey);

  if (!ignoredFiles) {
    ignoredFiles = IGNORE_PATHS[filePathKey].join(", ");
  }

  ignoredFolder = ignoredFolder || "";
  ignoredFiles = ignoredFiles || "";

  return {
    ignoredFolders: ignoredFolder.split(",").map((itm: string) => itm.trim()),
    ignoredFiles: ignoredFiles.split(",").map((itm: string) => itm.trim())
  };
};

export const splitButton = (
  leftContent: string,
  rightContent: string,
  onClick?: string,
  hint?: string,
  className?: string,
  id?: string,
  style?: string
) => {
  return `
  <div ${
    id ? `id='${id}'` : ""
  } ${style} class='split-btn ${className}' ${onClick}>
    <div class='btn-content'>
      <div class='left-content'>${leftContent}</div>
      <div class='right-content'>${rightContent}</div>
    </div>

    ${hint ? `<div class='hint mt-1'>${hint}</div>` : ""}
  </div>
  `;
};

export const randomTxt = () => (Math.random() + 1).toString(24).substring(5);

export const getExtensionVersion = async (context: IContext) => {
  const extensionPck: any = await getFileDataFromExtension(
    context.extensionPath,
    "package.json",
    "utf-8"
  );

  if (extensionPck) {
    return JSON.parse(extensionPck || "{}").version;
  }

  return null;
};
export const showStatusContent = async (context: IContext) => {
  const extVersion: string = await getExtensionVersion(context);
  if (extVersion) {
    let statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );

    statusBarItem.text = `Icreon Accelerator: Utilities (v${extVersion})`;
    statusBarItem.tooltip = `Find vulnerable/outdated dependencies, duplicate/unused code, analyze code for maintainability, install dependencies, integrate solutions, write unit test cases and perform AI searches.`;

    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
  }
};

interface INewUpdateType {
  version: string;
  features: string;
  downloadLink: string;
  installationGuide: string;
  updateDate: string;
}

export const checkVersionUpdate = (webRenderer: IWebRenderer) => {
  try {
    httpAPI(
      "https://raw.githubusercontent.com/sunil-icreon/ia-extension-helper/refs/heads/main/version.json",
      "GET"
    ).then((resp: any) => {
      const newUpdates: INewUpdateType = resp;
      if (newUpdates) {
        const isNewerVersionAvailable =
          webRenderer.extensionVersion != newUpdates.version;

        if (!isNewerVersionAvailable) {
          return;
        }

        let htmlStr = "";
        htmlStr += `
         <div class='dep-info-box info-pages'>
            <button class='close-link' 
              onclick='closeCommonMessage()'
              data-tooltip="Close"
              >
              ${closeIcon(24)}
            </button> 
  
            <div class='icreon-icon'>${icreonIcon("#212529")}</div>
            <h1 class='grey-header mt-0 text-danger'>New Version Available</h1> 
  
            ${hrDivider}
        
          <div class='dep-info'>
            <div class='section'>
              <h2 class='grey-header mb-0'>Version</h2>
              <p>${newUpdates.version}</p>
  
              <h2 class='grey-header mb-0'>Features</h2>
              <p>${newUpdates.features}</p>
  
              <h2 class='grey-header mb-0'>Download</h2>
            
              <a
                href='${newUpdates.downloadLink}' 
                target='_blank'
                class='internal-link mt-1'
                downlod>
                New Version
              </a>
  
            <h2 class='grey-header mb-0'>Installation Guide</h2>
            
            <a
              href='${newUpdates.installationGuide}' 
              target='_blank'
              class='internal-link mt-1'
              downlod>
                Installation Guide
            </a>
          </div>
      </div>
    </div>
    `;

        webRenderer.sendMessageToUI("newVersionContent", {
          htmlContent: htmlStr
        });
      }
    });
  } catch (e) {}
};
