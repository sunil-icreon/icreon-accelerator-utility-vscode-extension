import { marked } from "marked";
import { OpenAI } from "openai";

import {
  DEFAULT_GPT_MODELS,
  EXECUTION_STATUS,
  EXTENSION_CONFIG,
  LOCAL_STORAGE
} from "./constants";

import {
  AIProviderType,
  IContext,
  IRecord,
  IWebRenderer
} from "./common.types";
import {
  callGeminiAI,
  getGeminiAIModels,
  getGeminiAPIKey
} from "./gemeni-ai-util";
import {
  GLOBAL_STATE_MANAGER,
  getExtenConfigValue,
  getSearchingHTML,
  logMsg
} from "./util";

let openAIClient: any = null;

export const getOpenAPIKey = async (context: IContext) => {
  return await GLOBAL_STATE_MANAGER.getItem(context, LOCAL_STORAGE.OPEN_AI_KEY);
};

const getOpenAIClient = async (webRenderer: IWebRenderer) => {
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

export const callOpenAI = async (
  webRenderer: IWebRenderer,
  prompt: string,
  aiProvider: AIProviderType = "openAI",
  gptModel: string,
  cb: (
    resp: IRecord | null,
    err: IRecord | string | unknown | null,
    isComplete: boolean,
    compResp?: any
  ) => void
) => {
  if (aiProvider === "gemini") {
    callGeminiAI(webRenderer, prompt, gptModel, cb);
    return;
  }

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

    let resp: Array<IRecord> = [];
    let compResp: Array<IRecord> = [];
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

export const getAIModels = () => {
  const gptModelsFromConfig = getExtenConfigValue(EXTENSION_CONFIG.GPT_MODELS);
  return gptModelsFromConfig || DEFAULT_GPT_MODELS;
};

export const renderAIProvderAndModel = async (
  id: string | number,
  context: IContext
) => {
  let options: Array<string> = [`<option value="openAI">Open AI</option>`];
  const geminiAPIKey = await GLOBAL_STATE_MANAGER.getItem(
    context,
    LOCAL_STORAGE.GEMINI_AI_KEY
  );

  const showGemini = Boolean(geminiAPIKey);

  if (showGemini) {
    options = [...options, `<option value="gemini">Gemini</option>`];
  }

  let htmlStr = ``;
  htmlStr += `
      <div class='field' style='width: 150px'>
        <span class='field-label'>AI Provider</span>
        <select 
          name="ai_provider_select" 
          id="ai_provider_select_${id}" 
          onchange="populateAIModelDropdown(event)"
          >
            ${options}
          </select>
      </div>

      <div class='field'>
        <span class='field-label'>Model</span>
        <div id='ai_model_dropdown'></div>
      </div>
  `;

  return htmlStr;
};

export const renderAISearchTool = async (
  webRenderer: IWebRenderer,
  containerId: string,
  id: string
) => {
  const { aiModelOptionsStr, apiKeyFound, keyNotFoundHTML } =
    await checkAIConfigStatus(webRenderer, id);

  let htmlStr = ``;

  if (!apiKeyFound) {
    htmlStr = keyNotFoundHTML;
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

              ${aiModelOptionsStr}

              <div class='field'>
                  <span class='field-label'>&nbsp;</span>
                  <button type='button' 
                      class='submit-btn hide-on-browser' 
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

export const renderGPTModelDropdown = (id?: number | string) => {
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

export const searchInGPT = (webRenderer: IWebRenderer, data: IRecord) => {
  const { prompt, containerId, aiProvider, gptModel } = data;

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
    aiProvider,
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

export const populateAIModelDropdown = (
  webRenderer: IWebRenderer,
  aiProvider?: string
) => {
  const id = 1;
  let aiModels: any = [];
  switch (aiProvider) {
    case "gemini":
      aiModels = getGeminiAIModels();
      break;
    default:
      aiModels = getAIModels();
      break;
  }

  let aiModelOptionsStr = ``;
  if (aiModels && Array.isArray(aiModels) && aiModels.length > 0) {
    aiModelOptionsStr = `
       <select name="ai_model_select" id="ai_model_select_${id}" style='width: 150px'>`;

    (aiModels || []).map((model) => {
      aiModelOptionsStr += `<option value="${model}">${model}</option>`;
    });

    aiModelOptionsStr += `</select>
`;
  }

  webRenderer.sendMessageToUI("aiPopulateAIModelDropdown", {
    htmlContent: aiModelOptionsStr
  });
};

export const checkAIConfigStatus = async (
  webRenderer: IWebRenderer,
  id: string = "1"
): Promise<{
  apiKeyFound: boolean;
  aiModelOptionsStr: string | null;
  keyNotFoundHTML: string;
}> => {
  const openAPIKey = await getOpenAPIKey(webRenderer.context);
  const geminiAPIKey = await getGeminiAPIKey(webRenderer.context);

  const apiKeyFound = Boolean(openAPIKey || geminiAPIKey);

  let aiModelOptionsStr = "";
  if (apiKeyFound) {
    aiModelOptionsStr = await renderAIProvderAndModel(id, webRenderer.context);
  }

  return {
    apiKeyFound,
    aiModelOptionsStr,
    keyNotFoundHTML: `
    <div class='ai-unit-app'>
        <h4 class='grey-header text-danger'>OpenAI Key Not Found!</h4>
        <div class='flex-group flex-justify-start'>
           Please add 'Open API Key' via <a href='javascript:void(0)' class='no-link internal-link' onclick="renderPage('config')">Configuration</a> link.
        </div>
    </div>`
  };
};
