const {
  SOURCE_TYPE,
  LOCAL_STORAGE,
  IGNORE_PATHS,
  PAGE_TITLE
} = require("./constants");

const {
  GLOBAL_STATE_MANAGER,
  initializeAppInfo,
  logMsg,
  logErrorMsg,
  renderFormField
} = require("./util");

const getWebviewContent = async (webRenderer) => {
  const getValue = async (key, defaultValue) => {
    return (
      (await GLOBAL_STATE_MANAGER.getItem(webRenderer.context, key)) ??
      defaultValue
    );
  };

  const openAIKey = await getValue(LOCAL_STORAGE.OPEN_AI_KEY);

  const ignoreStandardFolders = await getValue(
    LOCAL_STORAGE.IGNORE_PATH_STANDARD_FOLDERS,
    IGNORE_PATHS.FOLDER.join(", ")
  );

  const ignoreStandardFiles = await getValue(
    LOCAL_STORAGE.IGNORE_PATH_STANDARD_FILES,
    IGNORE_PATHS.FILES.join(", ")
  );

  const ignoreUnitTestFolders = await getValue(
    LOCAL_STORAGE.IGNORE_UNIT_TEST_FOLDERS,
    IGNORE_PATHS.UNIT_TEST_FOLDER.join(", ")
  );

  const ignoreUnitTestFiles = await getValue(
    LOCAL_STORAGE.IGNORE_UNIT_TEST_FILES,
    IGNORE_PATHS.UNIT_TEST_FILES.join(", ")
  );

  const vulnerabilityURL = await getValue(
    LOCAL_STORAGE.VULNERABILITY_SERVER_URL,
    ""
  );

  const projectInfoURL = await getValue(
    LOCAL_STORAGE.PROJECT_INFO_SERVER_URL,
    ""
  );

  let htmlStr = `
  <div class='app-info'>
    <h4 class='grey-header mt-0'>Configurations</h4>
  `;

  htmlStr += `
  <div class='form-group mb-1'>
      <div class='mb-1 box-1'>
        ${renderFormField(
          "Open API Key",
          `<input type='password' id='open_ai_api_key' value="${
            openAIKey ? "NOT_ENTERED" : ""
          }" class='form-input' placeholder='Enter OpenAI API Key'  />`
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "Ignore folders",
          `<input type='text' id='ignore_standard_folders' class='form-input' value="${ignoreStandardFolders}" />`,
          "Ignore these folders while processing files."
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "Ignore files",
          `<input type='text' id='ignore_standard_files' class='form-input' value="${ignoreStandardFiles}" />`,
          "Ignore these files while processing files."
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "Ignore folders for unit tests",
          `<input type='text' id='ignore_unit_test_folders' class='form-input' value="${ignoreUnitTestFolders}" />`,
          "Ignore these folders while writing unit tests."
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "Ignore files for unit tests",
          `<input type='text' id='ignore_unit_test_files' class='form-input' value="${ignoreUnitTestFiles}" />`,
          "ignore these files while writing unit tests."
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "API Url for project information",
          `<input type='text' id='project_info_url' class='form-input' value="${projectInfoURL}" />`,
          `This URL will be used to GET/POST project information to to server.`
        )}
      </div>

      <div class='mb-1 box-1'>
        ${renderFormField(
          "API Url for vulnerability data",
          `<input type='text' id='vulnerability_url' class='form-input' value="${vulnerabilityURL}" />`,
          `This URL will be used to GET/POST npm package vulnerability data to server.`
        )}
      </div>
    </div>

    <div>
          <button type='button' 
            class='submit-btn hide-on-browser-1' 
            onclick="saveConfigurations()">
            Save Configurations
          </button>
    </div>
  </div>`;

  htmlStr += `</div>`;

  htmlStr += `<script>
      document.addEventListener('DOMContentLoaded', function() {
        toggleLeftMenuItem('li_config');
      });
    </script>`;

  return htmlStr;
};

const saveConfigurations = async (webRenderer, data) => {
  if (!data) {
    logMsg("No data found to save.");
    return;
  }

  let { apiKey } = data;
  const {
    ignoreStandarFolders,
    ignoreStandarFiles,
    ignoreUnitTestFolders,
    ignoreUnitTestFiles,
    projectInfoServerURL,
    vulnerabilityServerURL
  } = data;

  if (apiKey === "NOT_ENTERED") {
    apiKey = await GLOBAL_STATE_MANAGER.getItem(
      webRenderer.context,
      LOCAL_STORAGE.OPEN_AI_KEY
    );
  }

  const saveVal = async (key, value) => {
    await GLOBAL_STATE_MANAGER.setItem(webRenderer.context, key, value);
  };

  try {
    saveVal(LOCAL_STORAGE.OPEN_AI_KEY, apiKey);
    saveVal(LOCAL_STORAGE.IGNORE_PATH_STANDARD_FOLDERS, ignoreStandarFolders);
    saveVal(LOCAL_STORAGE.IGNORE_PATH_STANDARD_FILES, ignoreStandarFiles);
    saveVal(LOCAL_STORAGE.IGNORE_UNIT_TEST_FOLDERS, ignoreUnitTestFolders);
    saveVal(LOCAL_STORAGE.IGNORE_UNIT_TEST_FILES, ignoreUnitTestFiles);
    saveVal(LOCAL_STORAGE.PROJECT_INFO_SERVER_URL, projectInfoServerURL);
    saveVal(LOCAL_STORAGE.VULNERABILITY_SERVER_URL, vulnerabilityServerURL);

    logMsg("Configurations saved succssfully.", true);
  } catch (e) {
    logErrorMsg(`Error saving configurations.`);
  }
};
const renderConfigPage = async (webRenderer, sourceType) => {
  await initializeAppInfo(webRenderer);

  let content = await getWebviewContent(webRenderer);
  webRenderer.content = content;
  webRenderer.renderContent(
    content,
    PAGE_TITLE.CONFIGURATION,
    sourceType || SOURCE_TYPE.PROJECT
  );
};

module.exports = {
  renderConfigPage,
  saveConfigurations
};
