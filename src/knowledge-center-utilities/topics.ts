// @ts-nocheck

const { getFileDataFromExtension } = require("../util");

export const STEP_COMMAND_FOR_FILE = ["CREATE_FILE", "APPEND_IN_FILE"];

export const KNOWLEDGE_TOPICS_IDS = {
  ACTIVATE_KENDO_LICENSE: "activate_kendo_license",
  ENABLE_HUSKY_COMMIT: "enable_husky_commit"
};

export const STEP_COMMAND = {
  RUN_NPM_COMMAND: "RUN_NPM_COMMAND",
  INSTALL_PACKAGE: "INSTALL_PACKAGE",
  CREATE_FILE: "CREATE_FILE",
  APPEND_IN_FILE: "APPEND_IN_FILE",
  ADD_TO_PACKAGE_ATTRIBUTE: "ADD_TO_PACKAGE_ATTRIBUTE"
};

export const STEP_COMMAND_TYPES = [
  STEP_COMMAND.RUN_NPM_COMMAND,
  STEP_COMMAND.INSTALL_PACKAGE,
  STEP_COMMAND.CREATE_FILE,
  STEP_COMMAND.APPEND_IN_FILE,
  STEP_COMMAND.ADD_TO_PACKAGE_ATTRIBUTE
];

export const STEP_COMMAND_OPTIONS = [
  {
    label: "Run NPM Command",
    value: STEP_COMMAND.RUN_NPM_COMMAND
  },
  {
    label: "Install Package",
    value: STEP_COMMAND.INSTALL_PACKAGE
  },
  {
    label: "Create File",
    value: STEP_COMMAND.CREATE_FILE
  },
  {
    label: "Append File",
    value: STEP_COMMAND.APPEND_IN_FILE
  },
  {
    label: "Add Properties in Package.json",
    value: STEP_COMMAND.ADD_TO_PACKAGE_ATTRIBUTE
  }
];

export const getTopics = async (webRenderer) => {
  const azureTopic = await getFileDataFromExtension(
    webRenderer.extensionPath,
    "media/content/knowledge-center-content/azure-ad.json"
  );
  const kendoTopic = await getFileDataFromExtension(
    webRenderer.extensionPath,
    "media/content/knowledge-center-content/kendo-license-activation.json"
  );

  return [JSON.parse(azureTopic), JSON.parse(kendoTopic)];
};
