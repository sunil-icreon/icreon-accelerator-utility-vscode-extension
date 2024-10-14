import {
  LOCAL_STORAGE,
  MSGS,
  PROJECT_STAT,
  REPORT_TITLE,
  SEVERITY_TYPE,
  VUL_SEVERITY
} from "../constants";

import util from "util";

import {
  appendInExtensionState,
  filterBySeverity,
  formatNumber,
  getDirectPackages,
  getPackageId,
  getScanningHTML,
  getScanningHTMLSmall,
  NODE_API,
  PILLS,
  renderAccordianItem,
  renderNPMViewerLink,
  REPORT_UTIL,
  severityTag,
  sortByKey,
  splitButton
} from "../util";

import { dirname } from "path";
import { IRecord, IWebRenderer } from "../common.types";
import { installIcon } from "../icons";

const getVulInfo = (vuls: Array<IRecord>) => {
  return vuls.map((v) => ({
    title: v.title,
    adv: (v.url || "").split("/").pop(),
    fixAvl: REPORT_UTIL.ifFixIsBoolean(v.fixAvailable)
      ? v.fixAvailable == true
        ? "Yes"
        : "No"
      : v.fixAvailable.isSemVerMajor
      ? "Breaking"
      : "",
    cwe: v.cwe.join(", "),
    cvss: v.cvss.score
  }));
};

const submitVulDataToKC = async (
  directPackageVulnerabilities: IRecord,
  webRenderer: IWebRenderer
) => {
  let vulSummary: Array<IRecord> = [];
  Object.keys(directPackageVulnerabilities).forEach((key) => {
    let summary: IRecord = {};
    let packageVuls = directPackageVulnerabilities[key];

    if (packageVuls[0]) {
      if (packageVuls[0].isNoVul) {
        summary = {
          packageName: key,
          version: packageVuls[0].installedVersion,
          id: getPackageId(key, packageVuls[0].installedVersion),
          ts: new Date().toUTCString(),
          c: 0,
          h: 0,
          m: 0,
          l: 0,
          t: 0
        };
      } else {
        packageVuls = sortByKey(packageVuls, "severity");

        const criticalVuls = packageVuls.filter(
          (p: IRecord) => p.severity === VUL_SEVERITY.CRITICAL
        );

        const highVuls = packageVuls.filter(
          (p: IRecord) => p.severity === VUL_SEVERITY.HIGH
        );

        const moderateVuls = packageVuls.filter(
          (p: IRecord) => p.severity === VUL_SEVERITY.MODERATE
        );
        const lowVuls = packageVuls.filter(
          (p: IRecord) => p.severity === VUL_SEVERITY.LOW
        );

        const cList = getVulInfo(criticalVuls);
        const hList = getVulInfo(highVuls);
        const mList = getVulInfo(moderateVuls);
        const lList = getVulInfo(lowVuls);

        const vListObj: IRecord = {};
        if (cList.length > 0) {
          vListObj.cList = cList;
        }

        if (hList.length > 0) {
          vListObj.hList = hList;
        }

        if (mList.length > 0) {
          vListObj.mList = mList;
        }

        if (lList.length > 0) {
          vListObj.lList = lList;
        }

        summary = {
          packageName: key,
          version: packageVuls[0].installedVersion,
          id: getPackageId(key, packageVuls[0].installedVersion),
          ts: new Date().toUTCString(),
          c: criticalVuls.length,
          h: highVuls.length,
          m: moderateVuls.length,
          l: lowVuls.length,
          t: 0,
          ...vListObj
        };

        summary.t = summary.c + summary.h + summary.m + summary.l;
      }
    }

    if (Object.keys(summary).length > 0) {
      vulSummary = [...vulSummary, summary];
    }
  });

  if (vulSummary.length > 0) {
    await appendInExtensionState(
      LOCAL_STORAGE.VULNERABILITIES,
      vulSummary,
      "id",
      webRenderer.context
    );

    NODE_API.saveVul(webRenderer, vulSummary);

    // webRenderer.sendMessageToUI("submitVulnerabilityDataContent", {
    //   vulSummary
    // });
  }
};
const renderDirectPackageVuls = (
  directPackageVulnerabilities: IRecord,
  directPackages: Array<IRecord>
) => {
  let htmlStr = `
  <table class='table table-striped table-bordered table-sm simple-table'> 
      <tr>
          <th class='text-align-left'>Package Name</th>
          <th class='text-center'>Version</th>
          <th class='text-center'>Severity</th>
          <th class='text-align-left'>Vulnerability</th>
          <th class='text-center'>Fix Available</th>
      </tr>`;

  const packageKeys = Object.keys(directPackageVulnerabilities);
  let rowcount = 0;

  const severityCount: IRecord = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0
  };

  if (packageKeys.length > 0) {
    packageKeys.forEach((key) => {
      let packageVuls = directPackageVulnerabilities[key];

      // Do not show packages without any vulnerability
      if (packageVuls[0] && !packageVuls[0].isNoVul) {
        rowcount++;
        packageVuls = sortByKey(packageVuls, "severity");
        const vulCount = packageVuls.length;

        packageVuls.map((vul: IRecord, index: number) => {
          htmlStr += `<tr>`;
          const pckNameTDValue = renderNPMViewerLink(key);
          severityCount[vul.severity] += 1;

          if (vulCount > 0) {
            if (index === 0) {
              htmlStr += `<td ${
                vulCount > 0 && index === 0 ? `rowspan='${vulCount}'` : ""
              } 
          class='text-align-left'>${pckNameTDValue}</td>`;
            }
          } else {
            htmlStr += `<td class='text-align-left'>${pckNameTDValue}</td>`;
          }

          htmlStr += `
          <td class='text-center'>${vul.installedVersion}</td>
          <td class='text-center'>${severityTag(vul.severity)}</td>
          <td class='text-align-left'>${vul.title}</td>
          <td class='text-center'>
            ${REPORT_UTIL.buildIsFixAvailable(
              REPORT_UTIL.ifFixIsBoolean(vul.fixAvailable),
              vul
            )}
            ${REPORT_UTIL.buildBreakingFix(vul)}
          </td>
      </tr>`;
        });
      }
    });

    if (rowcount === 0) {
      htmlStr += `<tr>
      <td colspan="5"><span clas='text-green'>No vulnerabilities found in direct packages.</span></td>
      </tr>`;
    }
  } else {
    htmlStr += `<tr>
    <td colspan="5"><span clas='text-green'>No vulnerabilities found in direct packages.</span></td>
    </tr>`;
  }
  htmlStr += "</table>";

  const tblHeaderStr = ` <div class='flex-group'>
     <div class='flex flex-align-center flex-gap-5'>
      <span class='mr-1'>Direct Package Vulnerabilities</span>
      
      ${PILLS.SEVERITY.CRITICAL(
        severityCount[VUL_SEVERITY.CRITICAL],
        SEVERITY_TYPE.CRITICAL,
        false
      )}

      ${PILLS.SEVERITY.HIGH(
        severityCount[VUL_SEVERITY.HIGH],
        SEVERITY_TYPE.HIGH,
        false
      )}

      ${PILLS.SEVERITY.MODERATE(
        severityCount[VUL_SEVERITY.MODERATE],
        SEVERITY_TYPE.MODERATE,
        false
      )}

      ${PILLS.SEVERITY.LOW(
        severityCount[VUL_SEVERITY.LOW],
        SEVERITY_TYPE.LOW,
        false
      )}
    </div>
</div>`;
  return `${renderAccordianItem("direct_vul_table", tblHeaderStr, htmlStr)}`;
};

const renderVulnerabilitiesSummary = (
  vulnerabilitylist: Array<IRecord>,
  webRenderer: IWebRenderer
) => {
  if (vulnerabilitylist.length == 0) {
    return "";
  }

  const fixAvailableCount = vulnerabilitylist.filter(
    (pck) => pck.fixAvailable == true
  ).length;

  const noFixAvailableCount = vulnerabilitylist.filter(
    (pck) => pck.fixAvailable == false
  ).length;

  const breakingCount = vulnerabilitylist.filter((pck) =>
    REPORT_UTIL.ifFixIsObject(pck.fixAvailable)
  ).length;

  webRenderer.projectStat[PROJECT_STAT.AUDIT] = {
    ...webRenderer.projectStat[PROJECT_STAT.AUDIT],
    fixAvl: fixAvailableCount,
    noFixAvl: noFixAvailableCount,
    breaking: breakingCount
  };

  let vulTableStr = `<div>
  <div class='float-right mb-1' style='width:230px'>
      ${splitButton(
        `${installIcon(18)}`,
        `Auto Fix Vulnerabilities`,
        `onclick="autoFixVulnerabilities('${webRenderer.parentPath}')"`,
        "",
        "hide-on-browser grey sm"
      )}
  </div>

  <table class='table table-striped table-bordered table-sm'> 
    <tr>
      <th class='text-align-left'>Package</th>
      <th>Severity</th>
      <th>Issues</th>
      <th>Vulnerability</th>
      <th>Fix Available</th>
    </tr>
  `;

  vulnerabilitylist.map((vul) => {
    const isBooleanFix = REPORT_UTIL.ifFixIsBoolean(vul.fixAvailable);

    vulTableStr += `
    <tr>
      <td class='no-wrap b'>
        <b>${renderNPMViewerLink(vul.name)}</b>
      </td>

      <td class='text-center'>${severityTag(vul.severity)}</td>

      <td class='text-center'>
        ${vul.via instanceof Array ? vul.via.length : "-"}
      </td>

      <td>${REPORT_UTIL.getVulnerabilitiesText(vul)}</td>

      <td class='td-fix-avl'>${
        isBooleanFix
          ? vul.fixAvailable === true
            ? `<div class='fix-green b'>Yes</div>`
            : `<div class='fix-red b'>No</div>`
          : `<div class='fix-yellow b'>Breaking</div>`
      }</td>
    </tr>`;
  });

  vulTableStr += `</table>
  </div>`;

  let vulTableHeader = `
  <div class='flex-group'>
     <div class='flex flex-align-center flex-gap-5'>
      <span class='mr-1'>All Vulnerabilities</span>
      <span class='b'>Fix Available</span> 
      ${PILLS.SUCCESS(
        fixAvailableCount,
        "Yes",
        false,
        "Auto fix available for these packages."
      )}

      ${PILLS.SEVERITY.CRITICAL(
        noFixAvailableCount,
        "No",
        false,
        "No fix available for these packages."
      )}

      ${PILLS.SEVERITY.HIGH(
        breakingCount,
        "Breaking",
        false,
        "Fix is available, but will result in code break."
      )}
    </div>
</div>`;

  return `${renderAccordianItem("vul_table", vulTableHeader, vulTableStr)}`;
};

const getDirectDependencyCount = (webRenderer: IWebRenderer) => {
  const directDependencies = {
    dev: 0,
    prod: 0,
    peer: 0,
    optional: 0
  };

  if (webRenderer.pkgJSON) {
    const {
      devDependencies,
      dependencies,
      peerDependencies,
      optionalDependencies
    } = webRenderer.pkgJSON;
    directDependencies.dev = Object.keys(devDependencies || {}).length;
    directDependencies.prod = Object.keys(dependencies || {}).length;
    directDependencies.peer = Object.keys(peerDependencies || {}).length;
    directDependencies.optional = Object.keys(
      optionalDependencies || {}
    ).length;
  }

  return directDependencies;
};

const renderVulnerabilities = (vulnerabilitylist: Array<IRecord>) => {
  if (vulnerabilitylist.length == 0) {
    return "";
  }

  let vulStr = ``;

  let vulHtmlStr = ``;
  vulnerabilitylist.map((vul) => {
    const isBooleanFix = REPORT_UTIL.ifFixIsBoolean(vul.fixAvailable);
    vulHtmlStr += `
    <div  id='${vul.name}' class='package-vul-box box bl-${vul.severity}'>
      <div>
          ${REPORT_UTIL.buildPackage(vul, isBooleanFix)}
      </div>

      <div>
        <h3>Vulnerabilities</h3>
        <ul>
          ${REPORT_UTIL.getVulnerabilitiesValue(vul)}
        </ul>
      </div>
    </div>`;
  });

  vulHtmlStr += `<div>
    <br/>
    <hr/> 
    <div><b># Score: </b>  <i>${MSGS.SCORE_TOOLTIP}</i></div>
    <div><b># CWE: </b> <i>${MSGS.CWE_TOOLTIP}</i></div>
    <div><b># GHSA: </b>  <i>${MSGS.GHSA_TOOLTIP}</i></div>
    <br/><br/>
  </div>`;

  vulStr += `
  ${renderAccordianItem(
    "vul_detail",
    "Vulnerability Report Details",
    vulHtmlStr
  )}
  `;
  return vulStr;
};

export const renderNPMAuditResponse = async (
  webRenderer: IWebRenderer,
  data: IRecord
) => {
  if (Object.keys(data).includes("error")) {
    const errorSummary = data["error"];

    const errorSummaryContent = `
            <div class='flex-1'>
                <h3 class='grey-header'>Vulnerabilities</h3>
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

    webRenderer.sendMessageToUI("npmAuditContent", {
      htmlContent: null,
      summaryTableData: errorSummaryContent,
      Count: 0,
      packagesCount: 0
    });

    return;
  }

  const processedData: IRecord | undefined = processResp(webRenderer, data);

  let content = ``;
  let vulnerabilityList: Array<IRecord> = [];
  if (Object.keys(data.vulnerabilities || {}).length > 0) {
    vulnerabilityList = REPORT_UTIL.sortBySeverity(
      Object.keys(data.vulnerabilities).map((key) => {
        return { ...data.vulnerabilities[key] };
      })
    );
  }

  const directPackages = vulnerabilityList.filter((pck) => pck.isDirect);
  const transientPackages = vulnerabilityList.filter((pck) => !pck.isDirect);

  const {
    critical = 0,
    high = 0,
    moderate = 0,
    low = 0,
    info = 0
  } = data?.metadata?.vulnerabilities || {};

  const {
    dev = 0,
    prod = 0,
    peer = 0,
    optional = 0
  } = data?.metadata?.dependencies || {};

  const directDependencies = getDirectDependencyCount(webRenderer);
  let view = {
    totalDependencies: dev + prod + peer + optional,
    totalVulnerabilities: critical + high + moderate + low + info
  };

  webRenderer.projectStat[PROJECT_STAT.DEPENDENCY] = {
    prodDependencies: prod,
    devDependencies: dev,
    peerDependencies: peer,
    optionalDependencies: optional,
    t: dev + prod + peer + optional,
    ts: new Date().toUTCString()
  };

  webRenderer.projectStat[PROJECT_STAT.AUDIT] = {
    c: critical,
    h: high,
    m: moderate,
    l: low,
    t: view.totalVulnerabilities,
    directDep: directPackages.length,
    transientDep: transientPackages.length,
    ts: new Date().toUTCString()
  };

  if (vulnerabilityList.length > 0) {
    content += `<div class='accordion'>`;
    content += renderDirectPackageVuls(processedData || {}, directPackages);
    content += renderVulnerabilitiesSummary(vulnerabilityList, webRenderer);
    content += renderVulnerabilities(vulnerabilityList);
    content += `</div>`;

    submitVulDataToKC(processedData || {}, webRenderer);
  }

  const count = {
    direct: {
      c: filterBySeverity(directPackages, VUL_SEVERITY.CRITICAL).length,
      h: filterBySeverity(directPackages, VUL_SEVERITY.HIGH).length,
      m: filterBySeverity(directPackages, VUL_SEVERITY.MODERATE).length,
      l: filterBySeverity(directPackages, VUL_SEVERITY.LOW).length
    },
    transitive: {
      c: filterBySeverity(transientPackages, VUL_SEVERITY.CRITICAL).length,
      h: filterBySeverity(transientPackages, VUL_SEVERITY.HIGH).length,
      m: filterBySeverity(transientPackages, VUL_SEVERITY.MODERATE).length,
      l: filterBySeverity(transientPackages, VUL_SEVERITY.LOW).length
    }
  };

  webRenderer.sendMessageToUI("npmAuditContent", {
    htmlContent: content,
    totalVulnerabilities: view.totalVulnerabilities,
    summaryTableData: `
    <h3 class='grey-header'>
      Vulnerabilities (${view.totalVulnerabilities})
    </h3>  
    <div class='flex-1'>
      <div class="content">
      ${
        view.totalVulnerabilities > 0
          ? `
          <table class='table table-striped table-bordered table-sm simple-table'> 
            <tr>
                <th class='text-align-left'>Dependency</th>
                <th class='text-right text-critical'>Critical</th>
                <th class='text-right text-high'>High</th>
                <th class='text-right text-moderate'>Moderate</th>
                <th class='text-right text-low'>Low</th>
                <th class='text-right'>Total</th>
            </tr>

            <tr>
              <td>Direct</td>
              <td class='text-right 
                ${count.direct.c > 0 ? "text-critical" : "text-grey"}'
              >
                ${count.direct.c}
              </td>

              <td class='text-right 
                ${count.direct.h > 0 ? "text-high" : "text-grey"}'
              >
                ${count.direct.h}
              </td>

              <td class='text-right 
                ${count.direct.m > 0 ? "text-moderate" : "text-grey"}'
              >
                ${count.direct.m}
              </td>

              <td class='text-right 
                ${count.direct.l > 0 ? "text-low" : "text-grey"}'
              >
                ${count.direct.l}
              </td>

              <td class='text-right b'>
                  ${directPackages.length}
              </td>
            </tr>

            <tr>
              <td>Transitive</td>
              <td class='text-right 
                ${count.transitive.c > 0 ? "text-critical" : "text-grey"}'
              >
                ${count.transitive.c}
              </td>

              <td class='text-right 
                ${count.transitive.h > 0 ? "text-high" : "text-grey"}'
              >
                ${count.transitive.h}
              </td>

              <td class='text-right 
                ${count.transitive.m > 0 ? "text-moderate" : "text-grey"}'
              >
                ${count.transitive.m}
              </td>

              <td class='text-right 
                ${count.transitive.l > 0 ? "text-low" : "text-grey"}'
              >
                ${count.transitive.l}
              </td>
              <td class='text-right b'>
                ${transientPackages.length}
              </td>
            </tr>
          
            <tr>
              <td>Total</td>
              <td class='text-right text-critical b'>
                ${
                  filterBySeverity(vulnerabilityList, VUL_SEVERITY.CRITICAL)
                    .length
                }
              </td>
              <td class='text-right text-high b'>${
                filterBySeverity(vulnerabilityList, VUL_SEVERITY.HIGH).length
              }</td>
              <td class='text-right text-moderate b'>${
                filterBySeverity(vulnerabilityList, VUL_SEVERITY.MODERATE)
                  .length
              }</td>
              <td class='text-right text-low b'>${
                filterBySeverity(vulnerabilityList, VUL_SEVERITY.LOW).length
              }</td>
              <td class='text-right b'><b>${vulnerabilityList.length}</b></td>
            </tr>
         `
          : `<div class="content-box box box-success-alt">
            <div class="field-label">Great</div>
            <div class="field-value">There are no vulnerabilities.</div>
          </div>
          `
      }
        </div>
    </div>
    `,
    dependencyData: `
     <h3 class='grey-header'>
       Total Packages (${prod + dev + peer + optional})
     </h3> 
    <div class='flex-1'>
        <div class="content">
          <table class='table table-striped table-bordered table-sm simple-table'> 
              <tr>
                <th class='text-align-left'>Type</th>
                <th class='text-right'>
                  Direct 
                  <span class="info-icon" data-tooltip="Packages directly added in 'package.json'">&#x2139;</span>
                </th>
                
                <th class='text-right'>
                  Transitive 
                  <span class="info-icon" data-tooltip="Transitive packages are indirect dependencies.It is not specified directly in your project's dependency list but is required by one of your direct dependencies.">&#x2139;</span>
                </th>
                <th class='text-right'>Total</th>
              </tr>
          
              <tr>
                <td>Prod</td>
                <td class='text-right'>${directDependencies.prod}</td>
                <td class='text-right'>${prod - directDependencies.prod}</td>
                <td class='text-right'>${prod}</td>
              </tr>

              <tr>
                <td>Dev</td>
                <td class='text-right'>${directDependencies.dev}</td>
                <td class='text-right'>${dev - directDependencies.dev}</td>
                <td class='text-right'>${dev}</td>
              </tr>

          ${
            peer
              ? `
              <tr>
                <td>Peer</td>
                <td class='text-right'>${directDependencies.peer}</td>
                <td class='text-right'>${peer - directDependencies.peer}</td>
                <td class='text-right'>${peer}</td>
              </tr>
              `
              : ""
          }

          ${
            optional
              ? `
              <tr>
                <td>Optional</td>
                <td class='text-right'>${directDependencies.optional}</td>
                <td class='text-right'>${
                  optional - directDependencies.optional
                }</td>
                <td class='text-right'>${optional}</td>
              </tr>
             `
              : ""
          }

            <tr>
                <td><b>Total</b></td>
                <td class='text-right'>
                <b>
                ${
                  directDependencies.prod +
                  directDependencies.dev +
                  directDependencies.peer +
                  directDependencies.optional
                }
                </b>
                </td>
                <td class='text-right'>
                <b>
                ${
                  prod -
                  directDependencies.prod +
                  (dev - directDependencies.dev) +
                  (peer - directDependencies.peer) +
                  (optional - directDependencies.optional)
                }
                </b>
                </td>
                <td class='text-right'><b>${
                  prod + dev + peer + optional
                }</b></td>
              </tr>
        </table>
        </div>
      </div>`,
    Count: formatNumber(vulnerabilityList.length),
    packagesCount: formatNumber(view.totalDependencies),
    showSummary: view.totalVulnerabilities > 0,
    summaryHeader: `
    ${PILLS.SEVERITY.CRITICAL(
      filterBySeverity(vulnerabilityList, VUL_SEVERITY.CRITICAL).length
    )}

    ${PILLS.SEVERITY.HIGH(
      filterBySeverity(vulnerabilityList, VUL_SEVERITY.HIGH).length
    )}
    
    ${PILLS.SEVERITY.MODERATE(
      filterBySeverity(vulnerabilityList, VUL_SEVERITY.MODERATE).length
    )}

    ${PILLS.SEVERITY.LOW(
      filterBySeverity(vulnerabilityList, VUL_SEVERITY.LOW).length
    )}
    `
  });
};

export const renderAuditError = (webRenderer: IWebRenderer, error: string) => {
  const err = error || "";
  if (
    err.indexOf('Something went wrong, "npm WARN config global `--global`') > -1
  ) {
    webRenderer.renderError({
      actionHeader: REPORT_TITLE,
      hasSolution: `
      <div classs='box box-success'>
          <h3>Follow below steps to resolve the issue:</h3>

          <div class="mb-2">
              <div><b>Step 1:</b> Set Execution policy to make sure you can execute scripts:</div>
              <div class='i'>Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force</div>
          </div>

          <div class="mb-2">  
              <div><b>Step 2:</b> Install npm-windows-upgrade package globally</div>
              <div class='i'>npm install --global --production npm-windows-upgrade</div>
          </div>

          <div class="mb-2">  
              <div><b>Step 3:</b> Upgrade npm to the latest version</div>
              <div class='i'>npm-windows-upgrade --npm-version latest</div>
          </div>

          <div class="mb-2">  
              <div><b>Step 4:</b> Revert the execution policy</div>
              <div class='i'>Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force</div>
          </div>
      </div>`,
      message: `<div class='mb-2'>Something went wrong, but this can be fixed.</div>`
    });
    return;
  }

  webRenderer.renderError({
    actionHeader: REPORT_TITLE,
    hasSolution: false,
    message: err
  });
};

const processResp = (webRenderer: IWebRenderer, auditData: IRecord) => {
  const directPackages: IRecord = getDirectPackages(webRenderer);
  const installedPackages: IRecord = webRenderer.packagesWithVersion;
  // Initialize an object to hold the vulnerabilities by package
  const vulnerabilitiesByPackage: IRecord = {};

  // Helper function to process vulnerabilities for a given package
  const processVulnerabilities = (
    packageName: string,
    via: any,
    fixAvailable: any,
    range: string
  ) => {
    if (!Array.isArray(via)) return;

    // Initialize an array for this package if it doesn't already exist
    if (!vulnerabilitiesByPackage[packageName]) {
      vulnerabilitiesByPackage[packageName] = [];
    }

    via.forEach((vuln) => {
      if (typeof vuln === "string") return; // Skip strings, they are references to other vulnerabilities

      const { name, title, severity, url, recommendation, cwe, cvss } = vuln;

      // Add the vulnerability details to the package
      vulnerabilitiesByPackage[packageName].push({
        viaPackage: name,
        severity,
        title,
        url,
        fixAvailable,
        range,
        cwe,
        cvss,
        configuredVersion: directPackages[packageName],
        installedVersion: installedPackages[packageName],
        recommendation
      });
    });
  };

  // Check for the vulnerabilities key
  if (auditData.vulnerabilities) {
    // Iterate over the vulnerabilities
    for (const [packageName, vulnerabilityDetails] of Object.entries(
      auditData.vulnerabilities
    )) {
      const { via, effects, fixAvailable, range } =
        vulnerabilityDetails as IRecord;

      // Process the vulnerabilities for the main package
      processVulnerabilities(packageName, via, fixAvailable, range);

      // Process vulnerabilities for the dependent packages
      if (effects && Array.isArray(effects)) {
        effects.forEach((dependentPackage) => {
          processVulnerabilities(dependentPackage, via, fixAvailable, range);
        });
      }
    }
  } else {
    console.error("No vulnerabilities found in the audit data.");
    return;
  }

  const directPackageVulnerabilities: IRecord = {};

  Object.keys(directPackages).forEach((key) => {
    directPackageVulnerabilities[key] = vulnerabilitiesByPackage[key] || [
      {
        isNoVul: true,
        configuredVersion: directPackages[key],
        installedVersion: installedPackages[key]
      }
    ];
  });

  return directPackageVulnerabilities;
};

export const runNPMAudit = async (webRenderer: IWebRenderer) => {
  if (!webRenderer.packageLockFile) {
    renderAuditError(webRenderer, MSGS.PACKAGE_LOCK_JSON_NOT_FOUND);
    return;
  }

  webRenderer.sendMessageToUI("npmAuditContent", {
    htmlContent: getScanningHTML(" for Vulnerabilities"),
    Count: getScanningHTMLSmall(),
    packagesCount: getScanningHTMLSmall()
  });

  const exec = util.promisify(require("child_process").exec);

  try {
    exec(
      "npm audit --json --prefix " +
        (process.platform !== "win32" ? "/" : "") +
        dirname(webRenderer.packageLockFile.uri.path.substring(1)),
      { windowsHide: true }
    )
      .then((result: IRecord) => {
        renderNPMAuditResponse(webRenderer, JSON.parse(result.stdout));
      })
      .catch((e: IRecord) => {
        renderNPMAuditResponse(webRenderer, JSON.parse(e.stdout));
      });
  } catch (output) {
    webRenderer.sendMessageToUI("npmAuditContent", {
      htmlContent: "Error while processing...",
      Count: "",
      hideSection: true
    });
  }
};
