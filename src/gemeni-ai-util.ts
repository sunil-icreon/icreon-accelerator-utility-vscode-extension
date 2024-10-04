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

const TEMP_STREAM = [
  "The",
  " Apache License, Version 2.0 is a popular, permissive open-source",
  " license known for its flexibility.  While it grants wide permissions to use, modify",
  ", and distribute software, it does have some key restrictions:\n\n**1. Attribution (NOTICE file)**\n\n* You **must** retain all copyright, patent",
  ", trademark, and attribution notices included in the original software.\n* You **must** include a copy of the Apache License 2.0 itself.\n",
  "* If a NOTICE file is provided with the original work, you **must** reproduce this file within your distribution.\n\n**2. Modification Notice (if applicable)**\n\n* If you modify the software, you **must** indicate the changes",
  " you made. You don't have to specify how, just that modifications were made.\n\n**3. Trademark Use**\n\n* The license **does not grant you the right to use any trademarks** of the original software's creators",
  " or contributors. This includes the project name itself.\n\n**4. Patent Claims (implicit grant)**\n\n* By distributing the software, you grant a patent license to anyone who receives the software. This license covers any patents you may hold that are infringed by the software alone or in combination with other works. \n\n",
  '**5. No Warranty**\n\n* The software is provided "AS IS" **without any warranty**, express or implied. This includes warranties of merchantability, fitness for a particular purpose, and non-infringement. \n\n**6. No Liability**\n\n* The original authors and contributors are **not liable',
  " for any damages** arising from the use of the software. This includes direct, indirect, incidental, special, exemplary, or consequential damages.\n\n**7. Contribution Licensing**\n\n* While not strictly a restriction, it's essential to understand that contributions you make to an Apache 2.0 project are automatically licensed",
  " under the same terms.\n\n**Key Points to Remember**\n\n* **Permissive but not unlimited:** The Apache License 2.0 allows for significant freedom but has rules you must follow.\n* **Read the license carefully:** This summary is not a substitute for reading the full text of the Apache License 2",
  ".0. \n* **Legal advice:** If you have specific legal questions, consult with an attorney.\n\nLet me know if you have any other questions. \n"
];

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
  setTimeout(async () => {
    let resp: Array<any> = [];

    for await (const chunk of TEMP_STREAM) {
      await new Promise((resolve) =>
        setTimeout(() => {
          resp = [...resp, chunk];
          cb && cb(resp, null, false);
          resolve(false);
        }, 2)
      );
    }

    cb && cb(resp, null, true);
  }, 1000);

  return;

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
      cb && cb(resp, null, false, compResp);
    }

    cb && cb(resp, null, true, resp);
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
