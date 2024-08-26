const { MSGS, REPORT_TITLE, VUL_SEVERITY } = require("../constants");
const util = require("util");
const { PILLS, logInFile, cleanVersion } = require("../util");
const { dirname } = require("path");

const renderPackageTable = (dependencies, installedPackages, type) => {
  const packageKeys = Object.keys(dependencies || {});

  if (packageKeys.length === 0) {
    return "";
  }

  let listOfPackages = [];

  for (const [key, itm] of Object.entries(dependencies)) {
    const currentVersion = installedPackages[key];

    listOfPackages = [
      ...listOfPackages,
      {
        key,
        configured: itm,
        installed: currentVersion,
        isChanged: currentVersion != cleanVersion(itm),
        type
      }
    ];
  }

  listOfPackages.sort((a, b) => {
    // Compare names first
    if (a.isChanged > b.isChanged) return -1;
    if (a.isChanged < b.isChanged) return 1;

    // If names are equal, compare ages
    return b.type.localeCompare(a.type);
  });

  const changedCount = listOfPackages.filter((pck) => pck.isChanged).length;
  let htmlStr = `
      <div class="accordion-item" id="${type}_dep_accordian_item">
        <button class="accordion-header">
          <div class='summary-box'>
              <div class='flex-group flex-justify-start flex-align-center'>
                <h3 class='grey-header mt-0 mb-0'>${type} Dependencies</h3>
                <div class='vul-pill-box'>
                  ${PILLS.SEVERITY.LOW(
                    packageKeys.length,
                    "Total",
                    false,
                    `Total ${type} dependencies`
                  )}
                  ${
                    changedCount > 0
                      ? PILLS.SEVERITY.MODERATE(
                          changedCount,
                          "Updated",
                          false,
                          `Packages with difference in 'configured' and 'installed' versions.`
                        )
                      : ""
                  }
                </div>
              </div>
            </div>
            <span class="icon">+</span>
        </button>
        <div class="accordion-content">
          <div class='mb-2'>
            <div class='flex-1'>
              <table class='table table-striped table-bordered table-sm simple-table'> 
                <tr>
                  <th class='text-align-left'>Package Name</th>
                  <th class='text-right' style='width:115px'>
                    Configured 
                    <span class="info-icon" data-tooltip="Version configured in 'package.json'">&#x2139;</span>
                  </th>

                  <th class='text-right' style='width:115px'>
                    Installed 
                    <span class="info-icon" data-tooltip="Version currently installed, can be minor/patch update.">&#x2139;</span>
                  </th>

                  <th class='text-center' style='width:115px'>Type</th>
                </tr>`;

  listOfPackages.map((pck) => {
    const rowCls = pck.isChanged ? "text-warning b" : "";
    htmlStr += `
                <tr>
                  <td class='${rowCls}'>${pck.key}</td>
                  <td class='text-right'>${pck.configured}</td>
                  <td class='text-right ${rowCls}'>${pck.installed}</td>
                  <td class='text-center'>${pck.type}</td>
                </tr>
                `;
  });

  htmlStr += `</table>
    </div>
  </div>
  </div>
</div>`;

  return htmlStr;
};
const renderInstalledPackages = (webRenderer) => {
  if (!webRenderer.pkgJSON) {
    webRenderer.sendMessageToUI("npmPackageContent", {
      htmlContent: "No Package",
      Count: "-",
      subInfo: `package.json not found.`,
      showSummary: false
    });

    return;
  }
  let htmlStr = ``;

  const installedPackages = webRenderer.packagesWithVersion || {};

  if (webRenderer.pkgJSON) {
    const {
      devDependencies,
      dependencies,
      peerDependencies,
      optionalDependencies
    } = webRenderer.pkgJSON;

    htmlStr += `<div class='accordian'>`;
    if (Object.keys(dependencies || {}).length > 0) {
      htmlStr += renderPackageTable(dependencies, installedPackages, "Prod");
    }

    if (Object.keys(devDependencies || {}).length > 0) {
      htmlStr += renderPackageTable(devDependencies, installedPackages, "Dev");
    }

    if (Object.keys(peerDependencies || {}).length > 0) {
      htmlStr += renderPackageTable(
        peerDependencies,
        installedPackages,
        "Peer"
      );
    }

    if (Object.keys(optionalDependencies || {}).length > 0) {
      htmlStr += renderPackageTable(
        optionalDependencies,
        installedPackages,
        "Optional"
      );
    }

    htmlStr += `</div>`;

    const PackageKeys = {
      dev: Object.keys(devDependencies || {}),
      prod: Object.keys(dependencies || {}),
      peer: Object.keys(peerDependencies || {}),
      optional: Object.keys(optionalDependencies || {})
    };

    webRenderer.sendMessageToUI("npmPackageContent", {
      htmlContent: htmlStr,
      Count: PackageKeys.prod.length,
      subInfo: `Prod Dependencies`,
      showSummary: true,
      summaryHeader: `
    ${PILLS.SEVERITY.MODERATE(
      PackageKeys.prod.length,
      "PROD",
      false,
      "Prod Dependencies"
    )}
    ${PILLS.SEVERITY.LOW(
      PackageKeys.dev.length +
        PackageKeys.peer.length +
        PackageKeys.optional.length,
      "DEV",
      false,
      "Dev Dependencies"
    )}`
    });
  }
};

module.exports = {
  renderInstalledPackages
};
