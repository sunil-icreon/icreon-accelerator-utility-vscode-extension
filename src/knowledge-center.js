const vscode = require("vscode");

const {
  KNOWLEDGE_CENTER,
  EXECUTION_STATUS,
  SOURCE_TYPE
} = require("./constants");
const {
  checkedIcon,
  getScanningHTMLSmall,
  unCheckedIcon,
  writeFile,
  getFileContent,
  checkIfFileExist,
  findFile,
  crossIconCircle,
  initializeAppInfo,
  runNPMCommand,
  renderPackageScripts,
  logInFile
} = require("./util");
const {
  getTopics,
  STEP_COMMAND
} = require("./knowledge-center-utilities/topics");

let KNOWLEDGE_TOPICS = [];
const getWebviewContent = (title) => {
  let topicStr = `
  <table class='table table-striped table-bordered table-sm tbl-knowledge' id='tblKnowledge'>
    <tr>
      <th>#</th>
      <th class='text-align-left'>Topic</th>
      <th class='hide-on-browser'>Action</th>
    </tr>`;

  KNOWLEDGE_TOPICS.map((topic, index) => {
    if (topic) {
      topicStr += `
    <tr id='tr_${topic.id}'>
      <td class='text-center'>${index + 1}</td>
      <td>
        <a href='javascript:void(0)' 
           class='a-blue-bold' 
           onclick="showTopicDetails('${topic.id}')">
              ${topic.title}
        </a>
      </td>
      <td class='hide-on-browser'>
          <button class='action-button' 
              onclick="executeTopicSteps('${topic.id}')">
              Start
          </button>
      </td>
    </tr>
    `;
    }
  });

  topicStr += `
    </table>
  `;
  let viewStr = `
      <div class='flex-group'>
        <div class='flex-1' id='knowledge_topics'>${topicStr}</div>
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

const renderKnowledgeCenter = async (webRenderer, fileURI) => {
  vscode.workspace.openTextDocument(fileURI).then(async (document) => {
    await initializeAppInfo(webRenderer);

    KNOWLEDGE_TOPICS = await getTopics(webRenderer);

    let content = getWebviewContent(KNOWLEDGE_CENTER.TITLE);
    webRenderer.content = content;
    webRenderer.renderContent(
      content,
      KNOWLEDGE_CENTER.TITLE,
      SOURCE_TYPE.PROJECT
    );
  });
};

const showTopicInfo = (webRenderer, topicId) => {
  let htmlStr = `Topic Not Found.`;
  const topic = KNOWLEDGE_TOPICS.find((topic) => topic.id === topicId);
  if (topic) {
    htmlStr = ``;

    if (topic.displaySteps && topic.displaySteps.length > 0) {
      htmlStr += `<div class="accordion">`;
      topic.displaySteps.map((step) => {
        htmlStr += `<div class="accordion-item" id="topic_${topic.id}_${step.id}_accordian_item" >
              <button class="accordion-header">
              <div class='summary-box'>
                  <b>${step.title}</b>
              </div>
              <span class="icon">+</span></button>
              <div class="accordion-content">
                <div class='p-1'>${step.description}</div>
              </div>
          </div>`;
      });
      htmlStr += `</div>`;
    }
  }

  webRenderer.sendMessageToUI("knowledgeTopicDetailContent", {
    topicInfo: `<div>${topic.info}</div>`,
    htmlContent: htmlStr
  });
};

const getStepExecutionHTML = (steps) => {
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

const commandUtil = {
  webRenderer: null,
  topic: null,
  steps: [],
  renderSteps: () => {
    commandUtil.webRenderer?.sendMessageToUI("knowledgeTopicExecutionContent", {
      htmlContent: getStepExecutionHTML(commandUtil.steps),
      topicInfo: `<div>${commandUtil.topic.info}</div>`
    });
  },
  writeFile: (step, cb) => {
    const { fileName, fileContent } = step;
    const filePath = `${commandUtil.webRenderer.parentPath}/${fileName}`;
    const writeResponse = writeFile(filePath, fileContent);

    if (writeResponse) {
      cb(true, "");
      return;
    }

    cb(false, "");
  },
  appendFile: async (step, cb) => {
    const { fileName, fileContent } = step;
    const filePath = `${commandUtil.webRenderer.parentPath}/${fileName}`;
    let isSuccess = false;
    const ifFileExist = checkIfFileExist(filePath);
    let writeResponse = null;

    if (!ifFileExist) {
      writeResponse = writeFile(filePath, fileContent);

      if (writeResponse) {
        cb(true, "");
        isSuccess = true;
        return;
      }
    } else {
      const envFile = await findFile(
        fileName,
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
  addToPackageAttribute: async (step, cb) => {
    const {
      commandAttribute,
      commandAddAttributeKey,
      commandAddAttributeValue
    } = step;
    const packageJSON = commandUtil.webRenderer.pkgJSON;

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
  updateStepStatus: (stepIndex, success, resp) => {
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
    commandUtil.steps.map((step, stepIndex) => {
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
          commandUtil.writeFile(step, (success, resp) => {
            commandUtil.updateStepStatus(stepIndex, success, resp);
          });
          break;

        case STEP_COMMAND.APPEND_IN_FILE:
          commandUtil.appendFile(step, (success, resp) => {
            commandUtil.updateStepStatus(stepIndex, success, resp);
          });
          break;

        case STEP_COMMAND.ADD_TO_PACKAGE_ATTRIBUTE:
          commandUtil.addToPackageAttribute(step, (success, resp) => {
            commandUtil.updateStepStatus(stepIndex, success, resp);
          });
          break;
      }
    });
  }
};

const startTopicSteps = (webRenderer, topicId) => {
  const topic = KNOWLEDGE_TOPICS.find((topic) => topic.id === topicId);

  if (topic) {
    commandUtil.webRenderer = webRenderer;
    commandUtil.topic = topic;
    commandUtil.steps = topic.steps;
    commandUtil.renderSteps();
    commandUtil.startExecution();
  }
};

module.exports = {
  renderKnowledgeCenter,
  showTopicInfo,
  startTopicSteps
};
