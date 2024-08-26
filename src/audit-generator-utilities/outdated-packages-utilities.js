const { MSGS, PROJECT_STAT } = require("../constants");

const {
  isLowerVersion,
  svgIconForInstall,
  formatNumber,
  getScanningHTML,
  getScanningHTMLSmall,
  PILLS,
  cleanVersion,
  runNPMCommand,
  installIcon,
  NODE_API
} = require("../util");
const { renderAuditError } = require("./npm-audit-utilities");

const getCurrentVersion = (packageName, packageJSON) => {
  if (!packageJSON) {
    return null;
  }

  const { dependencies, devDependencies, peerDependencies } = packageJSON;

  if (dependencies) {
    if (dependencies[packageName]) {
      return cleanVersion(dependencies[packageName]);
    }
  }

  if (devDependencies) {
    if (devDependencies[packageName]) {
      return cleanVersion(devDependencies[packageName]);
    }
  }

  if (peerDependencies) {
    if (peerDependencies[packageName]) {
      return cleanVersion(peerDependencies[packageName]);
    }
  }

  return null;
};

const SEVERITY = {
  HIGH: 1,
  MEDIUM: 2,
  NORMAL: -1
};

const getOutdatedRow = (type, packages) => {
  return `<tr>
             <td>${type}</td>
             <td class='text-right text-high'>
              ${packages.filter((pck) => pck.severity === SEVERITY.HIGH).length}
             </td>
             <td class='text-right text-moderate'>
              ${
                packages.filter((pck) => pck.severity === SEVERITY.MEDIUM)
                  .length
              }
             </td>
             <td class='text-right'>${packages.length}</td>
          </tr>`;
};
const renderOutdatedPackages = async (webRenderer, data) => {
  if (!data || Object.keys(data).length === 0) {
    webRenderer.sendMessageToUI("outdatedPackageContent", {
      htmlContent: "",
      Count: 0,
      summaryTableData: `<div class='flex-1 box-1'>
              <div class="content">
                  <div class="content-box box box-success-alt">
                    <div class="field-label">Great</div>
                    <div class="field-value">There are no outdated packages.</div>
                 </div>
                </div>
            </div>`
    });

    return;
  }

  if (Object.keys(data).includes("error")) {
    const errorSummary = data["error"];

    const errorSummaryContent = `
            <div class='flex-1'>
                <div class="content">
                  <div class="content-box box box-critical">
                    <div class="field-label">Error finding outdated packages.</div>
                    <div class="field-value">
                      ${errorSummary.code || "ERROR"}:
                       ${
                         errorSummary.summary ||
                         "Error running outdated packages."
                       }
                      </div>
                  </div>
                </div>
            </div>`;

    webRenderer.sendMessageToUI("outdatedPackageContent", {
      htmlContent: null,
      Count: 0,
      summaryTableData: errorSummaryContent
    });

    return;
  }

  const dependencies = Object.keys(webRenderer?.pkgJSON.dependencies || {});
  const devDependencies = Object.keys(
    webRenderer?.pkgJSON.devDependencies || {}
  );
  const peerDependencies = Object.keys(
    webRenderer?.pkgJSON.peerDependencies || {}
  );

  const optionalDependencies = Object.keys(
    webRenderer?.pkgJSON.optionalDependencies || {}
  );

  let listOfPackages = [];
  for (const [key, itm] of Object.entries(data)) {
    const currentVersion =
      itm.current || getCurrentVersion(key, webRenderer?.pkgJSON || null);
    listOfPackages = [
      ...listOfPackages,
      {
        key,
        ...itm,
        current: currentVersion,
        severity: currentVersion
          ? isLowerVersion(currentVersion, itm.wanted)
            ? SEVERITY.HIGH
            : SEVERITY.MEDIUM
          : SEVERITY.MEDIUM,
        type: dependencies.includes(key)
          ? "Prod"
          : devDependencies.includes(key)
          ? "Dev"
          : peerDependencies.includes(key)
          ? "Peer"
          : optionalDependencies.includes(key)
          ? "Optional"
          : ""
      }
    ];
  }

  // listOfPackages.sort((a, b) => a.type.localeCompare(b.type));

  listOfPackages.sort((a, b) => {
    // Compare names first
    if (a.severity < b.severity) return -1;
    if (a.severity > b.severity) return 1;

    // If names are equal, compare ages
    return b.type.localeCompare(a.type);
  });

  listOfPackages = listOfPackages || [];

  const dependencyPackages = listOfPackages.filter(
    (pck) => pck.type === "Prod"
  );
  const devDependencyPackages = listOfPackages.filter(
    (pck) => pck.type === "Dev"
  );

  const peerDependencyPackages = listOfPackages.filter(
    (pck) => pck.type === "Peer"
  );

  const optionalDependencyPackages = listOfPackages.filter(
    (pck) => pck.type === "Optional"
  );

  const totalOutdatedPackages = Object.keys(data).length;

  webRenderer.projectStat[PROJECT_STAT.OUTDATED_PACKAGES] = {
    t: listOfPackages.length,
    c: listOfPackages.filter((pck) => pck.severity === SEVERITY.HIGH).length,
    m: listOfPackages.filter((pck) => pck.severity === SEVERITY.MEDIUM).length,
    prodDeps: dependencyPackages.length,
    devDeps: devDependencyPackages.length,
    peerDeps: peerDependencyPackages.length,
    optionalDeps: optionalDependencyPackages.length,
    ts: new Date().toUTCString()
  };

  NODE_API.sendProjectStat(webRenderer);

  webRenderer.outdatedPackages = listOfPackages;
  let vulStr = `
    <div class='flex-group flex-justify-end hide-on-browser mb-2'>
          <button type='button' 
            class='icon-btn install-btn hide-on-browser' 
            onclick="updateAllPackages('latest','${webRenderer.parentPath}')">
              <span class='mr-1'>
                ${installIcon(20)}
              </span> Update all to &nbsp;<b>latest</b>&nbsp;versions
          </button>

          <button type='button' 
            class='icon-btn install-btn hide-on-browser' 
            onclick="updateAllPackages('wanted','${webRenderer.parentPath}')">
              <span class='mr-1'>
                ${installIcon(20)}
              </span> Update all to&nbsp;<b>Wanted</b>&nbsp;versions
          </button>
        <br/>
    </div>
    `;

  vulStr += `
  <div>
    <div>
      <table class='table table-striped table-bordered table-sm'>
        <tr>
          <th class='text-align-left'>#</th>
          <th class='text-align-left'>Package</th>
          <th style='width:115px'>Current</th>
          <th style='width:130px'>Wanted</th>
          <th style='width:130px'>Latest</th>
          <th style='width:115px'>Type</th>
        </tr>
  `;
  let ctr = 0;

  for (const itm of listOfPackages) {
    if (itm) {
      const severityClass =
        itm.severity === SEVERITY.HIGH ? "text-danger" : "text-warning";

      vulStr += `
    <tr>
      <td>${++ctr}</td>

      <td class='text-align-left'>
        <a class='${severityClass}' 
          href='https://www.npmjs.com/package/${itm.key}' 
          target='_blank'>
          ${itm.key}
        </a>
      </td>

      <td class='text-center'>${itm.current}</td>

      <td class='text-center webkit-text-align text-green'>
         <button type='button' 
            class='icon-btn install-btn hide-on-browser-1' 
            
            data-tooltip="Update ${itm.key} to version: v${itm.wanted}" 
            onclick="updatePackage('${itm.key}',
                                     '${itm.wanted}',
                                     '${webRenderer.parentPath}')" >
              <span class='mr-1'>${installIcon(20)}</span> ${itm.wanted} 
          </button>
      </td>

      <td class='text-center webkit-text-align text-purple'>
          <button type='button' 
            class='icon-btn install-btn hide-on-browser-1' 
            data-tooltip="Update ${itm.key} to version: v${itm.latest}" 
            onclick="updatePackage('${itm.key}',
                                   '${itm.latest}',
                                   '${webRenderer.parentPath}')"  >
              <span class='mr-1'>${installIcon(20)}</span> ${itm.latest} 
          </button>
      </td>

      <td class='text-center'>${itm.type}</td>
    </tr>
    `;
    }
  }

  vulStr += `</table></div></div>`;

  webRenderer.sendMessageToUI("outdatedPackageContent", {
    htmlContent: vulStr,
    summaryTableData:
      listOfPackages.length > 0
        ? `
        <h3 class='grey-header'>Outdated Packages: ${totalOutdatedPackages} package(s)</h3> 
        <div class='flex-1'>
          <div class="content">
          ${
            (listOfPackages || []).length > 0
              ? `
                <table class='table table-striped table-bordered table-sm simple-table'> 
                  <tr>
                    <th class='text-align-left'>Type</th>
                    <th class='text-right text-high'>
                      Critical 
                      <span class="info-icon" data-tooltip="The package has a major version difference. This means there are breaking changes that you might need to address in your code when updating to the latest version.">&#x2139;
                      </span>
                    </th>

                    <th class='text-right text-moderate'>
                      Moderate 
                      <span class="info-icon" data-tooltip="The wanted version is different from the latest version. This means the installed version is out-of-date and the wanted version specified in your package.json is not the latest.">&#x2139;
                      </span>
                    </th>
                    <th class='text-right'>Total</th>
                  </tr>

                  ${getOutdatedRow("Prod", dependencyPackages)}
                  ${getOutdatedRow("Dev", devDependencyPackages)}
            
                  ${
                    peerDependencyPackages.length > 0
                      ? `${getOutdatedRow("Peer", peerDependencyPackages)}`
                      : ""
                  }

                  ${
                    optionalDependencyPackages.length > 0
                      ? `${getOutdatedRow(
                          "Optional",
                          optionalDependencyPackages
                        )}`
                      : ""
                  }


                  <tr>
                     <td class='b'>Total</td>
                     
                     <td class='text-right text-high'>
                        <b>${
                          listOfPackages.filter(
                            (pck) => pck.severity === SEVERITY.HIGH
                          ).length
                        }</b>
                     </td>

                     <td class='text-right text-moderate'>
                        <b>
                          ${
                            listOfPackages.filter(
                              (pck) => pck.severity === SEVERITY.MEDIUM
                            ).length
                          }
                        </b>
                     </td>
                     <td class='text-right'>
                        <b>
                          ${listOfPackages.length}
                        </b>
                     </td>
                   </tr>
                  </table>
                `
              : `<div class="content-box box box-success-alt">
                    <div class="field-label">Great</div>
                    <div class="field-value">There are no outdated packages.</div>
                 </div>`
          }
                </div>
            </div>`
        : null,
    Count: formatNumber(listOfPackages.length),
    showSummary: listOfPackages.length > 0,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.CRITICAL(
        listOfPackages.filter((pck) => pck.severity === SEVERITY.HIGH).length
      )}

      ${PILLS.SEVERITY.MODERATE(
        listOfPackages.filter((pck) => pck.severity === SEVERITY.MEDIUM).length
      )}
    </div>
    `
  });
};

const getOutdatedPackages = async (webRenderer) => {
  if (!webRenderer.packageLockFile) {
    renderAuditError(MSGS.PACKAGE_LOCK_JSON_NOT_FOUND);
    return;
  }

  webRenderer.sendMessageToUI("outdatedPackageContent", {
    htmlContent: getScanningHTML(" for Outdated Packages"),
    Count: getScanningHTMLSmall()
  });

  runNPMCommand(
    webRenderer,
    `npm outdated --json  --prefix `,
    (success, resp) => {
      if (success) {
        renderOutdatedPackages(webRenderer, JSON.parse(resp.stdout));
        return;
      }
      renderOutdatedPackages(webRenderer, JSON.parse(resp.stderr));
    }
  );
};

module.exports = {
  getOutdatedPackages
};
