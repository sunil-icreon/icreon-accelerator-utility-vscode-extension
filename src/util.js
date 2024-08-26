const vscode = require("vscode");
const https = require("https");
const http = require("http");
const { dirname } = require("path");
const fs = require("fs");
const path = require("path");
const util = require("util");
const semver = require("semver");
const { window, workspace, commands } = require("vscode");
const {
  SEVERITY_TYPE,
  LOCAL_STORAGE,
  IGNORE_PATHS,
  extensionPrefix,
  EXTENSION_CONFIG
} = require("./constants");

const confirmMsg = (msg, cb) => {
  window
    .showInformationMessage(msg, { modal: true }, ...["Yes", "No"])
    .then((selection) => {
      if (selection === "Yes") {
        cb && cb(true);
      } else {
        cb && cb(false);
      }
    });
};

const logMsg = (msg, inModal) => {
  window.showInformationMessage(msg, { modal: inModal || false });
};

const logErrorMsg = (msg, inModal) => {
  window.showErrorMessage(msg, { modal: inModal || false });
};

const logInFile = async (msg, extensionPath) => {
  if (!msg) {
    return;
  }
  const filePath = path.join(
    extensionPath,
    `temp-log-file${new Date().getMilliseconds()}.txt`
  );
  fs.writeFileSync(filePath, msg);
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
};

const GLOBAL_STATE_MANAGER = {
  getItem: async (context, key, defaultValue) => {
    return (await context.globalState.get(key)) || defaultValue;
  },
  setItem: async (context, key, value) => {
    await context.globalState.update(key, value);
  },
  removeItem: async (context, key) => {
    await context.globalState.update(key, undefined);
  }
};

const removeExtensionState = async (keyName, data, id, context) => {
  let currentValue = (await context.globalState.get(keyName)) || [];

  if (currentValue && currentValue.length > 0) {
    const foundIndex = currentValue.findIndex((c) => c[id] === data);

    if (foundIndex >= 0) {
      currentValue.splice(foundIndex, 1);
    }
  }

  await context.globalState.update(keyName, currentValue);
};

const saveVulDataInExtensionState = (data, context) => {
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
const appendInExtensionState = async (keyName, data, id, context) => {
  let currentValue = (await context.globalState.get(keyName)) || [];

  if (currentValue && currentValue.length > 0) {
    data.map((item) => {
      const foundIndex = currentValue.findIndex((c) => c[id] === item[id]);
      if (foundIndex === -1) {
        currentValue = [...currentValue, item];
      } else {
        currentValue[foundIndex] = item;
      }
    });
  } else {
    currentValue = data;
  }

  await context.globalState.update(keyName, currentValue);
};

const readFromExtensionState = async (keyName, context) => {
  return await context.globalState.get(keyName);
};

const findFileInParentFolders = (filePath, currentFolder) => {
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

const findFile = async (fileName, parentFolder) => {
  const foundFilePath = findFileInParentFolders(fileName, parentFolder);
  if (foundFilePath) {
    return await workspace.openTextDocument(foundFilePath);
  }

  return null;
};

const getFileContent = async (file) => {
  if (!file) {
    return "";
  }

  return await file.getText();
};

const openFile = async (fileUri) => {
  const doc = await workspace.openTextDocument(fileUri);
  await window.showTextDocument(doc, { preview: false });
};

const getFileData = (filePath, returnFormat) => {
  try {
    return fs.readFileSync(filePath, returnFormat || "utf-8");
  } catch (e) {
    return null;
  }
};

const checkIfFileExist = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
};

const registerCommand = (command, handlerMethod) => {
  return commands.registerCommand(command, async () => {
    await handlerMethod();
  });
};

const isDarkTheme = () => {
  return window.activeColorTheme.kind === 2;
};

const sortByKey = (list, key, desc) => {
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

const convertObjectToArray = (obj, keyAttribute, valueAttribute) => {
  if (!obj || Object.keys(obj).length === 0) {
    return [];
  }

  return Object.keys(obj).map((key) => {
    return { [keyAttribute]: key, [valueAttribute]: obj[key] };
  });
};

const severityTag = (severity) => {
  if (!severity) {
    return "";
  }

  severity = severity || "";
  const severityText = severity.charAt(0).toUpperCase() + severity.slice(1);
  return `<div class='severity-box severity-${severity}'>${severityText}</div>`;
};

const REPORT_UTIL = {
  isObject: (obj) => {
    return typeof obj === "object";
  },
  isString: (txt) => {
    return typeof txt === "string";
  },
  ifVialsArrayOfObject: (via) => {
    return via.some(({ dependency }) => dependency != null);
  },
  ifViaIsArrayOfString: (via) => {
    return typeof via[0] === "string";
  },
  ifFixIsBoolean: (fixAvailable) => {
    return typeof fixAvailable === "boolean";
  },
  ifFixIsObject: (fixAvailable) => {
    return typeof fixAvailable === "object";
  },
  sortBySeverity: (list) => {
    return sortByKey(list, "severity");
  },
  sortByDirect: (list, desc) => {
    return sortByKey(list, "isDirect", desc);
  },
  buildIsDirect: (vul) => {
    return `<div data-tooltip='${
      vul.isDirect
        ? "Package is directly dependent"
        : "Package is not directly dependent, instead any direct dependency is using it"
    }' class='severity-box mr-1 ${
      vul.isDirect ? "is-direct" : "is-indirect"
    }'>&nbsp;</div>
`;
  },
  buildIsFixAvailable: (isBooleanFix, vul) => {
    return isBooleanFix
      ? vul.fixAvailable == true
        ? `<div class="fix-green b mt-1">fix available via 'npm audit fix'</div>`
        : `<div class="fix-red b mt-1">No Fix Available</div>`
      : "";
  },
  buildBreakingFix: (vul) => {
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
  buildVunerability: (vul, hasDepenciesList, via) => {
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
  buildSeverity: (hasDepenciesList, vul, via) => {
    return severityTag(hasDepenciesList ? vul.severity : via.severity);
  },
  buildScore: (via) => {
    return via.cvss && via.cvss.score
      ? `<div class='bdg-sm'>Score: <span><b>${via.cvss.score}</b>/10</span></div>`
      : "";
  },
  buildPackage: (vul, isBooleanFix) => {
    return `<div>
              ${REPORT_UTIL.buildPackageName(vul)}
              <span class='color-grey'><i>v${vul.range}</i></span>
            </div>
            ${REPORT_UTIL.buildIsFixAvailable(isBooleanFix, vul)}
            <div class='mt-2'>
              ${REPORT_UTIL.buildBreakingFix(vul)}
            </div>`;
  },
  buildPackageName: (vul) => {
    return `<b>${renderNPMViewerLink(vul.name)}</b>`;
    //return `<b><a href='https://www.npmjs.com/package/${vul.name}' class='no-link'>${vul.name}</a></b>`;
  },
  getCWEValue: (cweList) => {
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
  getVulnerabilitiesValue: (vul) => {
    let vulArr = [];
    if (vul.via instanceof Array) {
      vulArr = vul.via.map((via, index) => {
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
  getVulnerabilitiesText: (vul) => {
    if (vul.via instanceof Array) {
      let directVul = [];
      let dependentVul = [];
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
  getVulnerabilitiesCount: (vul) => {
    if (vul.via instanceof Array) {
      return vul.via.length;
    }
    return 0;
  }
};

const isLowerVersion = (version1, version2) => {
  return semver.lt(version1, version2);
};

const getScanningHTML = (text) => {
  return `<div class='loader-wrapper box-1 mb-2'>
    <div class="loader"></div>
    <p class='loader-text'>Scanning ${text}...</p>
  </div>`;
};

const getLoaderWithText = (size, text) =>
  `<div class='small-loader-wrapper'>
      <span class="loader-small mr-1" 
            style="width: ${size || "20"}px; height: ${size || "20"}px;"></span>
      ${text}
   </div>`;

const getScanningHTMLSmall = (width, height) =>
  `<div class='small-loader-wrapper'><div class="loader-small" style="width: ${
    width || "20"
  }px; height: ${height || "20"}px;"></div></div>`;

const getSearchingHTML = (text) => {
  return `<div class='loader-wrapper box-1 mb-2'>
    <div class="loader"></div>
    <p class='loader-text'>${text}...</p>
  </div>`;
};

const getPackageJSON = async (file) => {
  const content = await getFileContent(file);
  if (!content) {
    return null;
  }

  return JSON.parse(content);
};

const writeFile = (filePath, fileContent) => {
  try {
    ensureDirectoriesExist(filePath);
    fs.writeFileSync(filePath, fileContent);
    return true;
  } catch (e) {
    logErrorMsg(`Error writing file: ${filePath}.`);
    return false;
  }
};

function ensureDirectoriesExist(filePath) {
  const dir = path.dirname(filePath);
  if (fs.existsSync(dir)) {
    return true;
  }
  ensureDirectoriesExist(dir); // recursively ensure parent directories exist
  fs.mkdirSync(dir);
}

const getApplicationMeta = async (webRenderer) => {
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
    appVersion: version,
    appDescription: description,
    appTotalDep: devDependencies
      ? Object.keys(devDependencies).length
      : 0 + dependencies
      ? Object.keys(dependencies).length
      : 0 + peerDependencies
      ? Object.keys(peerDependencies).length
      : 0
  };
};

const svgIconForInstall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1 15.293V7h2v10.293l2.146-2.147 1.414 1.414-4.5 4.5-4.5-4.5 1.414-1.414L11 17.293z"/>
</svg>`;

const formatNumber = (num) => {
  if (!num) {
    return 0;
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

const filterBySeverity = (vulnerabilityList, vulnerabiliy) => {
  return vulnerabilityList.filter((pck) => pck.severity == vulnerabiliy);
};

const onylFileName = (fileName) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  fileName = fileName.replace(`${workspaceFolder}\\`, "");
  return fileName;
};

const deleteFolderRecursive = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {});
  }
};

const convertSeconds = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h:${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m`;
};

const checkedIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#4CAF50" d="M19,3H5c-1.1,0-1.99,0.9-1.99,2L3,19c0,1.1,0.89,2,1.99,2H19c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M9,17L5,13l1.41-1.41L9,14.17l6.59-6.59L17,8L9,17z"/>
</svg>
`;

const unCheckedIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#757575" d="M19,3H5c-1.1,0-1.99,0.9-1.99,2L3,19c0,1.1,0.89,2,1.99,2H19c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z"/>
</svg>`;

const crossIconCircle = (width) => `<svg width="${width || 24}px" height="${
  width || 24
}px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="red" stroke-width="2" fill="none"/>
  <line x1="8" y1="8" x2="16" y2="16" stroke="red" stroke-width="2"/>
  <line x1="8" y1="16" x2="16" y2="8" stroke="red" stroke-width="2"/>
</svg>`;

const progressIcon = (
  width
) => `<svg width="${width}" height="${width}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="9.915" fill="none" stroke="#eee" stroke-width="3"/>
  <circle cx="12" cy="12" r="9.915" fill="none" stroke="#00aaff" stroke-width="3" 
          stroke-dasharray="75, 100" stroke-dashoffset="25"/>
</svg>
`;

const crossIcon = (
  size
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${
  size || 24
}" height="${size || 24}">
  <path fill="none" stroke="#000" stroke-width="2" d="M18 6L6 18M6 6l12 12"/>
</svg>`;

const installIcon = (
  size
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${
  size || 24
}" height="${size || 24}">
  <rect x="3" y="8" width="18" height="10" rx="2" fill="#dfdf80"/>
  <path d="M12 16l-4-4h3V3h2v9h3z" fill="#7240cc"/>
</svg>`;

const icreonIcon = (fillColor) => `<svg
                id="Layer_1"
                data-name="Layer 1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1616.771 606.445"
                preserveAspectRatio="none">
                <path
                    fill='${fillColor}'
                    d="M584.849,374.7l-18.03-48.138,4.26-.513c26.254-6.925,44.141-28.562,44.141-59.72,0-38.658-27.7-63.469-65.489-63.469H471.259V404.809h31.446V329.8h33.724l28.086,74.983,50.705.027V374.7H584.849ZM502.705,231.421h42.987c23.368,0,38.082,12.694,38.082,34.908,0,22.5-15,35.2-38.082,35.2H502.705Z"
                />
                <path fill='${fillColor}' d="M203.826,202.86h31.447V404.809H203.826Z" />
                <path
                    fill='${fillColor}'
                    d="M255.752,303.835c0-57.412,43.275-103.86,101.551-103.86,45.872,0,83.088,28.561,95.781,68.374H419.907C408.945,244.4,385.576,229.4,357.88,229.4c-41.543,0-70.971,33.466-70.971,74.144,0,40.967,29.716,74.721,70.971,74.721,27.407,0,50.776-15,61.45-38.659h33.754c-12.981,39.524-49.909,68.085-95.781,68.085C299.027,407.693,255.752,361.246,255.752,303.835Z"
                />
                <path
                    fill='${fillColor}'
                    d="M639.74,202.86H768.987v29.427h-97.8v56.257h88.857v27.7H671.187v59.142h97.8v29.427H639.74Z"
                />
                <path
                    fill='${fillColor}'
                    d="M779.374,303.835c0-57.412,43.276-103.86,101.552-103.86s101.551,46.448,101.551,103.86S939.2,407.693,880.926,407.693,779.374,361.246,779.374,303.835Zm171.656,0c0-40.967-30.292-73.567-70.1-73.567s-70.394,32.6-70.394,73.567,30.581,73.278,70.394,73.278S951.03,344.8,951.03,303.835Z"
                />
                <polygon
                    fill='${fillColor}'
                    points="1106.181 404.782 1165.671 404.809 1165.671 202.86 1135.378 202.86 1135.378 374.7 1126.515 374.7 1062.16 202.886 1002.669 202.86 1002.669 404.809 1032.962 404.809 1032.962 232.969 1041.826 232.969 1106.181 404.782"
                />
                <path
                    fill="#386aff"
                    d="M1364.748,287.6H1232.143v32.7h132.605Zm25.161,9.029,23.12-23.119-93.324-93.325-.442-.441-23.12,23.119,93.324,93.324Zm-93.325,107.74-.441.442,23.12,23.12,93.324-93.324.442-.443-23.12-23.119Z"
                />
            </svg>
        `;

const formatDate = (dateObj) => {
  return new Date(dateObj).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
};

const timeAgo = (date) => {
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

const isStringifiedObject = (value) => {
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

const runNPMCommandWithoutPlatform = (webRenderer, command, cb) => {
  const workingDir = dirname(webRenderer.packageLockFile.uri.path.substring(1));
  const exec = util.promisify(require("child_process").exec);

  try {
    exec(command, {
      windowsHide: true,
      cwd: workingDir
    })
      .then((result) => {
        cb &&
          cb(
            true,
            isStringifiedObject(result.stdout)
              ? JSON.parse(result.stdout)
              : result.stdout || result
          );
      })
      .catch((e) => {
        cb && cb(true, e);
      });
  } catch (output) {
    cb && cb(false, output);
  }
};

const runNPMCommand = (webRenderer, command, cb) => {
  const workingDir = dirname(webRenderer.packageLockFile.uri.path.substring(1));
  const exec = util.promisify(require("child_process").exec);

  try {
    exec(command + (process.platform !== "win32" ? "/" : "") + workingDir, {
      windowsHide: true,
      cwd: workingDir
    })
      .then((result) => {
        cb &&
          cb(
            true,
            isStringifiedObject(result.stdout)
              ? JSON.parse(result.stdout)
              : result.stdout || result
          );
      })
      .catch((e) => {
        cb && cb(true, e);
      });
  } catch (output) {
    cb && cb(false, output);
  }
};

const PILLS = {
  renderPill: (val, label, showZero, severity, tooltip, hideTooltip) => {
    if (!val && !showZero) {
      return "";
    }

    return `<div class='vul-pill vul-pill-${severity.toLowerCase()}' 
    ${!hideTooltip ? `data-tooltip="${tooltip || severity}"` : ""} >
        <div class='label'>${label}</div>
        <div class='value'>${formatNumber(val)}</div>
      </div>`;
  },
  SUCCESS: (val, label, showZero, tooltip, hideTooltip) => {
    return PILLS.renderPill(
      val,
      label,
      showZero,
      SEVERITY_TYPE.SUCCESS,
      tooltip,
      hideTooltip ?? true
    );
  },
  GENERAL: (val, label, showZero, tooltip, hideTooltip) => {
    return PILLS.renderPill(
      val,
      label,
      showZero,
      SEVERITY_TYPE.GENERAL,
      tooltip,
      hideTooltip ?? true
    );
  },
  SEVERITY: {
    CRITICAL: (val, label, showZero, tooltip, hideTooltip) => {
      return PILLS.renderPill(
        val,
        label === undefined ? "C" : label,
        showZero,
        SEVERITY_TYPE.CRITICAL,
        tooltip,
        hideTooltip
      );
    },
    HIGH: (val, label, showZero, tooltip, hideTooltip) => {
      return PILLS.renderPill(
        val,
        label === undefined ? "H" : label,
        showZero,
        SEVERITY_TYPE.HIGH,
        tooltip,
        hideTooltip
      );
    },
    MODERATE: (val, label, showZero, tooltip, hideTooltip) => {
      return PILLS.renderPill(
        val,
        label ?? "M",
        showZero,
        SEVERITY_TYPE.MODERATE,
        tooltip,
        hideTooltip
      );
    },
    LOW: (val, label, showZero, tooltip, hideTooltip) => {
      return PILLS.renderPill(
        val,
        label ?? "L",
        showZero,
        SEVERITY_TYPE.LOW,
        tooltip,
        hideTooltip
      );
    },
    INFO: (val, label, showZero, tooltip, hideTooltip) => {
      return PILLS.renderPill(
        val,
        label,
        showZero,
        SEVERITY_TYPE.INFO,
        tooltip,
        hideTooltip
      );
    },
    NO_VULNERABILITY: `<div class='pill-sm white-space-no-wrap box-success-alt text-center' data-tooltip='No Vulnerabilities'>No Vulnerability</div>`,
    TOTAL: (val) =>
      `<div class='severity-box severity-info' data-tooltip="Total">${val}</div>`,
    GENERAL: (val) => {
      return `<div class='severity-box'>${val}</div>`;
    }
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const sortVersions = (versions) => {
  const versionStrings = Object.keys(versions);
  return versionStrings.sort((a, b) => semver.compare(b, a));
};

const hrDivider = `<div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px; margin-top: 15px"></div>`;

const getPackageId = (pckName, version) => {
  return `${pckName || ""}_${version || ""}`
    .toString()
    .replace(/\@/g, "_")
    .replace(/\./g, "_")
    .replace(/\-/g, "_")
    .replace(/\^/g, "_");
};

const containsLicense = (content) => {
  return /MIT License|Apache License|GNU General Public License|Creative Commons/i.test(
    content
  );
};

const getFileExtension = (filename) => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1] : "";
};

const extractPackages = (dependencies, packages = {}) => {
  for (const [name, info] of Object.entries(dependencies)) {
    let pkgName = name;

    if (name.indexOf("@") > -1) {
      pkgName = `@${name.split("@")[1]}`;
    } else {
      pkgName = name.split("/").pop();
    }

    packages[pkgName] = info?.version || info;

    if (info.dependencies) {
      extractPackages(info.dependencies, packages);
    }
  }
  return packages;
};

const getDirectPackages = (webRenderer) => {
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

const cleanVersion = (version) => {
  if (!version) {
    return "";
  }

  return version.replace("~", "").replace("^", "");
};

const renderAccordianItem = (id, headerContent, accordianContent) => `
<div class="accordion-item" id="${id}_accordian_item">
    <button class="accordion-header">
        <div class='summary-box'>
            ${headerContent}
        </div>
      <span class="icon">+</span>
    </button>
  
    <div class="accordion-content">
      ${accordianContent}
    </div>
</div>`;

const runOtherExtensionCommand = async (command, ...data) => {
  try {
    await vscode.commands.executeCommand(command, ...data);
  } catch (e) {
    vscode.window.showInformationMessage("Error running command.");
  }
};

const renderNPMViewerLink = (pkgName) => `<a href='javascript:void(0)' 
           class='internal-link'
           onclick="openNPMViewer('${pkgName}')">
             ${pkgName}
        </a>`;

const initializeAppInfo = async (webRenderer) => {
  let view = {};
  webRenderer.setReportData(view);

  const applicationMeta = await getApplicationMeta(webRenderer);
  if (applicationMeta) {
    const { appName, appVersion, appDescription, appTotalDep } =
      applicationMeta;
    view = { ...view, appName, appVersion, appDescription, appTotalDep };
    webRenderer.setAppMetaData(applicationMeta);
  }
};

const getFileDataFromExtension = async (
  extensionPath,
  filePath,
  returnFormat
) => {
  const contentFilePath = path.join(extensionPath, filePath);
  return getFileData(contentFilePath, returnFormat);
};

const getExtensionFileSrc = (extensionPath, panel, resourcePath) => {
  if (!extensionPath || !panel || !resourcePath) {
    return "";
  }

  const stylePath = path.resolve(extensionPath, resourcePath);
  return panel.webview.asWebviewUri(vscode.Uri.file(stylePath));
};

const httpAPI = (requestUrl, method, postData) => {
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
    const req = httpType.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve(json || {});
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Failed : ${res.statusCode}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
};

const renderPackageScripts = (webRenderer) => {
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

const initWebRenderer = async (webRenderer, context, uri, pckName) => {
  // await context.globalState.update(LOCAL_STORAGE.VULNERABILITIES, undefined);

  if (webRenderer.initialized) {
    webRenderer.pckName = pckName;
    return webRenderer;
  }

  webRenderer.initialized = true;
  const parentPath = path.dirname(uri.fsPath);

  await webRenderer.init(context);

  webRenderer.pckName = pckName;
  webRenderer.pkgJSON = await getPackageJSON(
    await findFile("package.json", parentPath)
  );
  webRenderer.packageLockFile = await findFile("package-lock.json", parentPath);

  webRenderer.parentPath = dirname(
    webRenderer.packageLockFile?.uri?.path.substring(1)
  );

  webRenderer.extensionPath = context.extensionPath;
  webRenderer.uri = uri;

  let packageLockContent = await getPackageJSON(
    await findFile("package-lock.json", parentPath)
  );

  if (packageLockContent) {
    webRenderer.packagesWithVersion = extractPackages(
      packageLockContent.packages
    );
  }

  NODE_API.getVul((resp) => {
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

const getFileTypeByExt = (ext) => {
  switch (ext) {
    case "ts":
    case "tsx":
      return "TypeScript";

    case "js":
    case "jsx":
      return "JavaScript";

    case "css":
      return "CSS";

    case "scss":
      return "SCSS";

    default:
      return ext;
  }
};

const installExtension = async (extensionID, extensionName, cb) => {
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

const getExtenConfigValue = (configName, defaultValue) => {
  const config = vscode.workspace.getConfiguration(extensionPrefix);
  return config.get(configName) || defaultValue;
};

const NODE_API = {
  getVulnerabilityURL: () =>
    getExtenConfigValue(`${EXTENSION_CONFIG.API_URL.VULNERABILITY}`),
  geProjectStatURL: () =>
    getExtenConfigValue(`${EXTENSION_CONFIG.API_URL.PROJECT_STATS}`),
  getVul: (cb) => {
    const apiURL = NODE_API.getVulnerabilityURL();
    if (!apiURL) {
      return;
    }

    httpAPI(`${apiURL}`).then((resp) => {
      cb && cb(resp);
    });
  },
  saveVul: (vulList) => {
    const apiURL = NODE_API.getVulnerabilityURL();
    if (!apiURL) {
      return;
    }

    httpAPI(`${apiURL}`, "POST", JSON.stringify({ data: vulList }));
  },
  sendProjectStat: (webRenderer) => {
    const apiURL = NODE_API.geProjectStatURL();
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
    );
  }
};

const getAllFilesOfFolder = (dirPath, allowedExtension) => {
  const ignoreFolders = IGNORE_PATHS.FOLDER;
  const ignoreFiles = IGNORE_PATHS.FILES;
  const items = fs.readdirSync(dirPath);
  let allFiles = [];
  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoreFolders.includes(item)) {
        allFiles = [
          ...allFiles,
          ...getAllFilesOfFolder(fullPath, allowedExtension)
        ];
      }
    } else {
      if (!ignoreFiles.includes(item)) {
        const ext = getFileExtension(item);
        if (allowedExtension.includes(ext)) {
          allFiles = [...allFiles, { name: item, fullPath }];
        }
      }
    }
  });

  return allFiles;
};

const generateTree = (dirPath, allowedExtension) => {
  const ignoreFolders = IGNORE_PATHS.FOLDER;
  const ignoreFiles = IGNORE_PATHS.FILES;
  const items = fs.readdirSync(dirPath);
  const tree = [];

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoreFolders.includes(item)) {
        tree.push({
          name: item,
          type: "folder",
          fullPath: fullPath,
          children: generateTree(fullPath)
        });
      }
    } else {
      if (!ignoreFiles.includes(item)) {
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

const renderTree = (outputArr, data) => {
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

module.exports = {
  logMsg,
  logErrorMsg,
  confirmMsg,
  findFile,
  getFileContent,
  openFile,
  registerCommand,
  convertObjectToArray,
  sortByKey,
  severityTag,
  isDarkTheme,
  REPORT_UTIL,
  isLowerVersion,
  getScanningHTML,
  getScanningHTMLSmall,
  getPackageJSON,
  getApplicationMeta,
  svgIconForInstall,
  findFileInParentFolders,
  formatNumber,
  filterBySeverity,
  onylFileName,
  deleteFolderRecursive,
  convertSeconds,
  checkedIcon,
  unCheckedIcon,
  removeExtensionState,
  appendInExtensionState,
  readFromExtensionState,
  saveVulDataInExtensionState,
  crossIconCircle,
  progressIcon,
  crossIcon,
  installIcon,
  icreonIcon,
  formatDate,
  timeAgo,
  getPackageId,
  hrDivider,
  sortVersions,
  formatBytes,
  PILLS,
  runNPMCommand,
  runNPMCommandWithoutPlatform,
  logInFile,
  containsLicense,
  getFileExtension,
  extractPackages,
  getDirectPackages,
  cleanVersion,
  renderAccordianItem,
  runOtherExtensionCommand,
  renderNPMViewerLink,
  getSearchingHTML,
  isStringifiedObject,
  initializeAppInfo,
  getFileDataFromExtension,
  httpAPI,
  writeFile,
  checkIfFileExist,
  initWebRenderer,
  renderPackageScripts,
  getFileTypeByExt,
  installExtension,
  getFileData,
  generateTree,
  getAllFilesOfFolder,
  renderTree,
  getLoaderWithText,
  getExtenConfigValue,
  getExtensionFileSrc,
  NODE_API,
  GLOBAL_STATE_MANAGER
};
