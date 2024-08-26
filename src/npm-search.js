const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const util = require("util");
const MAX_VERSION_COUNT = 5;
const { KNOWLEDGE_CENTER, LOCAL_STORAGE, SOURCE_TYPE } = require("./constants");

const {
  checkedIcon,
  getScanningHTMLSmall,
  crossIcon,
  formatDate,
  getSearchingHTML,
  runNPMCommand,
  hrDivider,
  isStringifiedObject,
  formatBytes,
  sortVersions,
  PILLS,
  appendInExtensionState,
  readFromExtensionState,
  crossIconCircle,
  removeExtensionState,
  installIcon,
  formatNumber,
  getPackageId,
  timeAgo,
  getApplicationMeta,
  initializeAppInfo,
  httpAPI,
  logMsg,
  renderPackageScripts,
  NODE_API
} = require("./util");
const { marked } = require("marked");

const getWebviewContent = () => {
  let viewStr = `
    <div class='npm-search' id='npm_search'>
        <h1>Search NPM Package</h1>
        <div class='flex-group flex-justify-center mb-2'>
            <div class='search-input-box'>
                <input type='text' class='npm-search-input' 
                        onkeypress="handleNPMSearchKeyPress(event)"
                        onkeyup="debounceInputChange(event)"
                        id='npm_search_input'
                        placeholder='Search npm package...' />
                  <button class='action-button' onclick="searchNPMPackage()">Search</button>
            </div>
        </div>
        <div id='npm_recent_search' class='npm-recent-search'></div>
      </div>

      <div class='flex-group mb-2 npm-result' id='npm_result_section' style="display:none" >
        <div class='flex-1' id='npm_search_result' style="display:none" ></div>
        <div id='npm_package_info' class='w-100'>
          <div class='flex-group mb-2 npm-package-info'>
            <div class='flex-1 info-left'>
              <div id='npm_package_basic_info' class='p-2'></div>
              <div id='npm_package_readme' class='code-snippet p-2'></div>
            </div>
            <div class='flex-1 info-right' id='npm_package_detail'></div>
          </div>
        </div>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', function() {
          toggleLeftMenuItem('li_npm_search');
        });
      </script>
   `;

  return viewStr;
};

const vulnerabilityColumn = (pkgName, version, vulObj) => {
  let vulScanHTML = `<button type='button'
                               class='simple-btn hide-on-browser-1 float-left'
                               onclick="checkPckVulSingle('${pkgName}', '${version}')" >Scan
                      </button>`;

  if (!vulObj) {
    return vulScanHTML;
  }

  let vulBtnHtml = `
    <div class='text-sm grey-header'>
      ${`Scanned: ${formatDate(vulObj.ts)}`}
    </div>`;

  vulBtnHtml += `<div class='flex flex-gap-5 flex-justify-start'>`;

  if (vulObj.t === 0) {
    vulBtnHtml += `${PILLS.SEVERITY.NO_VULNERABILITY}`;
  } else {
    vulBtnHtml += `
        ${PILLS.SEVERITY.CRITICAL(vulObj.c, "C", true)}
        ${PILLS.SEVERITY.HIGH(vulObj.h, "H", true)}
        ${PILLS.SEVERITY.MODERATE(vulObj.m, "M", true)}
        ${PILLS.SEVERITY.LOW(vulObj.l, "L", true)}
        `;
  }

  vulBtnHtml += `${vulScanHTML}</div>`;

  return vulBtnHtml;
};
const versionTableTR = (pkg, index, parentPath, vulCache) => {
  if (pkg) {
    const id = getPackageId(pkg.name, pkg.version);
    let vulBtnHtml = vulnerabilityColumn(pkg.name, pkg.version, null);

    if (vulCache) {
      const foundItem = vulCache.find((vul) => vul.id === id);
      if (foundItem) {
        vulBtnHtml = vulnerabilityColumn(pkg.name, pkg.version, foundItem);
      }
    }

    const isDeprecated = Boolean(pkg.deprecated);
    const deprecatedCls = isDeprecated ? "text-critical" : "";

    return `<tr id='tr_vul_ver_${index}' class='box-1 version_list_item mb-1 ${
      index > MAX_VERSION_COUNT ? "hidden-row" : ""
    }'>
    
    <td class='version-number ${deprecatedCls}'>
        
      ${
        isDeprecated
          ? `<div class='${deprecatedCls}' data-tooltip='${pkg.deprecated}'>${pkg.version}</div>`
          : `<span class='text-green'>${pkg.version}</span>`
      }

      <div class='hint'>${timeAgo(pkg.publishedDate)}</div>
        
    </td>

    <td class='text-center'>
      <div class='flex flex-gap-10'>
          <div class='flex flex-justify-center mb3px' id='td_${id}_prod_dep'>
              <button type='button' 
                class='icon-btn install-btn
                hide-on-browser-1' 
                data-tooltip='Install as Prod Dependency'
                onclick="installPackage('${pkg.name}','${
      pkg.version
    }','prod','${parentPath}')">
                  <span class='mr-1'>${installIcon(20)}</span> Prod
              </button>
          </div>

          <div class='flex flex-justify-center mb3px' id='td_${id}_dev_dep'>
            <button type='button'
              class='icon-btn install-btn hide-on-browser-1'
              data-tooltip='Install as Dev Dependency'
              onclick="installPackage('${pkg.name}','${
      pkg.version
    }','dev','${parentPath}')" 
            >
            <span class='mr-1'>${installIcon(20)}</span> Dev
          </button>
        </div>
      </div>
    </td>
    
    <td id='td_${id}_vul'>
      ${vulBtnHtml}
    </td>
  </tr>`;
  }

  return "";
};

const renderPackageInfo = async (webRenderer, pck) => {
  // await webRenderer.context.globalState.update(
  //   LOCAL_STORAGE.VULNERABILITIES,
  //   undefined
  // );

  if (!pck) {
    webRenderer.sendMessageToUI("npmPackageInfoContentLoader", {
      htmlContent: `<div  class='flex-1'>
      <div class='npm-search-item'>
         No matching package found.
      </div>
    </div>`
    });
    return;
  }

  if (pck) {
    const vulCache = await readFromExtensionState(
      LOCAL_STORAGE.VULNERABILITIES,
      webRenderer.context
    );

    let htmlStr = `<div>`;
    let basicInfoStr = ``;

    let versions = [];
    let latestVersion = {};
    let versionKeys = [];

    if (pck.versions) {
      versionKeys = sortVersions(pck.versions);
      versionKeys.map((key) => {
        versions = [
          ...versions,
          { ...pck.versions[key], publishedDate: pck.time[key] }
        ];
      });
      latestVersion = pck.versions[versionKeys[0]];
    }

    htmlStr += `
      <div class='flex-1'>
        <div class='label-value-group'>
              <div class='label'>Latest Version</div>
              <div class='value'>${latestVersion.version}
        </div>
      </div>

        <div class='label-value-group'>
              <div class='label'>Last Published</div>
              <div class='value'>${formatDate(
                pck.time[latestVersion.version]
              )}</div>
        </div>

          <div class='label-value-group'>
              <div class='label'>Weekly Downloads</div>
              <div class='value'><div id='weekly_download_${
                pck.name
              }'></div></div>
        </div>
        <div class='label-value-group'>
              <div class='label'>Total Files</div>
              <div class='value'>
                ${
                  latestVersion.dist
                    ? `${
                        latestVersion.dist.fileCount || 0
                      } files of ${formatBytes(
                        latestVersion.dist.unpackedSize || 0
                      )}`
                    : ""
                }
              </div>
        </div>

        <div class='label-value-group'>
              <div class='label'>Dependencies</div>
              <div class='value'>
                ${Object.keys(latestVersion.dependencies || {}).length}
              </div>
        </div>
      </div>`;

    htmlStr += `<div class='flex-1'>`;

    if (versionKeys && versionKeys.length > 0) {
      htmlStr += `
      <div>
        <div class='label-value-group'>
            <div class='label'>Versions</div>
            <div class='value'>${versions.length}</div>
        </div>

        <div id='install_error' style='display:none' class='text-danger'></div>
        <div id='vul_error' style='display:none' class='text-danger'></div>

      <div class='fixed-height-div'>
      <div class='hint text-critical mt-2'># <b>Deprecated</b> versions are displayed in red color.</div>
      ${hrDivider}
      `;

      htmlStr += `<table class='table table-striped table-bordered table-sm simple-table version-table'>
      <tr>
        <th style='min-width:65px' class='text-align-left'>Version</th>
        <th style='min-width:80px' class='text-center'>Install</th>
        <th>Vulnerabilities</td>
      </tr>`;

      versions.map((version, index) => {
        htmlStr += versionTableTR(
          version,
          index,
          webRenderer.parentPath,
          vulCache
        );
      });

      htmlStr += `</table>`;
      if (versionKeys.length > MAX_VERSION_COUNT) {
        htmlStr += `<div>
          <button id='vul_more_rows' class='action-button' onclick='toggleVersionMoreLess(${MAX_VERSION_COUNT})'>Show more versions.</button>
        </div>`;
      }

      htmlStr += `
        </div>
      </div>`;
    }

    htmlStr += `</div>`;
    htmlStr += `</div>
    </div>
    `;

    htmlStr += `
    </div>
  `;

    basicInfoStr = `<div class='basic-info'>`;
    basicInfoStr += `
    <div>
      <h1>${pck.name}</h1>
    </div>

    ${
      pck.description ? `<div class='description'>${pck.description}</div>` : ""
    }`;

    basicInfoStr += `<div class='flex-group'><div>License: <b>${
      pck.license || "No License Found"
    }</b></div> | `;

    if (pck.homepage) {
      basicInfoStr += `<div><a href='${pck.homepage}'>Website</a> </div>`;
    }

    if (pck.repository && pck.repository.url) {
      let repoURL = pck.repository.url;
      const repoType = pck.repository.type;
      if (repoType === "git") {
        repoURL = repoURL.replace("git+", "").replace(".git", "");
      }
      basicInfoStr += `<div> | <a href='${repoURL}'>Repository</a> </div>`;
    }

    basicInfoStr += `</div>${hrDivider}</div>`;

    webRenderer.sendMessageToUI("npmPackageInfoContent", {
      htmlContent: htmlStr,
      basicInfo: basicInfoStr,
      readMeContent:
        pck.readme === "ERROR: No README data found!"
          ? "This package does not have a README."
          : marked(pck.readme)
    });
  }
};

const renderRecentViewed = async (webRenderer) => {
  const resp = await readFromExtensionState(
    LOCAL_STORAGE.RECENT_PACKAGE_VIEWED,
    webRenderer.context
  );

  if (resp && Array.isArray(resp) && resp.length > 0) {
    let htmlStr = `<div class='flex-group flex-align-center'>
        <div class="grey-header mr-2">Recently viewed</div>
    `;
    resp.map((pck) => {
      htmlStr += `
      <div class='recent-search-box'>
          <button type='button' class='link-btn' onclick="showPackageInfo('${
            pck.packageName
          }')">${pck.packageName}</button>
          <button type='button' class='cross-btn' onclick="removeFromRecent('${
            pck.packageName
          }')">${crossIcon(15)}</div>
      </div>
        `;
    });

    htmlStr += `</div>`;

    webRenderer.sendMessageToUI("npmSearchRecentViewed", {
      htmlContent: htmlStr
    });
  }
};

const renderNPMSearch = async (webRenderer, fileURI) => {
  vscode.workspace.openTextDocument(fileURI).then(async (document) => {
    await initializeAppInfo(webRenderer);

    let content = getWebviewContent();
    webRenderer.content = content;
    webRenderer.renderContent(
      content,
      KNOWLEDGE_CENTER.TITLE,
      SOURCE_TYPE.PROJECT
    );
    renderRecentViewed(webRenderer);
  });
};

const packageItemHTML = (pck, exactMatch) => {
  const pkg = pck.package;
  let htmlStr = ``;
  htmlStr += `

  
<div class='flex-1 npm-search-item cursor-pointer ${
    exactMatch ? "exact-match" : ""
  }' onclick="showPackageInfo('${pkg.name}')">
      <div class='pck-info'>
          <div class='flex flex-space-between' style='height:20px'>
            <a href='javascript:void(0)' class='a-blue-bold' >
                 ${pkg.name}@${pkg.version}
            </a>

            ${
              exactMatch && pkg.author
                ? `<div class='author'> by ${pkg.author.name || ""}</div>`
                : ""
            }            
          </div>

          ${
            pkg.description
              ? `<div class='description'>${pkg.description}</div>`
              : ""
          }`;

  if (exactMatch) {
    htmlStr += `
          <div class='published-on'>
            Last Published: ${formatDate(pkg.date)}
          </div>`;

    const links = Object.keys(pkg.links);
    if (links.length > 0) {
      htmlStr += `<div>`;
      links.map((lnk) => {
        htmlStr += `<a href='${pkg.links[lnk]}' class='link'>${lnk}</a>`;
      });
      htmlStr += `</div>`;
    }
  }

  htmlStr += `
  <div class='flex quality-info'>
    <div class="info-container">
      <div class="info-bar" style="--value: ${pck.score.detail.quality};"></div>
      <div class="info-label">Quality: 
      ${(pck.score.detail.quality || 0).toFixed(2)}</div>
    </div>
    
    <div class="info-container">
      <div class="info-bar" style="--value: ${
        pck.score.detail.popularity
      };"></div>
      <div class="info-label">Popularity: ${(
        pck.score.detail.popularity || 0
      ).toFixed(2)}</div>
    </div>
  
    <div class="info-container">
      <div class="info-bar" style="--value: ${
        pck.score.detail.maintenance
      };"></div>
      <div class="info-label">Maintenance: ${(
        pck.score.detail.maintenance || 0
      ).toFixed(2)}</div>
    </div>
  </div>
  `;

  htmlStr += `</div>
    </div>`;

  return htmlStr;
};

const renderSearchResult = (webRenderer, searchTerm, result) => {
  let htmlStr = `
  <div>`;

  if (result && result.length > 0) {
    searchTerm = (searchTerm || "").toLowerCase();
    let packageList = [...result];
    const isExactPackage = packageList.findIndex(
      (pck) => pck.package.name === searchTerm
    );

    if (isExactPackage > -1) {
      htmlStr += `<div class='mb-2'>
        <h4 class='grey-header'>Exact match found.</h4>
        ${packageItemHTML(packageList[isExactPackage], true)}
      </div>`;

      packageList.splice(isExactPackage, 1);
    } else {
      htmlStr += `<h4 class='text-danger mb-2'>No exact match Found.</h4>`;
    }

    if (packageList.length > 0) {
      htmlStr += `<div style="border-bottom: 1px solid #8b8989; margin-bottom: 15px"></div>`;
      htmlStr += `<h4 class='grey-header'>(${packageList.length}) related matches found.</h4>`;
      htmlStr += `<div class='npm-search-result'>`;

      packageList.map((pck) => {
        htmlStr += packageItemHTML(pck, false);
      });

      htmlStr += `</div>`;
    }
  } else {
    htmlStr += `
    <div  class='flex-1'>
      <div class='npm-search-item'>
         No matching package found.
      </div>
    </div>
    `;
  }

  htmlStr += `
    </div>
  `;

  webRenderer.sendMessageToUI("npmSearchResultContent", {
    htmlContent: htmlStr
  });
};

const removeFromRecent = (webRenderer, packageName) => {
  removeExtensionState(
    LOCAL_STORAGE.RECENT_PACKAGE_VIEWED,
    packageName,
    "packageName",
    webRenderer.context
  ).then(() => {
    renderRecentViewed(webRenderer);
  });
};

const showNPMPackageInfo = (webRenderer, packageName) => {
  webRenderer.sendMessageToUI("npmPackageInfoContentLoader", {
    htmlContent: getSearchingHTML("Fetching package information")
  });

  appendInExtensionState(
    LOCAL_STORAGE.RECENT_PACKAGE_VIEWED,
    [{ packageName }],
    "packageName",
    webRenderer.context
  ).then(() => {
    renderRecentViewed(webRenderer);
  });

  const url = `https://registry.npmjs.org/${packageName}`;

  httpAPI(url)
    .then((resp) => {
      renderPackageInfo(webRenderer, resp);
      const url = `https://api.npmjs.org/downloads/point/last-week/${packageName}`;
      httpAPI(url).then((resp) => {
        if (resp) {
          webRenderer.sendMessageToUI("npmPackageInfoDownloadCount", {
            htmlContent: `${formatNumber(resp.downloads || 0)} (${
              resp.downloads || 0
            })`,
            pckName: packageName
          });
        }
      });
    })
    .catch((e) => {
      renderPackageInfo(webRenderer, null);
    });

  // runNPMCommand(
  //   webRenderer,
  //   `npm view ${packageName} --json --prefix `,
  //   (success, resp) => {
  //     if (!success) {
  //       renderPackageInfo(webRenderer, null);
  //       return;
  //     }

  //     renderPackageInfo(webRenderer, resp);
  //   }
  // );

  // const workingDir = dirname(webRenderer.packageLockFile.uri.path.substring(1));

  // const exec = util.promisify(require("child_process").exec);
  // try {
  //   exec(
  //     `npm view ${packageName} --json --prefix ` +
  //       (process.platform !== "win32" ? "/" : "") +
  //       workingDir,
  //     {
  //       windowsHide: true
  //     }
  //   )
  //     .then((result) => {
  //       renderPackageInfo(webRenderer, JSON.parse(result.stdout));
  //     })
  //     .catch((e) => {
  //       renderPackageInfo(webRenderer, null);
  //     });
  // } catch (output) {
  //   renderPackageInfo(webRenderer, null);
  // }
};

const startNPMSearch = async (webRenderer, searchTerm) => {
  webRenderer.sendMessageToUI("npmSearchResultContent", {
    htmlContent: getSearchingHTML(`Searching packages for: ${searchTerm}`)
  });

  const url = `https://registry.npmjs.org/-/v1/search?text=${searchTerm}&size=20`;
  httpAPI(url)
    .then((resp) => {
      renderSearchResult(webRenderer, searchTerm, resp?.objects);
    })
    .catch((e) => {
      renderSearchResult(webRenderer, searchTerm, null);
    });

  // runNPMCommand(
  //   webRenderer,
  //   `npm search ${searchTerm} --json --prefix `,
  //   (success, resp) => {
  //     if (!success) {
  //       renderSearchResult(webRenderer, searchTerm, null);
  //       return;
  //     }

  //     renderSearchResult(webRenderer, searchTerm, resp);
  //   }
  // );
};

const getPackageVul = (context, packageName, version, cb) => {
  const tempDir = path.join(
    context.extensionPath,
    `audit-temp-${new Date().getTime()}`
  );

  fs.mkdirSync(tempDir, { recursive: true });

  const exec = util.promisify(require("child_process").exec);

  try {
    exec(`npm init -y`, { cwd: tempDir })
      .then(() => {
        exec(`npm install ${packageName}@${version}`, { cwd: tempDir })
          .then((result) => {
            exec(`npm audit --json`, { cwd: tempDir })
              .then((auditResult) => {
                cb(
                  true,
                  isStringifiedObject(auditResult.stdout)
                    ? JSON.parse(auditResult.stdout)
                    : auditResult.stdout
                );
                fs.rmSync(tempDir, { recursive: true, force: true });
              })
              .catch((auditErr) => {
                cb(
                  true,
                  isStringifiedObject(auditErr.stdout)
                    ? JSON.parse(auditErr.stdout)
                    : auditErr.stdout
                );
              });
          })
          .catch((installErr) => {
            cb(false, installErr);
          });
      })
      .catch((initErr) => {
        cb(false, initErr);
      });
  } catch (e) {
    cb(false, JSON.stringify(e));
  }
};

const renderVulnerabilityData = (
  webRenderer,
  data,
  forTd,
  pckName,
  version
) => {
  if (!data || Object.keys(data).includes("error")) {
    const errorSummary = data["error"];

    const errorSummaryContent = `
            <div class='flex-1'>
                <h2 class='grey-header'>Vulnerabilities</h2>
                <div class="content">
                  <div class="content-box box box-critical">
                    <div class="field-label">Error running npm auditing</div>
                    <div class="field-value">
                      ${errorSummary.code || "ERROR"}:
                       ${errorSummary.summary || "Error running npm auditing."}
                      </div>
                  </div>
                </div>
            </div>`;

    if (forTd) {
      webRenderer.sendMessageToUI("npmScanNPMVulnerabilityForTDContent", {
        htmlContent: `<div class='flex flex-align-center text-danger' style='width:120px'>${crossIconCircle()} Failed.</div>`,
        error: errorSummaryContent,
        pckName: pckName,
        version: version,
        id: getPackageId(pckName, version)
      });
    } else {
      webRenderer.sendMessageToUI("npmScanNPMVulnerabilityContent", {
        htmlContent: errorSummaryContent
      });
    }

    return;
  }

  let htmlStr = ``;
  const vuls = data.metadata?.vulnerabilities;

  const vulForCache = {
    packageName: pckName,
    version,
    id: getPackageId(pckName, version),
    ts: new Date().toUTCString(),
    c: 0,
    h: 0,
    m: 0,
    l: 0,
    t: 0
  };

  if (vuls.total > 0) {
    vulForCache.c = vuls.critical;
    vulForCache.h = vuls.high;
    vulForCache.m = vuls.moderate;
    vulForCache.l = vuls.low;
    vulForCache.t = vuls.total;
  }

  htmlStr += `${vulnerabilityColumn(pckName, version, vulForCache)}`;

  NODE_API.saveVul([vulForCache]);

  appendInExtensionState(
    LOCAL_STORAGE.VULNERABILITIES,
    [vulForCache],
    "id",
    webRenderer.context
  );

  if (forTd) {
    webRenderer.sendMessageToUI("npmScanNPMVulnerabilityForTDContent", {
      htmlContent: htmlStr,
      error: "",
      pckName: pckName,
      version: version,
      id: getPackageId(pckName, version)
    });
  } else {
    webRenderer.sendMessageToUI("npmScanNPMVulnerabilityContent", {
      htmlContent: htmlStr
    });
  }
};

const scanPackageForVulnerability = (
  webRenderer,
  packageName,
  version,
  forTd
) => {
  if (forTd) {
    webRenderer.sendMessageToUI("npmScanNPMVulnerabilityForTDContent", {
      htmlContent: `<div class='float-left text-center w-100'>
        ${getScanningHTMLSmall(15, 15)}
      </div>`,
      pckName: packageName,
      version: version,
      id: getPackageId(packageName, version)
    });
  } else {
    webRenderer.sendMessageToUI("npmScanNPMVulnerabilityContent", {
      htmlContent: getSearchingHTML(
        `Scanning ${packageName}@${version} package for vulnerabilities.`
      )
    });
  }

  getPackageVul(
    webRenderer.context,
    packageName,
    version,
    (success, result) => {
      if (!success) {
        if (forTd) {
          webRenderer.sendMessageToUI("npmScanNPMVulnerabilityForTDContent", {
            htmlContent: `<div class='flex flex-align-center text-danger' data-tooltip='Failed'>${crossIconCircle()}</div>`,
            error: `<div class='box box-high-alt mb-1'><b>Error running vulnerability scan</b><br/>
            [${JSON.stringify(result)}]</div>`,
            pckName: packageName,
            version: version,
            id: getPackageId(packageName, version)
          });
          return;
        }

        webRenderer.sendMessageToUI("npmScanNPMVulnerabilityContent", {
          htmlContent: `Error running vulnerability scan [${JSON.stringify(
            result
          )}]`
        });
        return;
      }

      renderVulnerabilityData(webRenderer, result, forTd, packageName, version);
    }
  );
};

const installNPMPackage = (webRenderer, packageName, version, type) => {
  webRenderer.sendMessageToUI("npmInstallDependencyForTDContent", {
    htmlContent: `<div class='float-left'>${getScanningHTMLSmall(8, 8)}</div>`,
    id: getPackageId(packageName, version),
    pckName: packageName,
    error: "",
    version,
    type
  });

  let cmd = `npm install ${packageName}@${version} --legacy-peer-deps `;
  if (type === "dev") {
    cmd += `--save-dev`;
  }

  runNPMCommand(webRenderer, cmd, (success, result) => {
    let msg = `<div class='flex flex-align-center text-danger' data-tooltip='Installed successfully.'>${checkedIcon}</div>`;
    let error = "";
    if (!success || result.stderr) {
      msg = `<div class='flex flex-align-center text-danger' data-tooltip='Failed'>${crossIconCircle()}</div>`;
      error = `<div class='box box-high-alt mb-1'><b>Error installing package</b><br/>
      [${JSON.stringify(result)}]</div>`;
    }

    webRenderer.sendMessageToUI("npmInstallDependencyForTDContent", {
      htmlContent: msg,
      error,
      pckName: packageName,
      version,
      type,
      id: getPackageId(packageName, version)
    });
  });
};

module.exports = {
  renderNPMSearch,
  startNPMSearch,
  showNPMPackageInfo,
  scanPackageForVulnerability,
  installNPMPackage,
  removeFromRecent
};
