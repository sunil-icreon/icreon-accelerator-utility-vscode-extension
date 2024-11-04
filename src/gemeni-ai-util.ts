import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  DEFAULT_GEMINI_MODELS,
  EXTENSION_CONFIG,
  LOCAL_STORAGE
} from "./constants";

import { IContext, IRecord, IWebRenderer } from "./common.types";
import { GLOBAL_STATE_MANAGER, getExtenConfigValue, logMsg } from "./util";

let geminiAIClient: any = null;

export const getGeminiAPIKey = async (context: IContext) => {
  const geminiAPIKey = await GLOBAL_STATE_MANAGER.getItem(
    context,
    LOCAL_STORAGE.GEMINI_AI_KEY
  );

  process.env.GEMINI_API_KEY = geminiAPIKey;

  return geminiAPIKey;
};

const getGeminiAIClient = async (webRenderer: IWebRenderer) => {
  if (geminiAIClient) {
    return geminiAIClient;
  }

  let geminiAIKey = await getGeminiAPIKey(webRenderer.context);

  try {
    geminiAIClient = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || geminiAIKey
    );

    return geminiAIClient;
  } catch (e) {
    logMsg(
      `Failed connecting to Gemini AI. Please validate the API Key and its usage.`,
      true
    );
  }
};

export const callGeminiAI = async (
  webRenderer: IWebRenderer,
  prompt: string,
  model: string,
  cb: (
    resp: IRecord | null,
    err: IRecord | string | unknown | null,
    isComplete: boolean,
    compResp?: any
  ) => void
) => {
  const client = await getGeminiAIClient(webRenderer);
  if (!client) {
    cb &&
      cb(null, `Error connecting to Gemini AI. Please verify API key.`, true);

    return;
  }

  model = model || DEFAULT_GEMINI_MODELS[0];
  const geminiModel = client.getGenerativeModel({ model });

  try {
    const result = await geminiModel.generateContentStream(prompt);

    let resp: Array<IRecord> = [];
    let compResp: Array<IRecord> = [];

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      resp = [...resp, chunkText];
      compResp = [...compResp, chunkText];
      cb && cb(resp, null, false);
    }

    cb && cb(resp, null, true);
  } catch (e) {
    cb && cb([], e, true);
  }
};

export const getGeminiAIModels = () => {
  const gptModelsFromConfig = getExtenConfigValue(
    EXTENSION_CONFIG.GEMINI_MODELS
  );
  return gptModelsFromConfig || DEFAULT_GEMINI_MODELS;
};

export const renderGeminiModelDropdown = (id?: number | string) => {
  id = id || 1;
  const aiModels = getGeminiAIModels();
  let aiModelOptionsStr = ``;
  if (aiModels && Array.isArray(aiModels) && aiModels.length > 0) {
    aiModelOptionsStr = `
    <div class='field'>
       <span class='field-label'>Gemini Model</span>
       <select name="gemini_model_select" id="gemini_model_select_${id}">`;

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
