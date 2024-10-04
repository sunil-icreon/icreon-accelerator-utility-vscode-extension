import vscode from "vscode";

import {
  LOCAL_STORAGE,
  PAGE_TITLE,
  PROJECT_STAT,
  SOURCE_TYPE
} from "./constants";

import {
  IExtensionListItem,
  IRecord,
  IUri,
  IWebRenderer
} from "./common.types";
import {
  getFileTypeByExt,
  getIgnoreFileFolder,
  GLOBAL_STATE_MANAGER,
  initializeAppInfo,
  logMsg,
  PILLS,
  renderPackageScripts
} from "./util";

let featuresProcessed = 0;

const suggestedExtensions: Array<IExtensionListItem> = [
  {
    id: "genieai.chatgpt-vscode",
    name: "ChatGPT - Genie AI",
    description:
      "Your best AI pair programmer. Save conversations and continue any time. A Visual Studio Code - ChatGPT Integration. Supports, GPT-4o GPT-4 Turbo, GPT3.5 Turbo, GPT3 and Codex models."
  },
  {
    id: "eamodio.gitlens",
    name: "GitLens — Git supercharged",
    description:
      "Supercharge Git within VS Code — Visualize code authorship at a glance via Git blame annotations and CodeLens, seamlessly navigate and explore Git repositories."
  },
  {
    id: "dbaeumer.vscode-eslint",
    name: "ESLint",
    description:
      "Helps maintain code quality by highlighting and fixing linting errors in JavaScript and TypeScript files."
  },
  {
    id: "esbenp.prettier-vscode",
    name: "Prettier - Code Formatter",
    description:
      "Automatically formats your code according to specified rules, ensuring a consistent code style."
  },
  {
    id: "ritwickdey.LiveServer",
    name: "Live Server",
    description:
      "Launches a local development server with live reload feature for static and dynamic pages."
  },
  {
    id: "pranaygp.vscode-css-peek",
    name: "CSS Peek",
    description:
      "Allows you to peek into CSS definitions in your HTML and JSX files."
  },
  {
    id: "Zignd.html-css-class-completion",
    name: "IntelliSense for CSS class names in HTML",
    description:
      "Autocompletes class names in your HTML files based on your project's CSS files."
  },
  {
    id: "adpyke.codesnap",
    name: "CodeSnap",
    description: "Take beautiful screenshots of your code."
  }
];

const isNextJSFramework = (webRenderer: IWebRenderer) => {
  if (webRenderer.pkgJSON) {
    const { dependencies } = webRenderer.pkgJSON;
    return Object.keys(dependencies).findIndex((key) => key === "next") > -1;
  }

  return false;
};

const getWebviewContent = async (webRenderer: IWebRenderer) => {
  let htmlStr = "";
  if (webRenderer.pkgJSON) {
    const {
      devDependencies,
      dependencies,
      peerDependencies,
      optionalDependencies
    } = webRenderer.pkgJSON;

    let framework = "";

    const isNext = isNextJSFramework(webRenderer);
    if (isNext) {
      framework = "next";
    } else {
      const frameworkList = Object.keys(dependencies).filter((key) =>
        ["react", "@angular/cli", "vue"].includes(key)
      );

      if (frameworkList.length > 0) {
        framework = frameworkList.join(", ");
      }
    }

    updateProjectStat(webRenderer, {
      framework: framework
    });

    const serverURL = await GLOBAL_STATE_MANAGER.getItem(
      webRenderer.context,
      LOCAL_STORAGE.PROJECT_INFO_SERVER_URL
    );

    htmlStr = `
  <div class='app-info'>
    <div class='flex-group flex-justify-start'>
      <div class='label-value-group flex-grow-1'>
        <div class='label'>
        <h3 class='grey-header mt-0'>Application Summary
            ${
              serverURL
                ? `<button type='button' 
                      data-tooltip='Url: ${serverURL}'
                      class='submit-btn hide-on-browser' 
                      id='btn_submit_project_info'
                      onclick="submitDashboardStat()">
                      Submit Project Information
                  </button>`
                : ""
            }
            </h3> 
        </div>
        <div class='value'>
          <div class='flex-group flex-justify-start mt-1'>
              <div class='flex'>${
                framework
                  ? PILLS.GENERAL(framework, "Framework", false, "", true)
                  : ``
              }</div>
              <div class='flex' id='primary_language' style='display:none'></div>
              <div class='flex' id='style_language' style='display:none'></div>
              <div class='flex' id='web_server_status' style='display:none'></div>
              <div class='flex' id='unit_test_status' style='display:none'></div>
              <div class='flex' id='lint_status' style='display:none'></div>
              <div class='flex' id='prettier_status' style='display:none'></div>
              <div class='flex' id='docker_status' style='display:none'></div>
              <div class='flex' id='csp_status' style='display:none'></div>
          </div>
        </div>
      </div>
  </div>`;

    htmlStr += `<div class='project-info-box'>`;

    htmlStr += `
  <div class='dep-info-box'>
    <h3 class='grey-header'>Unit Tests</h3> 
    <div class='dep-info'>
      <div class='section'>
          <div id='unitTestContent'></div>
      </div>
    </div>
  </div>
  `;

    htmlStr += `
  <div class='dep-info-box'>
    <h3 class='grey-header'>Lint Configuration</h3> 
    <div class='dep-info'>
      <div class='section'>
          <div id='lintContent'></div>
      </div>
    </div>
  </div>
  `;

    htmlStr += `
  <div class='dep-info-box'>
    <h3 class='grey-header'>Dependencies</h3>
    <div class='dep-info'>
      <div class='section'>
        <div class='label'>Prod</div>
        <div class='value'>${Object.keys(dependencies).length}</div>
      </div>

      <div class='section'>
        <div class='label'>Dev</div>
        <div class='value'>${Object.keys(devDependencies).length}</div>
      </div>

  ${
    peerDependencies
      ? `
    <div class='section'>
      <div class='label'>Peer</div>
      <div class='value'>${Object.keys(peerDependencies).length}</div>
    </div>
    `
      : ""
  }

  ${
    optionalDependencies
      ? `
    <div class='section'>
      <div class='label'>Optional</div>
      <div class='value'>${Object.keys(optionalDependencies).length}</div>
    </div>
    `
      : ""
  }

</div>
</div>`;

    htmlStr += `<div id='fileSummaryLabel'></div>`;
    htmlStr += `<div id='cspContent' style='display:contents'></div>`;
    htmlStr += `<div id='prettierLabel' style='display:none'></div>`;

    htmlStr += `
  <div class='dep-info-box'>
    <h3 class='grey-header'>Scripts</h3> 
    <div class='dep-info'>
      <div class='section'>
          ${renderPackageScripts(webRenderer)}    
      </div>
    </div>
  </div>
  `;

    htmlStr += `
  <div class='dep-info-box'>
    <h3 class='grey-header'>Suggested Extensions</h3> 
    <div class='dep-info'>
      <div class='section'>
          <div id='suggestedExtensionContent'>Loading extensions...</div>
      </div>
    </div>
  </div>
  `;

    htmlStr += `</div>`;

    htmlStr += `<script>
      document.addEventListener('DOMContentLoaded', function() {
        toggleLeftMenuItem('li_project_info');
      });
    </script>`;
  }

  return htmlStr;
};

const separateFilesByExtension = (filesList: Array<IUri>) => {
  const separatedFiles: IRecord = {};

  filesList.forEach((file: IRecord) => {
    const extension = file.fsPath.split(".").pop();
    if (!separatedFiles[extension]) {
      separatedFiles[extension] = [];
    }
    separatedFiles[extension].push(file);
  });

  return separatedFiles;
};

const renderFileWithExtensions = (
  webRenderer: IWebRenderer,
  files: Array<IUri>
) => {
  const filesGroupByExtension = separateFilesByExtension(files);

  let fileHTML = `
   <div class='dep-info-box'>
    <h3 class='grey-header'>Files</h3>
    <div class='dep-info'>`;

  const languageExtensions = ["tsx", "ts", "jsx", "js"];
  const styleExtensions = ["scss", "css", "less"];

  let languageFileCount = 0;
  let primaryLanguage = "";

  let styleFileCount = 0;
  let styleLanguage = "";

  for (const [ext, groupedFiles] of Object.entries(filesGroupByExtension)) {
    if (languageExtensions.includes(ext)) {
      if (groupedFiles.length > languageFileCount) {
        languageFileCount = groupedFiles.length;
        primaryLanguage = ext;
      }
    }

    if (styleExtensions.includes(ext)) {
      if (groupedFiles.length > styleFileCount) {
        styleFileCount = groupedFiles.length;
        styleLanguage = ext;
      }
    }

    let extVal = getFileTypeByExt(ext);
    if (extVal) {
      extVal = `${extVal} (.${ext})`;
    } else {
      extVal = `.${ext}`;
    }

    fileHTML += `
    <div class='section'>
        <div class='label'>${extVal}</div>
        <div class='value'>${groupedFiles.length}</div>
    </div>`;
  }

  fileHTML += `
    </div>
  </div>`;

  webRenderer.sendMessageToUI("fileSummaryContent", {
    htmlContent: fileHTML,
    primaryLanguage: PILLS.GENERAL(
      getFileTypeByExt(primaryLanguage),
      "Language",
      false,
      "",
      true
    ),
    styleLanguage: PILLS.GENERAL(
      getFileTypeByExt(styleLanguage),
      "Style",
      false,
      "",
      true
    )
  });

  updateProjectStat(webRenderer, {
    primaryLanguage: getFileTypeByExt(primaryLanguage),
    styleLanguage: getFileTypeByExt(styleLanguage)
  });
};

const renderESLintStatus = async (webRenderer: IWebRenderer) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  findFiles(
    webRenderer,
    "eslintrc,eslintrc.json,eslintrc.js,eslintrc.yaml",
    ignorePattern,
    (files: Array<IUri>) => {
      let lintConfigured = true;
      let isEslintConfigObjFound = false;
      if (!files || files.length === 0) {
        const { eslintConfig, devDependencies } = webRenderer.pkgJSON;
        isEslintConfigObjFound = Boolean(eslintConfig);
        if (!eslintConfig) {
          let lintPackage = Object.keys(devDependencies).find((pck) =>
            ["eslint", "jslint"].includes(pck)
          );
          if (!lintPackage) {
            lintConfigured = false;
          }
        } else {
          lintConfigured = false;
        }
      }

      let htmlStr = ``;

      const configFiles =
        files.length > 0
          ? files.map((fl) => fl.path.split("/").pop()).join(", ")
          : "";

      if (!lintConfigured) {
        htmlStr += `<div class='text-danger'>Lint not configured.</div>`;
      } else {
        htmlStr += `<div class='text-green'>
        Lint configured${
          files.length > 0 ? ` using <b>${configFiles}</b>` : ""
        }.
        ${
          isEslintConfigObjFound
            ? `Lint configured using <b>'eslintConfig'</b> attribute in <b>'package.json'</b> file.`
            : ""
        }
      </div>`;

        updateProjectStat(webRenderer, {
          lintConfigured: lintConfigured,
          lintConfigFile: configFiles
        });
      }

      webRenderer.sendMessageToUI("lintContent", {
        htmlContent: htmlStr,
        esLintStatus: lintConfigured
          ? PILLS.SUCCESS("Configured", "Lint")
          : PILLS.SEVERITY.HIGH("Not Configured", "Lint")
      });
    }
  );
};

const renderDockerStatus = async (webRenderer: IWebRenderer) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  findExactFiles(
    webRenderer,
    "Dockerfile,Dev-Dockerfile,Qa-Dockerfile,Prod-Dockerfile",
    ignorePattern,
    (files: Array<IUri>) => {
      let isDockerUsed = false;
      if (files && files.length > 0) {
        isDockerUsed = true;
      }

      webRenderer.sendMessageToUI("dockerContent", {
        htmlContent: "",
        dockerStatus: isDockerUsed
          ? PILLS.SUCCESS("Yes", "Docker")
          : PILLS.SEVERITY.HIGH("No", "Docker", false, "", true)
      });

      updateProjectStat(webRenderer, {
        dockerUsed: isDockerUsed
      });
    }
  );
};

const renderWebServerStatus = async (webRenderer: IWebRenderer) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  findExactFiles(
    webRenderer,
    "nginx.conf",
    ignorePattern,
    (files: Array<IUri>) => {
      let isWebserver = false;
      let webServer = "";
      if (files && files.length > 0) {
        isWebserver = true;
        webServer = "NGINX";
      }

      webRenderer.sendMessageToUI("webServerContent", {
        htmlContent: "",
        webServerStatus: isWebserver
          ? PILLS.GENERAL(webServer, "Web Server")
          : ""
      });

      updateProjectStat(webRenderer, {
        nginxServer: isWebserver
      });
    }
  );
};

const findCSPHeaders = (text: string, filePath: string) => {
  const cspRegex = /add_header\s+Content-Security-Policy\s+"([^"]+)"/gi;
  const cspMetaRegex =
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/gi;

  let match;
  let headers: Array<IRecord> = [];

  while ((match = cspRegex.exec(text)) !== null) {
    const matchFound = match[1].trim();
    if (matchFound.indexOf("\r\n") > -1) {
      headers = [
        ...headers,
        {
          filePath,
          fileName: filePath.split("/").pop(),
          headers: [...matchFound.split("\r\n")]
        }
      ];
    }
  }

  while ((match = cspMetaRegex.exec(text)) !== null) {
    const matchFound = match[1].trim();
    headers = [
      ...headers,
      {
        filePath,
        fileName: filePath.split("/").pop(),
        headers: [...matchFound.split("\n")]
      }
    ];
  }

  return headers;
};

const searchCSPHeadersForNext = (files: Array<IUri>) => {
  let headers: Array<IRecord> = [];
  let ctr = 0;
  files.forEach(async (file) => {
    ctr++;
    const filePath = file.path;
    if (filePath.endsWith(".js") || filePath.endsWith(".ts")) {
      const document = await vscode.workspace.openTextDocument(file);
      const content = document.getText();
      const cspRegex = /Content-Security-Policy\s*:\s*([^;]+)/gi;
      let match;

      while ((match = cspRegex.exec(content)) !== null) {
        headers = [
          ...headers,
          {
            filePath,
            fileName: filePath.split("/").pop(),
            headers: match[1].trim()
          }
        ];
      }
    }
  });

  return headers;
};

const renderCSPHTML = (
  webRenderer: IWebRenderer,
  cspHeaderList: Array<IRecord>
) => {
  let isCSPHeader = false;
  let cspList: Array<IRecord> = [];
  let cspHeaderHtml = `
  <div>
     <div class='text-danger mb-1 b'>No CSP headers found.</div>
     <div class='color-grey'>
        Configuring <b>Content Security Policy (CSP)</b> headers is essential for several reasons, primarily related to <span class='text-danger'>enhancing the security</span> of web applications. CSP headers are necessary to:
        <ul>
          <li class='b lh-3'>Mitigate Cross-Site Scripting (XSS) Attacks</li>
          <li class='b lh-3'>Prevent Data Injection Attacks</li>
          <li class='b lh-3'>Reduce the Risk of Data Theft</li>
          <li class='b lh-3'>Enhance Defense in Depth</li>
          <li class='b lh-3'>Control Resources Loading</li>
        </ul>
     </div>
  </div>`;

  if (cspHeaderList.length > 0) {
    isCSPHeader = true;
    cspHeaderHtml = `
    <div class='mb-2'>
      Configuring <b>Content Security Policy (CSP)</b> headers is essential for several reasons, primarily related to <span class='text-success'>enhancing the security</span> of web applications.
    </div>
    
    <div class='text-green mb-1 b'>Below CSP headers are configured.</div>
    <table class='table table-striped table-bordered table-sm simple-table'>
    <tr>
      <th>Header</th>
      <th class='text-align-left'>Value</th>
      <th class='remove-link-on-browser'>Filename</th>
    </tr>

    `;

    cspHeaderList.map((csp: IRecord) => {
      csp.headers.map((headerVal: IRecord) => {
        const parts = headerVal.trim().split(/\s+/);
        const header = parts[0];
        const valuesList = parts.slice(1);
        const values = valuesList
          .map((val: string) => {
            if (
              (val.indexOf("http://") > -1 || val.indexOf("https://") > -1) &&
              val.indexOf("*.") === -1
            ) {
              return `<div class='tag cursor-pointer'><a class='internal-link no-link' href='${val}'>${val}</a></div>`;
            }
            return `<div class='tag'>${val}</div>`;
          })
          .join("");

        cspList = [
          ...cspList,
          {
            header,
            values: valuesList,
            file: csp.fileName
          }
        ];

        cspHeaderHtml += `
      <tr>
        <td class='b no-wrap'>${header}</td>
        <td class='color-grey'><div class='flex-group flex-justify-start '>${values}</div></td>
        <td class='remove-link-on-browser'>
          <a href='javascript:void(0)' 
            target='_blank' 
            class='internal-link no-link remove-link-on-browser' 
            onclick="openFile('${csp.filePath.replace(/\\/g, "\\\\")}')">
              ${csp.fileName}
            </a>
        </td>
      </tr>`;
      });
    });

    cspHeaderHtml += `</table>`;
    webRenderer.sendMessageToUI("cspContent", {
      htmlContent: `
      <div class='dep-info-box css-grid-col-2 ${
        !isCSPHeader ? "error-section" : ""
      }'>
        <h3 class='grey-header'>Content Security Policy</h3> 
        <div class='dep-info'>
          <div class='section'>
              ${cspHeaderHtml}
          </div>
        </div>
      </div>`,
      cspStatus: isCSPHeader
        ? PILLS.SUCCESS("Yes", "CSP", false, "", true)
        : PILLS.SEVERITY.HIGH("No", "CSP", false, "", true)
    });
  } else {
    webRenderer.sendMessageToUI("cspContent", {
      htmlContent: `
      <div class='dep-info-box css-grid-col-2 error-section'>
        <h3 class='grey-header'>Content Security Policy</h3> 
        <div class='dep-info'>
          <div class='section'>
              ${cspHeaderHtml}
          </div>
        </div>
      </div>`,
      cspStatus: PILLS.SEVERITY.HIGH("No", "CSP", false, "", true)
    });
  }

  updateProjectStat(webRenderer, {
    cspAdded: isCSPHeader,
    cspList
  });
};

const renderNextCSP = (webRenderer: IWebRenderer, ignorePattern: string) => {
  try {
    findAllFilesInFolder(
      webRenderer,
      "src",
      ignorePattern,
      (files: Array<IUri>) => {
        const nextHeaders = searchCSPHeadersForNext(files);
        findExactFiles(
          webRenderer,
          "next.config.js",
          ignorePattern,
          async (files: Array<IUri>) => {
            let headers: Array<IRecord> = [];
            if (nextHeaders && nextHeaders.length > 0) {
              headers = [...headers, ...nextHeaders];
            }

            if (files && files.length > 0) {
              const document = await vscode.workspace.openTextDocument(
                files[0]
              );
              const content = document.getText();

              const cspRegex =
                /key\s*:\s*['"`]Content-Security-Policy['"`]\s*,\s*value\s*:\s*[`'"]([\s\S]*?)[`"]/gm;

              let match;
              while ((match = cspRegex.exec(content)) !== null) {
                const matchFound = match[1].trim();
                headers = [
                  ...headers,
                  {
                    filePath: files[0].path,
                    fileName: files[0].path.split("/").pop(),
                    headers: [...matchFound.split("\r\n")]
                  }
                ];
              }
            }

            renderCSPHTML(webRenderer, headers);
          }
        );
      }
    );
  } catch (e) {
    renderCSPHTML(webRenderer, []);
  }
};

const renderCSPStatus = async (webRenderer: IWebRenderer) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context,
    "CSP_FOLDER"
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  const isNext = isNextJSFramework(webRenderer);
  if (isNext) {
    renderNextCSP(webRenderer, ignorePattern);
    return;
  }

  findExactFiles(
    webRenderer,
    "nginx.conf,index.html",
    ignorePattern,
    (files: Array<IUri>) => {
      if (files && files.length > 0) {
        let cspHeaderList: Array<IRecord> = [];
        let ctr = 0;
        for (const file of files) {
          try {
            vscode.workspace.openTextDocument(file).then(async (document) => {
              ctr++;
              const text = document.getText();
              const cspHeaders = findCSPHeaders(text, file.path);
              if (cspHeaders && cspHeaders.length > 0) {
                cspHeaderList = [...cspHeaderList, ...cspHeaders];
              }

              if (ctr === files.length) {
                renderCSPHTML(webRenderer, cspHeaderList);
              }
            });
          } catch (ee) {
            renderCSPHTML(webRenderer, []);
          }
        }
      } else {
        renderCSPHTML(webRenderer, []);
      }
    }
  );
};

const updateProjectStat = (webRenderer: IWebRenderer, data: IRecord) => {
  featuresProcessed++;
  const existing = webRenderer.projectStat[PROJECT_STAT.DASHBOARD];
  webRenderer.projectStat[PROJECT_STAT.DASHBOARD] = {
    ...existing,
    ...data,
    ts: new Date().toUTCString()
  };
};

const renderUnitTestStatus = async (webRenderer: IWebRenderer) => {
  const jestPackages = ["vitest", "jest", "mocha"];
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context,
    "UNIT_TEST_FOLDER",
    "UNIT_TEST_FILES"
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  findFiles(
    webRenderer,
    "spec.tsx,spec.jsx,spec.ts,spec.js,test.tsx,test.jsx,test.ts,test.js",
    ignorePattern,
    async (files: Array<IUri>) => {
      let htmlStr = ``;
      let testFrameworks: Array<string> = [];
      if (!files || files.length === 0) {
        htmlStr += `<div class='text-danger'>No unit tests written.</div>`;
      } else {
        let isAddedAsProdDep = false;

        const { dependencies, devDependencies } = webRenderer.pkgJSON;

        testFrameworks = Object.keys(devDependencies).filter((pck) =>
          jestPackages.includes(pck)
        );

        if (testFrameworks.length === 0) {
          testFrameworks = Object.keys(dependencies).filter((pck) =>
            jestPackages.includes(pck)
          );

          if (testFrameworks.length > 0) {
            isAddedAsProdDep = true;
          }
        }

        htmlStr += `
        <div class='text-green'>
          <b>${files.length}</b> unit test files found${
          testFrameworks.length > 0
            ? ` containing test cases written using <b>${testFrameworks.join(
                ", "
              )}</b> framework`
            : ""
        }.
          
          ${
            isAddedAsProdDep
              ? `<span class='text-danger'>&nbsp;But '${testFrameworks.join(
                  ","
                )}' is added as 'dependency', instead it should be added to 'devDependency'.</span>`
              : ""
          }
        </div>`;

        updateProjectStat(webRenderer, {
          testFramework: testFrameworks.join(", "),
          testFrmwrkAddedAsProdDep: isAddedAsProdDep,
          testFiles: files.length
        });
      }

      webRenderer.sendMessageToUI("unitTestContent", {
        htmlContent: htmlStr,
        unitTestStatus:
          files.length > 0
            ? PILLS.SUCCESS(
                `Written ${
                  testFrameworks.length > 0
                    ? `using&nbsp;<b> ${testFrameworks.join(", ")}</b>`
                    : ""
                }`,
                "Unit Tests"
              )
            : PILLS.SEVERITY.HIGH(`Not written`, "Unit Tests")
      });
    }
  );
};

export const renderPrettierStatus = (
  webRenderer: IWebRenderer,
  prettierInstalled?: Array<IRecord>
) => {
  const getPrettierHTML = (isInstalled: boolean) => {
    let prettierInfo = `<div class='dep-info-box ${
      isInstalled ? "" : "error-section"
    }'>
    <h3 class='grey-header'>Prettier Configuration</h3> 
    <div class='dep-info'>
      <div class='section'>
        
      ${
        isInstalled
          ? `<div class='text-green mb-1 b'>Prettier extension is installed.</div>`
          : `
          <div class='text-danger mb-1 b'>Prettier extension/config not configured.</div>
          <div class='mb-2 hide-on-browser'>
            <a href='javascript:void(0)'
              class='internal-link no-link b' 
              onclick="installAnotherExtension('esbenp.prettier-vscode','Prettier - Code formatter','project_info')">
              Click here
            </a> to install the extension <b>'Prettier - Code formatter'</b>.
          </div>
          `
      }
  
        <div class='color-grey'>
            <b>Prettier</b> is a code formatting tool that offers several benefits for maintaining code quality and consistency. Here's why using Prettier is important:
            <ul>
              <li class='lh-3 mb-1'>
                <b>Consistency</b>:<br/>
                Consist code styles accross codebase, <i>ensuring uniform style</i> which helps maintaining team standards.
              </li>

              <li class='lh-3 mb-1'>
                <b>Productivity</b>:<br/>
                Less Time on Formatting, by removing manual effort for formatting the code.
              </li>

              <li class='lh-3 mb-1'>
                <b>Better Readability</b>:<br/>
                Syntax Highlighting, Code Readability.
              </li>

              <li class='lh-3 mb-1'>
                <b>Less Merge Conflicts</b>:<br/>
                Avoid merge conflicts due to different formatting styles.
              </li>
            </ul>
        </div>
      </div>
    </div>
  </div>`;

    return prettierInfo;
  };

  const activeExtensions = vscode.extensions.all
    .filter((ext) => ext.isActive)
    .map((ext) => `${ext.id}`);

  let prettierConfigured =
    activeExtensions.indexOf("esbenp.prettier-vscode") > -1;

  let htmlStr = getPrettierHTML(
    Boolean(prettierConfigured || prettierInstalled)
  );

  webRenderer.sendMessageToUI("prettierContent", {
    htmlContent: htmlStr,
    prettierStatus: prettierConfigured
      ? PILLS.SUCCESS(`Configured`, "Prettier")
      : PILLS.SEVERITY.HIGH(`Not Configured`, "Prettier", false, "", true)
  });
  updateProjectStat(webRenderer, {
    prettierConfigured: prettierConfigured
  });
};

export const renderSuggestedExtensions = (webRenderer: IWebRenderer) => {
  const activeExtensions = vscode.extensions.all
    .filter((ext) => ext.isActive)
    .map((ext) => `${ext.id}`);

  let htmlStr = `
      <div class='package-scripts-section'>
      `;

  if (activeExtensions.length > 0) {
    suggestedExtensions.map((ext) => {
      htmlStr += `
            <div class='script-item'>
              <div>
                <div class='script-name internal-link'>${ext.name}</div>
                 <div class='script-cmd'>${
                   ext.description
                 }</div>                
              </div>
              
              ${
                activeExtensions.includes(ext.id)
                  ? `<span class='action-done'>Installed</span>`
                  : `<button type='button'
                        class='icon-btn install-btn hide-on-browser float-right'
                        onclick="installAnotherExtension('${ext.id}','${ext.name}','suggested_extensions')">
                          Install
                      </button>`
              }
            </div>
              `;
    });
  } else {
    htmlStr += `<div class='text-danger'>No active extension found.</div>`;
  }

  htmlStr += `
      </div>`;

  webRenderer.sendMessageToUI("suggestedExtensionContent", {
    htmlContent: htmlStr
  });
};

export const renderDashboard = async (webRenderer: IWebRenderer) => {
  featuresProcessed = 0;
  await initializeAppInfo(webRenderer);
  let content = await getWebviewContent(webRenderer);
  webRenderer.content = content;
  webRenderer.renderContent(content, PAGE_TITLE.DASHBOARD, SOURCE_TYPE.PROJECT);
  processFiles(webRenderer, (files: Array<IUri>) => {
    renderFileWithExtensions(webRenderer, files);
  });

  await renderUnitTestStatus(webRenderer);
  renderESLintStatus(webRenderer);
  renderPrettierStatus(webRenderer);
  await renderDockerStatus(webRenderer);
  await renderWebServerStatus(webRenderer);
  await renderCSPStatus(webRenderer);

  setTimeout(() => {
    renderSuggestedExtensions(webRenderer);
  }, 2000);
};

const findAllFilesInFolder = (
  webRenderer: IWebRenderer,
  folder: string,
  ignorePattern: string,
  cb: (files: Array<IUri>) => void
) => {
  try {
    const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

    let searchPattern = `**/${rootFolder}/**/${folder}/**/*.*`;
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders[0].name === rootFolder
    ) {
      searchPattern = `**/**/${folder}/**/*.*`;
    }

    vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
      cb(files);
    });
  } catch (ee) {
    logMsg(`Failed reading files : ${JSON.stringify(ee)}`);
  }
};

const findExactFiles = (
  webRenderer: IWebRenderer,
  fileNames: string,
  ignorePattern: string,
  cb: (files: Array<IUri>) => void
) => {
  try {
    const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

    let searchPattern = `**/${rootFolder}/**/{${fileNames}}`;
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders[0].name === rootFolder
    ) {
      searchPattern = `**/**/{${fileNames}}`;
    }

    vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
      cb(files);
    });
  } catch (ee) {
    logMsg(`Failed reading files : ${JSON.stringify(ee)}`);
  }
};

const findFiles = (
  webRenderer: IWebRenderer,
  searchExtensions: string,
  ignorePattern: string,
  cb: (files: Array<IUri>) => void
) => {
  try {
    const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

    let searchPattern = `**/${rootFolder}/**/*.{${searchExtensions}}`;
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders[0].name === rootFolder
    ) {
      searchPattern = `**/**/*.{${searchExtensions}}`;
    }

    vscode.workspace.findFiles(searchPattern, ignorePattern).then((files) => {
      cb(files);
    });
  } catch (ee) {
    logMsg(`Failed reading files : ${JSON.stringify(ee)}`);
  }
};

const processFiles = async (
  webRenderer: IWebRenderer,
  cb: (files: Array<IUri>) => void
) => {
  const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
    webRenderer.context
  );

  let ignorePattern = `**/{${[...ignoredFolders, ...ignoredFiles].join(
    ","
  )}}/**`;

  findFiles(webRenderer, "ts,tsx,js,jsx,scss,css", ignorePattern, (files) => {
    cb(files);
  });
};
