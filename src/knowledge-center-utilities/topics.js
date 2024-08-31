// @ts-nocheck
const { getFileDataFromExtension } = require("../util");

const KNOWLEDGE_TOPICS_IDS = {
  AZURE_ID_CONFIG: "azure_id_config",
  ACTIVATE_KENDO_LICENSE: "activate_kendo_license",
  ENABLE_HUSKY_COMMIT: "enable_husky_commit"
};

const STEP_COMMAND = {
  RUN_NPM_COMMAND: "RUN_NPM_COMMAND",
  INSTALL_PACKAGE: "INSTALL_PACKAGE",
  CREATE_FILE: "CREATE_FILE",
  APPEND_IN_FILE: "APPEND_IN_FILE",
  ADD_TO_PACKAGE_ATTRIBUTE: "ADD_TO_PACKAGE_ATTRIBUTE"
};

const getTopics = async (webRenderer) => {
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

module.exports = {
  KNOWLEDGE_TOPICS_IDS,
  STEP_COMMAND,
  getTopics
};
