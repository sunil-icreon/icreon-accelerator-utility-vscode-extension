const { OpenAI } = require("openai");
const { marked } = require("marked");

const {
  EXTENSION_CONFIG,
  LOCAL_STORAGE,
  DEFAULT_GPT_MODELS,
  EXECUTION_STATUS
} = require("./constants");

const {
  GLOBAL_STATE_MANAGER,
  getExtenConfigValue,
  logMsg,
  getSearchingHTML
} = require("./util");

let openAIClient = null;

const getOpenAPIKey = async (context) => {
  return await GLOBAL_STATE_MANAGER.getItem(context, LOCAL_STORAGE.OPEN_AI_KEY);
};

const getOpenAIClient = async (webRenderer) => {
  if (openAIClient) {
    return openAIClient;
  }

  let openAIKey = await getOpenAPIKey(webRenderer.context);

  try {
    openAIClient = new OpenAI({
      apiKey: openAIKey
    });
    return openAIClient;
  } catch (e) {
    logMsg(
      `Failed connecting to OpenAI. Please validate the API Key and its usage.`,
      true
    );
  }
};

const callOpenAI = async (webRenderer, prompt, gptModel, cb) => {
  const client = await getOpenAIClient(webRenderer);
  if (!client) {
    cb &&
      cb(null, `Error connecting to openAI. Please verify openAI key.`, true);

    return;
  }

  gptModel = gptModel || DEFAULT_GPT_MODELS[0];
  try {
    const client = await getOpenAIClient(webRenderer);
    if (!client) {
      cb &&
        cb(null, `Error connecting to openAI. Please verify openAI key.`, true);

      return;
    }

    // const chatCompletion = await client.chat.completions.create({
    //   messages: [
    //     {
    //       role: "user",
    //       content: "How to scan vulnerabilities in react application"
    //     }
    //   ],
    //   model: "gpt-3.5-turbo"
    // });

    // logInFile(JSON.stringify(chatCompletion), webRenderer.extensionPath);

    const stream = await client.chat.completions.create({
      model: gptModel,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: true
    });

    let resp = [];
    let compResp = [];
    for await (const chunk of stream) {
      resp = [...resp, chunk.choices[0]?.delta?.content || ""];
      compResp = [...compResp, chunk.choices];
      cb && cb(resp, null, false, compResp);
    }
    cb && cb(resp, null, true, compResp);
  } catch (e) {
    cb && cb([], e, true);
  }
};

const getAIModels = () => {
  const gptModelsFromConfig = getExtenConfigValue(EXTENSION_CONFIG.GPT_MODELS);
  return gptModelsFromConfig || DEFAULT_GPT_MODELS;
};

const renderAISearchTool = async (webRenderer, containerId, id) => {
  const openAPIKey = await getOpenAPIKey(webRenderer.context);
  let htmlStr = ``;

  if (!openAPIKey) {
    htmlStr = `
    <div class='ai-unit-app'>
        <h4 class='grey-header text-danger'>OpenAI Key Not Found!</h4>
        <div class='flex-group flex-justify-start'>
           Please add 'Open API Key' via <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('config')">Configuration</a> link.
        </div>
    </div>`;
  } else {
    htmlStr += `
    <div class='ai-gpt-search ai-unit-app'>
        <div class='flex-group flex-justify-start'>
          <div class='column-box flex-grow-1 box-1'>
            <h4 class='grey-header'>Search in ChatGPT</h4>  
            <div class='open-api-input '>
              <div class='field flex-grow-1'>
                    <span class='field-label'>Prompt</span>
                    <input type='text' id="${id}_ai_search_input" onkeypress="handleOpenAISearchToolInputKeyPress(event, '${containerId}','${id}')" class='form-input' placeholder='Enter prompt...'  />
              </div>

              ${renderGPTModelDropdown(id)}

              <div class='field'>
                  <span class='field-label'>&nbsp;</span>
                  <button type='button' 
                      class='submit-btn hide-on-browser-1' 
                      onclick="aiSearchInGPT('${containerId}','${id}')">
                      Search
                  </button>
              </div>
          </div>
        </div>
    </div>
    <div class='flex-grow-1 mt-1'>
            <div id="${containerId}_search_output" style="display:none" class='html-code'></div>
    </div>
    `;
  }

  return htmlStr;
};

const renderGPTModelDropdown = (id) => {
  id = id || 1;
  const aiModels = getAIModels();
  let aiModelOptionsStr = ``;
  if (aiModels && Array.isArray(aiModels) && aiModels.length > 0) {
    aiModelOptionsStr = `
    <div class='field'>
       <span class='field-label'>AI Model</span>
       <select name="ai_model_select" id="ai_model_select_${id}">`;

    (aiModels || []).map((model) => {
      aiModelOptionsStr += `<option value="${model}">${model}</option>`;
    });

    aiModelOptionsStr += `
        </select>
      </div>
`;
  }

  return aiModelOptionsStr;
};

const searchInGPT = (webRenderer, data) => {
  const { prompt, containerId, gptModel } = data;

  if (!prompt) {
    logMsg("Prompt is required to proceed further.", true);
    return;
  }

  webRenderer.sendMessageToUI("aiSearchInGPTContent", {
    containerId,
    status: EXECUTION_STATUS.FAILED,
    htmlContent: getSearchingHTML("Thinking")
  });

  callOpenAI(
    webRenderer,
    prompt,
    gptModel,
    (resp, err, isComplete, compResp) => {
      if (err) {
        webRenderer.sendMessageToUI("aiSearchInGPTContent", {
          containerId,
          status: EXECUTION_STATUS.FAILED,
          htmlContent: `<span class='danger'>Error reading content from GPT [${JSON.stringify(
            err
          )}].</span>`
        });
        return;
      }

      if (resp) {
        let status = isComplete
          ? EXECUTION_STATUS.COMPLETE
          : EXECUTION_STATUS.RUNNING;

        webRenderer.sendMessageToUI("aiSearchInGPTContent", {
          containerId,
          status,
          htmlContent: marked((resp || []).join(""))
        });
      }
    }
  );
};

module.exports = {
  getAIModels,
  callOpenAI,
  getOpenAPIKey,
  searchInGPT,
  renderGPTModelDropdown,
  renderAISearchTool
};
