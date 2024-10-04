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

const TEMP_STREAM: Array<IRecord> = [
  [
    {
      index: 0,
      delta: { role: "assistant", content: "", refusal: null },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Setting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " up" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " unit" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " for" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " application" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " using" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " be" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " quite" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " straightforward" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Here's" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " step" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "-by" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-step" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " guide" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " that" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " will" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " help" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " get" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " started" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "1" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Initialize" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Project" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "First" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " if" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " don't" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " already" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " have" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " project" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " set" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " up" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " one" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " using" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " App" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "bash" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "px" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-app" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " my" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-app" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "cd" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " my" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-app" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "2" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Install" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Required" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Packages" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " works" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " alongside" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Jest" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " (" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "which" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " comes" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " pre" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-installed" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " with" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " App" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: ")." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " You" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " need" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " to" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " install" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "@" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "/react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "bash" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "npm" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " install" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " --" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "save" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-dev" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " @" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "/react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " @" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "/j" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "est" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-dom" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "The" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "@" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "/j" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "est" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-dom" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " package" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " provides" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " custom" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " match" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "ers" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " for" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Jest" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " to" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " work" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " with" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "3" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Update" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Setup" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " File" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " App" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " provides" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "setup" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ".js" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " file" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " where" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " we" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " add" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " global" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " configuration" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " for" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " our" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " If" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: " it" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " doesn't" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " already" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " exist" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " one" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "src" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " directory" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "In" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "src" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "/setup" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ".js" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " add" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "javascript" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "import" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " '@" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "/j" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "est" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "-dom" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "/" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "extend" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "-ex" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "pect" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "';\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "4" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Creating" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Sample" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Component" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Let's" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " simple" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " component" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " to" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " new" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " file" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "src" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "/G" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "reeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ".js" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "javascript" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "import" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " from" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " '" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "';\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "const" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " =" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " ({" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " name" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " })" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: " =>" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " {\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " return" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " (\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "   " }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " <" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "div" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: ">\n" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "     " },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " <" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "h" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "1" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: ">Hello" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: " {" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "name" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "}" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "!</" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "h" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "1" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: ">\n" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: "   " }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: " </" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: "div" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: ">\n" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " );\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "};\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "export" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " default" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ";\n" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "5" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Writing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " for" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Component" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Create" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " file" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "src" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "/G" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "reeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ".js" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "javascript" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "import" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " from" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " '" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "';\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "import" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " {" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " render" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " screen" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " }" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " from" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " '@" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "-library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "/react" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "';\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "import" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " from" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " './" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "';\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "('" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "renders" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " message" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "'," }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " ()" }, logprobs: null, finish_reason: null }
  ],
  [
    { index: 0, delta: { content: " =>" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " {\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " render" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "(<" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " name" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: '="' }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "John" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: '"' }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " />);\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " const" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " greeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Element" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " =" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " screen" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".get" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "By" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Text" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "(/" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Hello" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " John" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "!/" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "i" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: ");\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " expect" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "(g" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "reeting" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "Element" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: ")." }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "to" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "Be" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "In" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "The" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "Document" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "();\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "});\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "6" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Running" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "You" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " run" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " using" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " following" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " command" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ":\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "```" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: "bash" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: "npm" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "``" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "`\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: "This" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " will" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " start" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " runner" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " watch" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " mode" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " You" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " see" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " tests" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " being" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " executed" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " and" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " the" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " results" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " terminal" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " " }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "7" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " Additional" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Configuration" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " (" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "Optional" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ")\n" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "If" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " need" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " to" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " add" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " more" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " configuration" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " to" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " Jest" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " or" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " can" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " add" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " configurations" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " like" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " custom" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " environments" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " setup" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " files" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " etc" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: ".," }, logprobs: null, finish_reason: null }],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: " `" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: "jest" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".config" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: ".js" }, logprobs: null, finish_reason: null }
  ],
  [{ index: 0, delta: { content: "`" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " file" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: ".\n\n" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: "###" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " Summary" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "\n" }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: { content: "By" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " following" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " these" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " steps" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "," }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " will" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " have" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " set" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " up" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " and" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Jest" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " application" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " and" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " written" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " basic" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " test" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " for" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: " a" }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " component" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [
    {
      index: 0,
      delta: { content: " React" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " Library" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " encourages" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " good" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " testing" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " practices" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " by" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " ensuring" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " you" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " interact" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " with" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " your" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " components" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    { index: 0, delta: { content: " in" }, logprobs: null, finish_reason: null }
  ],
  [
    {
      index: 0,
      delta: { content: " ways" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " that" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " are" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " consistent" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " with" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " how" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " users" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " would" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " interact" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " with" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [
    {
      index: 0,
      delta: { content: " them" },
      logprobs: null,
      finish_reason: null
    }
  ],
  [{ index: 0, delta: { content: "." }, logprobs: null, finish_reason: null }],
  [{ index: 0, delta: {}, logprobs: null, finish_reason: "stop" }]
];

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

  setTimeout(async () => {
    let resp: Array<any> = [];

    for await (const chunk of TEMP_STREAM) {
      await new Promise((resolve) =>
        setTimeout(() => {
          resp = [...resp, chunk[0]?.delta?.content || ""];
          cb && cb(resp, null, false);
          resolve(false);
        }, 2)
      );
    }

    cb && cb(resp, null, true);
  }, 1000);

  return;

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
