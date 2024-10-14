import { EXECUTION_STATUS, PAGE_TITLE, SOURCE_TYPE } from "./constants";
import {
  checkIfFileExist,
  findFile,
  getFileContent,
  getScanningHTMLSmall,
  initializeAppInfo,
  logInFile,
  randomTxt,
  renderAccordianItem,
  renderFormField,
  runNPMCommand,
  splitButton,
  writeFile
} from "./util";

import {
  IRecord,
  ITopicItemType,
  ITopicStepType,
  IUri,
  IWebRenderer
} from "./common.types";
import {
  addIcon,
  checkedIcon,
  checkIcon,
  closeIcon,
  crossIconCircle,
  pencilIcon,
  playIcon,
  unCheckedIcon
} from "./icons";
import {
  getTopics,
  STEP_COMMAND,
  STEP_COMMAND_FOR_FILE,
  STEP_COMMAND_OPTIONS
} from "./knowledge-center-utilities/topics";

const SHOW_ADMIN_FEATURES = false;
let KNOWLEDGE_TOPICS: Array<ITopicItemType> = [];

const renderTopicTable = (webRenderer: IWebRenderer) => {
  let tableStr = `<table class='table table-striped table-bordered table-sm tbl-knowledge' id='tblKnowledge'>
    <tr>
      <th style='width:50px'>#</th>
      <th class='text-align-left'>Solution</th>
      ${
        SHOW_ADMIN_FEATURES
          ? `<th class='hide-on-browser' style='width:50px'>Edit</th>`
          : ""
      } 
      <th class='hide-on-browser' style='width:50px'>Start</th>
    </tr>`;

  KNOWLEDGE_TOPICS.map((topic, index) => {
    if (topic) {
      tableStr += `
      <tr id='tr_${topic.id}'>
        <td class='text-center'>${index + 1}</td>
        <td>
          <a href='javascript:void(0)' 
             class='a-blue-bold' 
             onclick="showTopicDetails('${topic.id}')">
                ${topic.title}
          </a>
        </td>

        ${
          SHOW_ADMIN_FEATURES
            ? `<td class='hide-on-browser webkit-text-align'>
          ${splitButton(
            pencilIcon(16),
            `Edit`,
            `onclick="editTopic('${topic.id}')"`,
            "",
            `sm`
          )}
        </td>`
            : ""
        }

        <td class='hide-on-browser webkit-text-align'>
          ${splitButton(
            playIcon(16),
            `Start`,
            `onclick="executeTopicSteps('${topic.id}')"`,
            "",
            `sm`
          )}
        </td>
      </tr>
      `;
    }
  });

  tableStr += `
      </table>
    `;

  webRenderer.sendMessageToUI("knowledgeTopicTableContent", {
    htmlContent: tableStr
  });
};

const getStepFieldsHTML = (id: number | string, step?: ITopicStepType) => {
  let htmlStr = `
    <div id='step_fields_${id}' class='topic_step white-code-box mb-1 p-1' data-step-id='${id}'>
      <div class='flex-group'>
  `;

  let selectStr = `<select 
    name="step_command_type_${id}" 
    class='form-input' 
    id="step_command_type_${id}" 
    value="${step?.commandType}"
    onchange="handleAddTopicCommandChange(event, '${id}')">`;

  (STEP_COMMAND_OPTIONS || []).map(
    (option: { label: string; value: string }) => {
      selectStr += `<option value="${option.value}">${option.label}</option>`;
    }
  );

  selectStr += "</select>";

  htmlStr += renderFormField(
    `step_title_${id}`,
    "Title",
    `<input type='text' id='step_title_${id}' class='form-input' value="${
      step?.title || ""
    }" />`,
    {
      className: "w-100",
      hidden: false,
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_description_${id}`,
    "Description",
    `<textarea rows='5' id='step_description_${id}' class='form-textarea'>${
      step?.description || ""
    }</textarea>`,
    {
      className: "w-100",
      hidden: false,
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_command_type_${id}`,
    "Command Type",
    selectStr,
    {
      className: "w-49",
      hidden: false,
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_command_text_${id}`,
    "Command Text",
    `<input type='text' id='step_command_text_${id}' class='form-input' value="${
      step?.command || ""
    }" />`,
    {
      hidden: STEP_COMMAND_FOR_FILE.includes(step?.commandType || ""),
      className: "w-49",
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_file_name_${id}`,
    "Filename",
    `<input type='text' id='step_file_name_${id}' class='form-input' value="${
      step?.fileName || ""
    }" />`,
    {
      hidden: !STEP_COMMAND_FOR_FILE.includes(step?.commandType || ""),
      className: "w-49",
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_file_content_${id}`,
    "File Content",
    `<textarea rows='5' id='step_file_content_${id}' class='form-textarea'>${
      step?.fileContent || ""
    }</textarea>`,
    {
      hidden: !STEP_COMMAND_FOR_FILE.includes(step?.commandType || ""),
      className: "w-100",
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_success_message_${id}`,
    "Success Message",
    `<input type='text' id='step_success_message_${id}' class='form-input' value="${
      step?.successMsg || ""
    }" />`,
    {
      hidden: false,
      className: "w-49",
      required: true
    }
  );

  htmlStr += renderFormField(
    `step_error_message_${id}`,
    "Error Message",
    `<input type='text' id='step_error_message_${id}' class='form-input' value="${
      step?.errorMsg || ""
    }" />`,
    {
      hidden: false,
      className: "w-49",
      required: true
    }
  );

  htmlStr += `</div>
  </div>`;

  return renderAccordianItem(
    `topic_form_${id}`,
    `Step ${id}${step?.title ? `: ${step?.title}` : ""}`,
    htmlStr
  );
};

const renderTopicForm = (
  webRenderer: IWebRenderer,
  topicId?: number | string | null
) => {
  let topic: ITopicItemType | undefined = {
    id: -1,
    title: "",
    description: "",
    steps: [
      {
        id: randomTxt(),
        command: "",
        description: "",
        title: ""
      }
    ]
  };

  if (topicId) {
    topic = KNOWLEDGE_TOPICS.find((topic) => topic.id == topicId);
  }

  let htmlStr = `
  <div class='app-info'>
  `;

  htmlStr += `<div class='form-group mb-1'>`;

  htmlStr += `<div class='mb-1'>
        ${renderFormField(
          `topic_title`,
          "Title",
          `<input type='text' id='topic_title' class='form-input' value="${topic?.title}" />`
        )}

        ${renderFormField(
          "topic_description",
          "Description",
          `<textarea rows='5' id='topic_description' class='form-textarea'>${topic?.description}</textarea>`
        )}
      </div>`;

  htmlStr += `<div class='mb-1'>
        <div class='flex flex-space-between mb-1 flex-align-center'>
          <h3 class='grey-header mt-0'>Steps</h3>
          ${splitButton(
            addIcon(16),
            `Add Step`,
            `onclick="addStep()"`,
            ``,
            `hide-on-browser sm`
          )}
        </div>
        `;

  htmlStr += `<div class="accordion">`;

  htmlStr += `<div id='topic_steps'>`;
  topic?.steps?.map((step: ITopicStepType) => {
    htmlStr += getStepFieldsHTML(step.id, step);
  });

  htmlStr += `</div>
        </div>
      </div>
  </div>`;

  webRenderer.sendMessageToUI("knowledgeAddTopicContent", {
    htmlContent: htmlStr
  });
};

const getWebviewContent = () => {
  let viewStr = `
      <div class='flex-group'>
            <h3 class='grey-header mt-0'>
              <span id='topic_page_title'>Solutions Hub</span>
            </h3>

            ${
              SHOW_ADMIN_FEATURES
                ? `<div class='float-right'>
              ${splitButton(
                addIcon(18),
                `Add Solution`,
                `onclick="addTopic()"`,
                ``,
                `float-right sm grey`,
                "topic_add_btn"
              )}

              ${splitButton(
                closeIcon(18),
                `Cancel`,
                `onclick="closeAddTopic()"`,
                ``,
                `float-right sm grey`,
                "topic_add_cancel",
                `style="display:none"`
              )}

              ${splitButton(
                checkIcon(16),
                `Save Solution`,
                `onclick="saveNewTopic()"`,
                ``,
                `float-right sm mr-1`,
                "topic_add_save",
                `style="display:none"`
              )}
            </div>`
                : ""
            }
      </div>

      <div class='flex-group'>
        <div class='flex-1' id='knowledge_topics'></div>
        <div class='flex-1 details-section' id='knowledge_topics_details' style="display:none">
          <div id='knowledge_topics_details_info'></div>
          <div id='knowledge_topics_details_steps'></div>
          <div id='knowledge_topics_details_execution'></div>
        </div>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', function() {
          toggleLeftMenuItem('li_knowledge_center');
        });
      </script>
   `;

  return viewStr;
};

export const renderKnowledgeCenter = async (
  webRenderer: IWebRenderer,
  fileURI: IUri
) => {
  await initializeAppInfo(webRenderer);

  let content = getWebviewContent();
  webRenderer.content = content;

  await webRenderer.renderContent(
    content,
    PAGE_TITLE.TITLE,
    SOURCE_TYPE.PROJECT
  );

  KNOWLEDGE_TOPICS = await getTopics(webRenderer);
  renderTopicTable(webRenderer);
};

export const showTopicInfo = (
  webRenderer: IWebRenderer,
  topicId: number | string
) => {
  const STEP_COMMAND_FOR_FILE = ["CREATE_FILE", "APPEND_IN_FILE"];

  let htmlStr = `Solution Not Found.`;
  const topic: ITopicItemType | undefined = KNOWLEDGE_TOPICS.find(
    (topic) => topic.id == topicId
  );
  if (topic) {
    htmlStr = ``;

    if (topic.steps && topic.steps.length > 0) {
      htmlStr += `<div class="accordion">`;
      topic.steps.map((step: ITopicStepType) => {
        let stepDesc = step.description;

        if (STEP_COMMAND_FOR_FILE.includes(step.commandType || "")) {
          stepDesc = `<div class='mb-1 b'>Below content will be added:</div>
                      <div class='break-spaces'>${step.fileContent}</div>`;
        }

        htmlStr += renderAccordianItem(
          `topic_${topic.id}_${step.id}`,
          step.title,
          `<div class='p-1'>${stepDesc}</div>`
        );
      });
      htmlStr += `</div>`;
    }
  }

  webRenderer.sendMessageToUI("knowledgeTopicDetailContent", {
    topicInfo: `<div>${topic?.description}</div>`,
    htmlContent: htmlStr
  });
};

const getStepExecutionHTML = (steps: Array<ITopicStepType>) => {
  let stepsStr = `<div class='execution-status-box'>`;

  steps.map((step) => {
    let stepIcon = unCheckedIcon;
    let stepCls = ``;
    switch (step.status) {
      case EXECUTION_STATUS.RUNNING:
        stepIcon = getScanningHTMLSmall(15, 15);
        stepCls = `box-yellow-alt`;
        break;

      case EXECUTION_STATUS.COMPLETE:
        stepIcon = checkedIcon;
        stepCls = `box-success-alt`;
        break;

      case EXECUTION_STATUS.FAILED:
        stepIcon = crossIconCircle(25);
        stepCls = `box-high`;
        break;
    }

    stepsStr += `
    <div class='flex-group execution-step mb-1 ${stepCls}'>
      <div class='flex' style='width:50px'>${stepIcon}</div>
      <div class='flex statement'>${step.title}</div>
    </div>

    ${step.subtitle ? `<div class='sub-statement'>${step.subtitle}</div>` : ""}
    `;
  });
  stepsStr += `</div>`;
  return stepsStr;
};

const commandUtil: IRecord = {
  webRenderer: null,
  topic: null,
  steps: [],
  renderSteps: () => {
    if (commandUtil.webRenderer) {
      commandUtil.webRenderer.sendMessageToUI(
        "knowledgeTopicExecutionContent",
        {
          htmlContent: getStepExecutionHTML(commandUtil.steps),
          topicInfo: `<div>${commandUtil.topic.info}</div>`
        }
      );
    }
  },
  writeFile: (
    step: ITopicStepType,
    cb: (success: boolean, res: any) => void
  ) => {
    const { fileName, fileContent } = step;
    const filePath = `${commandUtil.webRenderer.parentPath}/${fileName}`;
    const writeResponse = writeFile(filePath, fileContent || "");

    if (writeResponse) {
      cb(true, "");
      return;
    }

    cb(false, "");
  },
  appendFile: async (
    step: ITopicStepType,
    cb: (success: boolean, res: any) => void
  ) => {
    const { fileName, fileContent } = step;
    const filePath = `${commandUtil.webRenderer.parentPath}/${fileName}`;
    let isSuccess = false;
    const ifFileExist = checkIfFileExist(filePath);
    let writeResponse = null;

    if (!ifFileExist) {
      writeResponse = writeFile(filePath, fileContent || "");

      if (writeResponse) {
        cb(true, "");
        isSuccess = true;
        return;
      }
    } else {
      const envFile = await findFile(
        fileName || "",
        commandUtil.webRenderer.parentPath
      );

      if (envFile) {
        const content = await getFileContent(envFile);

        writeResponse = writeFile(
          filePath,
          `${content}
${fileContent}`
        );

        if (writeResponse) {
          isSuccess = true;
        }
      }

      if (isSuccess) {
        cb(true, "");
        return;
      }

      cb(false, "");
    }
  },
  addToPackageAttribute: async (
    step: ITopicStepType,
    cb: (success: boolean, res: any) => void
  ) => {
    const {
      commandAttribute = "",
      commandAddAttributeKey = "",
      commandAddAttributeValue = ""
    } = step;

    const packageJSON: IRecord = commandUtil.webRenderer.pkgJSON;

    const packageAttribute = packageJSON[commandAttribute];
    if (!packageAttribute) {
      packageJSON[commandAttribute] = {
        [commandAddAttributeKey]: commandAddAttributeValue
      };
    } else {
      packageJSON[commandAttribute] = {
        ...packageJSON[commandAttribute],
        [commandAddAttributeKey]: commandAddAttributeValue
      };
    }

    const filePath = `${commandUtil.webRenderer.parentPath}/package.json`;
    let isSuccess = false;
    let writeResponse = writeFile(filePath, JSON.stringify(packageJSON));

    if (writeResponse) {
      cb(true, "");
      isSuccess = true;
      return;
    }

    cb(false, "");
  },
  updateStepStatus: (stepIndex: number, success: boolean, resp: any) => {
    const step = commandUtil.steps[stepIndex];
    if (success) {
      step.status = EXECUTION_STATUS.COMPLETE;
      step.title = step.successMsg;
      commandUtil.renderSteps();
    } else {
      step.status = EXECUTION_STATUS.FAILED;
      step.title = step.errorMsg;
      step.subtitle = `${step.errorMsg} Error Stack [${JSON.stringify(resp)}]`;
      commandUtil.renderSteps();
    }
  },
  startExecution: () => {
    commandUtil.steps.map((step: ITopicStepType, stepIndex: number) => {
      step.status = EXECUTION_STATUS.RUNNING;
      commandUtil.renderSteps();

      switch (step.commandType) {
        case STEP_COMMAND.RUN_NPM_COMMAND:
        case STEP_COMMAND.INSTALL_PACKAGE:
          runNPMCommand(
            commandUtil.webRenderer,
            step.command,
            (success, resp) => {
              commandUtil.updateStepStatus(stepIndex, success, resp);
            }
          );
          break;

        case STEP_COMMAND.CREATE_FILE:
          commandUtil.writeFile(step, (success: boolean, resp: any) => {
            commandUtil.updateStepStatus(stepIndex, success, resp);
          });
          break;

        case STEP_COMMAND.APPEND_IN_FILE:
          commandUtil.appendFile(step, (success: boolean, resp: string) => {
            commandUtil.updateStepStatus(stepIndex, success, resp);
          });
          break;

        case STEP_COMMAND.ADD_TO_PACKAGE_ATTRIBUTE:
          commandUtil.addToPackageAttribute(
            step,
            (success: boolean, resp: any) => {
              commandUtil.updateStepStatus(stepIndex, success, resp);
            }
          );
          break;
      }
    });
  }
};

export const startTopicSteps = (webRenderer: IWebRenderer, topicId: number) => {
  const topic: ITopicItemType | undefined = KNOWLEDGE_TOPICS.find(
    (topic) => topic.id == topicId
  );

  if (topic) {
    commandUtil.webRenderer = webRenderer;
    commandUtil.topic = topic;
    commandUtil.steps = topic.steps;
    commandUtil.renderSteps();
    commandUtil.startExecution();
  }
};

export const addNewTopic = (webRenderer: IWebRenderer) => {
  renderTopicForm(webRenderer, null);
};

export const editTopic = (
  webRenderer: IWebRenderer,
  topicId: string | number
) => {
  renderTopicForm(webRenderer, topicId);
};

export const saveNewTopic = (
  webRenderer: IWebRenderer,
  data: { title: string; description: string; steps: Array<IRecord> }
) => {
  logInFile(data, webRenderer.extensionPath);
};

export const addStepToTopic = (webRenderer: IWebRenderer) => {
  webRenderer.sendMessageToUI("knowledgeTopicAddStep", {
    htmlContent: getStepFieldsHTML(randomTxt())
  });
};

export const closeAddUpdateTopic = async (webRenderer: IWebRenderer) => {
  KNOWLEDGE_TOPICS = await getTopics(webRenderer);
  renderTopicTable(webRenderer);
};
