import { IRecord, IWebRenderer } from "../common.types";
import { PILLS, cleanVersion, renderAccordianItem } from "../util";

const renderPackageTable = (
  dependencies: IRecord,
  installedPackages: IRecord,
  type: string
) => {
  const packageKeys = Object.keys(dependencies || {});

  if (packageKeys.length === 0) {
    return "";
  }

  let listOfPackages: Array<IRecord> = [];

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
    if (a.isChanged > b.isChanged) return -1;
    if (a.isChanged < b.isChanged) return 1;

    return b.type.localeCompare(a.type);
  });

  const changedCount = listOfPackages.filter((pck) => pck.isChanged).length;

  let tableStr = `<div class='mb-2'>
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
    tableStr += `
                              <tr>
                                <td class='${rowCls}'>${pck.key}</td>
                                <td class='text-right'>${pck.configured}</td>
                                <td class='text-right ${rowCls}'>${pck.installed}</td>
                                <td class='text-center'>${pck.type}</td>
                              </tr>
                              `;
  });

  tableStr += `</table>
             </div>
    </div>`;

  let htmlStr = renderAccordianItem(
    type,
    `<div class='flex-group'>
        <div class='flex flex-align-center flex-gap-5'>
                <span class='mr-1'>${type} Dependencies</span>
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
                          "Update Required",
                          false,
                          `Packages with difference in 'configured' and 'installed' versions.`
                        )
                      : ""
                  }
          </div>
    </div>`,
    tableStr
  );

  return htmlStr;
};

export const renderInstalledPackages = (webRenderer: IWebRenderer) => {
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

    htmlStr += `<div class='accordion'>`;
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
