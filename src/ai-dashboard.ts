import { marked } from "marked";
import {
  AIProvider,
  EXECUTION_STATUS,
  LOCAL_STORAGE,
  PAGE_TITLE,
  SOURCE_TYPE
} from "./constants";

import {
  checkIfFileExist,
  checkVersionUpdate,
  confirmMsg,
  getAllFilesOfFolder,
  getFileData,
  getFileExtension,
  getIgnoreFileFolder,
  getLoaderWithText,
  getScanningHTMLSmall,
  GLOBAL_STATE_MANAGER,
  initializeAppInfo,
  logMsg,
  writeFile
} from "./util";

import { IContext, IRecord, IUri, IWebRenderer } from "./common.types";
import {
  callOpenAI,
  checkAIConfigStatus,
  getOpenAPIKey,
  populateAIModelDropdown
} from "./open-ai-util";

const getWebviewContent = async (webRenderer: IWebRenderer) => {
  const { aiModelOptionsStr, apiKeyFound, keyNotFoundHTML } =
    await checkAIConfigStatus(webRenderer);

  let htmlStr = "";
  const unitTestPrompt = `Write unit test cases for below code using 'React Testing Library'. Cover negative, positive and edge cases.`;

  if (!apiKeyFound) {
    htmlStr = keyNotFoundHTML;
  } else {
    htmlStr = `
  <div class='ai-unit-app'>
    <div class='ai-config-form'>
      <div class='flex-group flex-justify-start'>
        <div class='column-box  flex-grow-1'>
          <div class='prompt-config box-1 mb-1'>
              <div>
                <div class='field'>
                  <span class='field-label'>Prompt</span>
                  <input type='text' id='ai_unit_test_prompt' class='form-input' placeholder='Enter prompt' value="${unitTestPrompt}" />
                </div>
              </div>

              <div class='other-config-fields'>
                <div class='field'>
                  <span class='field-label'>Source Folder</span>
                  <input type='text' id='ai_unit_test_source_folder' class='form-input' placeholder="Default is 'src'" value="src" />
                </div>

                <div class='field'>
                  <span class='field-label'>Test Folder</span>
                  <input type='text' id='ai_unit_test_test_folder' class='form-input' placeholder="Default is '__tests__'" value="__tests__" />
                </div>

                <div class='field'>
                  <span class='field-label'>Test File Suffix</span>
                  <input type='text' id='ai_unit_test_test_file_convention' class='form-input' placeholder="Default is 'spec'" value="spec" />
                </div>

                <div class='field' id='ai_auto_write_option_box' style='display:none'>
                  <span class='field-label'>Action for existing files</span>
                  <div class='flex flex-align-center mt-1'>
                    <input type="radio" id="ai_rd_ask" name="ai_overrite_options" checked value="Ask" />
                    <label for="ai_rd_ask" class='radio-label'>Ask</label><br>

                    <input type="radio" id="ai_rd_append" name="ai_overrite_options" value="Append" />
                    <label for="ai_rd_append" class='radio-label'>Append</label><br>

                    <input type="radio" id="ai_rd_overright" name="ai_overrite_options" value="Overright" />
                    <label for="ai_rd_overright" class='radio-label'>Overright</label><br>

                    <input type="radio" id="ai_rd_skip" name="ai_overrite_options" value="Skip" />
                    <label for="ai_rd_skip" class='radio-label'>Skip</label><br>
                  </div>
                </div>

                <div class='field'>
                  <span class='field-label'>Auto Write</span>
                  <input type="checkbox" class='mt-1' id="ai_chk_auto_write" onchange="handleAIAutoWrite()" name="chk_auto_write" value="false" />
                </div>

                 ${aiModelOptionsStr}

                <div class='field'>
                    <span class='field-label'>&nbsp;</span>
                    <div class='flex-group'>
                        <button type='button' 
                            class='submit-btn hide-on-browser' 
                            onclick="writeUnitTests(-1)">
                            Start Execution
                        </button>

                        <button type='button' 
                            id='ai_stop_execution'
                            class='submit-btn danger-btn hide-on-browser' 
                            style='display:none'
                            onclick="terminateUnitTestRun()">
                            Stop Execution
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class='ai-dashboard-content'>
        <div id='aiUnitTestFilesContent' class='progress-status flex-grow-1' style='display:none'></div>
        
        <div id='ai_gen_test' class='generated-file-content white-code-box mb-1' style='display:none;width: 45%'>
          <h4 class='grey-header m0 white-code-header'>Generated Unit Test Cases</h4>
          <div id='aiUnitGeneratedContent' class='html-code'></div>
        </div>


        <div id='ai_existing_test_1' class='existed-file-content white-code-box mb-1' style='display:none; width:25%'>
          <h4 class='grey-header white-code-header'>Existing Unit Test Cases</h4>
          <div id='aiUnitFileContent' class='html-code'></div>
        </div>
      </div>
     </div>
    </div>
</div>
  `;
  }

  htmlStr += `<script>
      document.addEventListener('DOMContentLoaded', function() {
        toggleLeftMenuItem('li_ai_utilities');
      });
    </script>`;

  return htmlStr;
};

const TEST_BTN_ACTIONS = {
  WRITE: "write",
  OVERRIGHT: "overwrite",
  APPEND: "append",
  ASK: "ask",
  SKIP: "skip"
};
const getActionBtnsForTD = (action: string) => {
  switch (action) {
    case TEST_BTN_ACTIONS.WRITE:
      return `<button type='button' 
                  class='submit-btn mr-1 hide-on-browser' 
                  onclick="aiWriteTestFile('${action}')">Create File
                </button>`;

    case TEST_BTN_ACTIONS.OVERRIGHT:
      return `<button type='button' 
                  class='submit-btn hide-on-browser' 
                  onclick="aiWriteTestFile('${action}')">Overwrite
              </button>

              <button type='button' 
                  class='submit-btn hide-on-browser' 
                  onclick="aiWriteTestFile('${TEST_BTN_ACTIONS.APPEND}')">Append
              </button>

              <button type='button' 
                  class='submit-btn hide-on-browser' 
                  onclick="aiWriteTestFile('${TEST_BTN_ACTIONS.SKIP}')">Skip
              </button>
                `;

    default:
      return "";
  }
};

const isTestFileExist = (webRenderer: IWebRenderer, file: IRecord) => {
  const {
    testFolderName = "__tests__",
    testFileNamingConvention = "spec",
    sourceFolder = "src"
  } = webRenderer.tempData;

  const filePath = file.fullPath;

  if (filePath) {
    let relativePath = getRelativePath(filePath, sourceFolder);
    const fileName = file.name;
    const testFileName = createSpecFileName(fileName, testFileNamingConvention);

    relativePath = relativePath
      .replace(fileName, testFileName)
      .replaceAll("\\", "/");

    relativePath = `${webRenderer.parentPath}/${testFolderName}/${relativePath}`;

    return checkIfFileExist(relativePath);
  }

  return false;
};

const renderTestFiles = (webRenderer: IWebRenderer, files: Array<IRecord>) => {
  let htmlStr = ``;
  htmlStr += `<table class='table table-striped table-bordered table-sm simple-table'>`;

  htmlStr += `<tr>
    <th class='text-align-left'>#</th>
      <th class='text-align-left'>File</th>
      <th class='text-align-left'>Status</th>
    </tr>`;

  files.map((fl, index) => {
    if (fl) {
      const testFileExist = isTestFileExist(webRenderer, fl);

      htmlStr += `<tr>
        <td>${index + 1}</td>
        <td>
          <a href='javascript:void(0)' 
             data-tooltip='${fl.fullPath}'
             class='internal-link no-link' 
             onclick="openFile('${fl.fullPath.replace(/\\/g, "\\\\")}')">
             ${fl.name}
          </a>
        </td>

        <td>
          <div class='flex-group'>
              <div id='ai_unit_td_${index}_status' class='progress-msg-box'>
                ${
                  testFileExist
                    ? "<span class='text-warning'>Test file exist</span>"
                    : "Not started"
                } 
              </div>

              <div id='ai_unit_td_${index}_action_btns' class='progress-actions flex flex-justify-start flex-gap-10'>
                  <button type='button' 
                      class='submit-btn mr-1 hide-on-browser' 
                      onclick="writeUnitTests(${index})">
                      Generate Tests
                  </button>
              </div>
          </div>
        </td>
      </tr>
      `;
    }
  });

  htmlStr += "</table>";
  return htmlStr;
};

const renderFileTable = async (
  webRenderer: IWebRenderer,
  folderPath: string
) => {
  try {
    if (folderPath) {
      const isFile = getFileExtension(folderPath).length > 0;
      if (isFile) {
        const fileName = folderPath.split("/").pop();
        const selectedFile = [{ name: fileName, fullPath: folderPath }];
        webRenderer.tempData = {
          ...webRenderer.tempData,
          files: selectedFile
        };
        const htmlStr = renderTestFiles(webRenderer, selectedFile);
        webRenderer.sendMessageToUI("aiFileTreeContent", {
          htmlContent: htmlStr
        });
        return;
      }
    }

    folderPath = folderPath || `${webRenderer.parentPath}/src`;

    const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
      webRenderer.context
    );

    const allFiles = getAllFilesOfFolder(
      folderPath,
      ["ts", "tsx", "js", "jsx"],
      ignoredFolders,
      ignoredFiles
    );

    if (allFiles && allFiles.length > 0) {
      webRenderer.tempData = {
        ...webRenderer.tempData,
        files: allFiles
      };

      const htmlStr = renderTestFiles(webRenderer, allFiles);
      webRenderer.sendMessageToUI("aiFileTreeContent", {
        htmlContent: htmlStr
      });
    } else {
      webRenderer.sendMessageToUI("aiFileTreeContent", {
        htmlContent: `No files found.`
      });
    }
  } catch (e) {
    logMsg(`Error: ${JSON.stringify(e)}`, true);
  }
};

export const renderAIDashboard = async (
  webRenderer: IWebRenderer,
  folderURI?: IUri
) => {
  await initializeAppInfo(webRenderer);
  webRenderer.tempData = {
    folderURI: folderURI ? folderURI.path.substring(1) : null
  };

  renderDashboardContent(webRenderer);
};

const renderDashboardContent = async (webRenderer: IWebRenderer) => {
  let content = await getWebviewContent(webRenderer);
  webRenderer.content = content;
  webRenderer.renderContent(content, PAGE_TITLE.AI_DASHBOARD, SOURCE_TYPE.AI);
  const apiKey = await getOpenAPIKey(webRenderer.context);

  webRenderer.tempData = {
    ...webRenderer.tempData,
    openAIKey: apiKey
  };

  let { folderURI } = webRenderer.tempData;
  await renderFileTable(webRenderer, folderURI);
  populateAIModelDropdown(webRenderer, AIProvider.OPEN_AI);
  checkVersionUpdate(webRenderer);
};

const updateTestProgress = (
  webRenderer: IWebRenderer,
  msg: string,
  infoType: any,
  index: number
) => {
  let msgCls = "";
  let showLoading = false;
  switch (infoType) {
    case EXECUTION_STATUS.COMPLETE:
      msgCls = "text-green";
      break;

    case EXECUTION_STATUS.FAILED:
      msgCls = "text-danger";
      break;

    case EXECUTION_STATUS.RUNNING:
      showLoading = true;
      msgCls = "text-moderate";
      break;

    case EXECUTION_STATUS.CONFIRM:
      msgCls = "text-warning";
      break;
  }

  let msgHTML = `<div class='${msgCls} status-msg'>${
    showLoading ? getLoaderWithText(10, msg) : msg
  }</div>`;

  webRenderer.sendMessageToUI("aiUnitTestProgressStatus", {
    htmlContent: msgHTML,
    index
  });
};

const createSpecFileName = (filename: string, testFileConvention: string) => {
  testFileConvention = testFileConvention || "spec";
  const [name, extension] = filename.split(".");
  const specFileName = `${name}.${testFileConvention}.${extension}`;
  return specFileName;
};

const getRelativePath = (fullPath: string, rootFolder: string) => {
  rootFolder = rootFolder || "src";
  const srcIndex = fullPath.indexOf(rootFolder);

  if (srcIndex === -1) {
    return fullPath;
  }

  const relativePath = fullPath.substring(srcIndex + rootFolder.length + 1);
  return relativePath;
};

const writeUnitTestsForFile = (webRenderer: IWebRenderer) => {
  const { index, files } = webRenderer.tempData;

  if (index >= files.length) {
    return "";
  }

  processCurrentFile(webRenderer, index, true);
};

const processCurrentFile = async (
  webRenderer: IWebRenderer,
  index: number,
  runNext: boolean
) => {
  const {
    files,
    prompt,
    aiProvider,
    gptModel,
    sourceFolder,
    testFolderName,
    testFileNamingConvention,
    autoRight,
    overWriteAction,
    terminated,
    openAIKey
  } = webRenderer.tempData;

  if (!openAIKey) {
    logMsg(`OpenAI key is required to proceed further.`, true);
    return;
  }

  webRenderer.tempData = {
    ...webRenderer.tempData,
    runNext
  };

  if (files[index]) {
    const filePath = files[index].fullPath;
    if (filePath) {
      let relativePath = getRelativePath(filePath, sourceFolder);
      const fileName = files[index].name;
      const testFileName = createSpecFileName(
        fileName,
        testFileNamingConvention
      );

      relativePath = relativePath
        .replace(fileName, testFileName)
        .replaceAll("\\", "/");

      relativePath = `${webRenderer.parentPath}/${testFolderName}/${relativePath}`;

      const ifTestFileExist = checkIfFileExist(relativePath);

      // Do not generate AI repsonse, if SKIP action is selected for existing files.
      if (
        runNext &&
        ifTestFileExist &&
        overWriteAction === TEST_BTN_ACTIONS.SKIP
      ) {
        updateTestProgress(
          webRenderer,
          `File not updated.`,
          EXECUTION_STATUS.FAILED,
          index
        );

        webRenderer.tempData = {
          ...webRenderer.tempData,
          index: index + 1
        };

        writeUnitTestsForFile(webRenderer);
        return;
      }

      const fileContent = getFileData(filePath);

      let testFileContent: any = ``;
      if (ifTestFileExist) {
        testFileContent = getFileData(relativePath);
      }

      const promptQuery = `${prompt}
    ${fileContent}
    `;

      webRenderer.sendMessageToUI("aiUnitTestCurrentContent", {
        currentFileName: fileName,
        currentPageNumber: `${index + 1} of ${files.length} File(s)`,
        // codeFileContent: ifTestFileExist ? testFileContent : "", // Uncomment below code to display existing test file content
        showCompare: false, //ifTestFileExist
        showStopExecution: runNext
      });

      updateTestProgress(
        webRenderer,
        `Generating unit test cases.`,
        EXECUTION_STATUS.RUNNING,
        index
      );

      webRenderer.sendMessageToUI("aiUnitTestGeneratedContent", {
        generatedContent: getScanningHTMLSmall(25, 25)
      });

      callOpenAI(
        webRenderer,
        promptQuery,
        aiProvider,
        gptModel,
        (
          resp: IRecord | null,
          err: IRecord | string | unknown | null,
          isComplete: boolean
        ) => {
          if (err) {
            updateTestProgress(
              webRenderer,
              `Something went wrong [${JSON.stringify(err)}]`,
              EXECUTION_STATUS.FAILED,
              index
            );
            return;
          }

          if (resp) {
            if (terminated === 1) {
              updateTestProgress(
                webRenderer,
                `Execution terminated.`,
                EXECUTION_STATUS.FAILED,
                index
              );

              webRenderer.sendMessageToUI("aiUnitTestUpdateActionContent", {
                htmlContent: "",
                index
              });

              webRenderer.sendMessageToUI("aiUnitTestGeneratedContent", {
                generatedContent: "Execution terminated."
              });
              return;
            }

            webRenderer.sendMessageToUI("aiUnitTestGeneratedContent", {
              generatedContent: marked((resp || []).join(""))
            });

            if (isComplete) {
              updateTestProgress(
                webRenderer,
                `Test cases generated successfully.`,
                EXECUTION_STATUS.COMPLETE,
                index
              );

              webRenderer.tempData = {
                ...webRenderer.tempData,
                index,
                files,
                generatedResponse: resp.join(""),
                fileWritePath: relativePath,
                fileName,
                filePath,
                testFileName,
                testFileContent
              };

              if (autoRight) {
                if (!ifTestFileExist) {
                  aiWriteTestsToFile(webRenderer, TEST_BTN_ACTIONS.WRITE);
                  return;
                } else {
                  switch (overWriteAction) {
                    case TEST_BTN_ACTIONS.OVERRIGHT:
                      aiWriteTestsToFile(
                        webRenderer,
                        TEST_BTN_ACTIONS.OVERRIGHT
                      );
                      return;

                    case TEST_BTN_ACTIONS.APPEND:
                      aiWriteTestsToFile(webRenderer, TEST_BTN_ACTIONS.APPEND);
                      return;
                  }
                }
              }

              const actionBtnHTML = getActionBtnsForTD(
                ifTestFileExist
                  ? TEST_BTN_ACTIONS.OVERRIGHT
                  : TEST_BTN_ACTIONS.WRITE
              );

              if (ifTestFileExist) {
                updateTestProgress(
                  webRenderer,
                  `Choose action to update: `,
                  EXECUTION_STATUS.CONFIRM,
                  index
                );
              }

              webRenderer.sendMessageToUI("aiUnitTestUpdateActionContent", {
                htmlContent: actionBtnHTML,
                index,
                showAction: actionBtnHTML ? true : false
              });
            }
          }
        }
      );
    }
  }
};

export const aiRunTestForSingleFile = (
  webRenderer: IWebRenderer,
  index: number
) => {
  webRenderer.tempData = {
    ...webRenderer.tempData,
    index
  };

  processCurrentFile(webRenderer, index, false);
};

export const aiProcessNextFile = (webRenderer: IWebRenderer) => {
  writeUnitTestsForFile(webRenderer);
};

export const aiWriteTestsToFile = (
  webRenderer: IWebRenderer,
  action: string
) => {
  const { index, generatedResponse, fileWritePath, testFileContent, runNext } =
    webRenderer.tempData;

  if (action === TEST_BTN_ACTIONS.SKIP) {
    updateTestProgress(
      webRenderer,
      testFileContent ? `File not updated.` : `File not created.`,
      EXECUTION_STATUS.FAILED,
      index
    );

    webRenderer.sendMessageToUI("aiUnitTestUpdateActionContent", {
      htmlContent: "",
      index
    });

    if (runNext) {
      webRenderer.tempData = {
        ...webRenderer.tempData,
        index: index + 1
      };
      writeUnitTestsForFile(webRenderer);
    }
    return;
  }

  let testContent = generatedResponse;

  switch (action) {
    case TEST_BTN_ACTIONS.APPEND:
      testContent = `${testFileContent}\n\n\n${generatedResponse}`;
      break;
  }

  const writeResponse = writeFile(fileWritePath, testContent);

  if (writeResponse) {
    updateTestProgress(
      webRenderer,
      testFileContent
        ? `File updated successfully.`
        : `File create successfully.`,
      EXECUTION_STATUS.COMPLETE,
      index
    );
  } else {
    updateTestProgress(
      webRenderer,
      `Failed writing test file.`,
      EXECUTION_STATUS.FAILED,
      index
    );
  }

  webRenderer.sendMessageToUI("aiUnitTestUpdateActionContent", {
    htmlContent: "",
    index
  });

  if (runNext) {
    webRenderer.tempData = {
      ...webRenderer.tempData,
      index: index + 1
    };

    // Add delay to avoid limit restrictions
    setTimeout(() => {
      writeUnitTestsForFile(webRenderer);
    }, 1000);
  }
};

export const terminateUnitTestRun = (webRenderer: IWebRenderer) => {
  confirmMsg(
    `This will terminate, after current execution. Are you sure?`,
    (success) => {
      if (success) {
        webRenderer.tempData = { ...webRenderer.tempData, terminated: 1 };
      }
    }
  );
};

export const aiSaveOpenAPIKey = (
  webRenderer: IWebRenderer,
  openAPIKey: string
) => {
  GLOBAL_STATE_MANAGER.setItem(
    webRenderer.context,
    LOCAL_STORAGE.OPEN_AI_KEY,
    openAPIKey
  );
  webRenderer.tempData = { ...webRenderer.tempData, openAPIKey };
  renderDashboardContent(webRenderer);
};

export const aiStartWritingUnitTests = (
  webRenderer: IWebRenderer,
  testConfig: IRecord
) => {
  const {
    prompt,
    testFolderName = "__tests__",
    testFileNamingConvention = "spec",
    sourceFolder = "src",
    autoRight,
    overWriteAction,
    singleRunIndex,
    gptModel,
    aiProvider = AIProvider.OPEN_AI
  } = testConfig || {};

  if (!prompt) {
    webRenderer.sendMessageToUI("aiUnitTestFilesContent", {
      htmlContent: `Invalid prompt value.`
    });
    return;
  }

  const { files } = webRenderer.tempData || {};

  if (!files || files.length === 0) {
    webRenderer.sendMessageToUI("aiUnitTestFilesContent", {
      htmlContent: `No file(s) found.`
    });
    return;
  }

  webRenderer.tempData = {
    ...webRenderer.tempData,
    prompt,
    testFolderName,
    testFileNamingConvention,
    sourceFolder,
    autoRight,
    overWriteAction,
    gptModel,
    aiProvider,
    index: 0,
    terminated: 0
  };

  if (singleRunIndex > -1) {
    aiRunTestForSingleFile(webRenderer, singleRunIndex);
    return;
  }

  confirmMsg(
    `This will start writing unit test cases for ${files.length} files. Are you sure?`,
    (success) => {
      if (success) {
        webRenderer.sendMessageToUI("aiClearUnitTestStatusContent", {
          htmlContent: "Not started",
          count: files.length
        });
        writeUnitTestsForFile(webRenderer);
      }
    }
  );
};

export const clearOpenAIKey = async (context: IContext) => {
  try {
    await GLOBAL_STATE_MANAGER.removeItem(context, LOCAL_STORAGE.OPEN_AI_KEY);
    logMsg("OpenAI Key Cleared Successfully.", true);
  } catch (e) {
    logMsg(`Failed clearing OpenAI Key [${JSON.stringify(e)}].`, true);
  }
};
