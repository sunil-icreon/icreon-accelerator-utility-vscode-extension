import vscode from "vscode";
import { IContext, IWebRenderer } from "./common.types";

import {
  getApplicationMeta,
  GLOBAL_STATE_MANAGER,
  hrDivider,
  logMsg,
  renderFormField,
  splitButton
} from "./util";

import { LOCAL_STORAGE, REPORT_TITLE, SOURCE_TYPE } from "./constants";
import { addIcon, icreonIcon } from "./icons";

const createHTMLReport = (selectedText: string) => {
  let htmlStr = `
  <div class='dep-info-box info-pages'>
    <div class='icreon-icon'>${icreonIcon("#212529")}</div>
    <h1 class='grey-header mt-0'>Add AutoComplete Snippet</h1> 
    ${hrDivider}
  `;

  htmlStr += `
  <div class='form-group mb-1'>
      <div class='mb-1'>
        ${renderFormField(
          "snippet_alias",
          "Alias (shortcut)",
          `<input type='text' id='snippet_alias' class='form-input' placeholder='Alias (shortcut)'  />`,
          {
            required: true
          }
        )}
      </div>

      <div class='mb-2'>
        ${renderFormField(
          "snippet_code",
          "Snippet",
          `<textarea rows='15' id='snippet_code' class='form-textarea'>${selectedText}</textarea>`,
          {
            required: true
          }
        )}
      </div>

      <div class='mb-2'>
      ${renderFormField(
        "snippet_documentation",
        "Snippet Documentation",
        `<textarea rows='5' id='snippet_documentation' class='form-textarea'></textarea>`
      )}
      </div>
    </div>

    <div style='margin-bottom: 100px;'>
      ${splitButton(addIcon(), `Save Snippet`, `onclick="addSnippet()"`)}
      <div class='mt-1 float-right' id='add_snippet_error'></div>
    </div>
  </div>`;

  htmlStr += `</div>`;

  return htmlStr;
};

export const renderSnippetAddPage = async (webRenderer: IWebRenderer) => {
  let view = {};
  webRenderer.setReportData(view);

  const applicationMeta = await getApplicationMeta(webRenderer);
  if (applicationMeta) {
    const { appName, version, description, appTotalDep } = applicationMeta;
    view = { ...view, appName, version, description, appTotalDep };
    webRenderer.setAppMetaData(applicationMeta);
  }

  const editor = vscode.window.activeTextEditor;
  let selectedText = "";
  if (editor) {
    const selection = editor.selection;
    selectedText = editor.document.getText(selection);
  }

  const content = createHTMLReport(selectedText);
  webRenderer.content = content;
  webRenderer.renderContent(content, REPORT_TITLE, SOURCE_TYPE.PROJECT);
};

const languages = [
  "javascript",
  "typescript",
  "typescriptreact",
  "javascriptreact"
];

interface ISnippetConfigType {
  alias: string;
  snippet: string;
  documentation: string;
}
export const addAutoCompleteSnippet = async (
  context: IContext,
  snippetConfig: ISnippetConfigType,
  cb?: (success: boolean, error?: any) => void
) => {
  try {
    const { alias, snippet, documentation } = snippetConfig;

    const addedSnippet: Array<ISnippetConfigType> =
      await GLOBAL_STATE_MANAGER.getItem(
        context,
        LOCAL_STORAGE.ADDED_SNIPPET,
        []
      );

    const existingAlias = addedSnippet.find(
      (itm: ISnippetConfigType) => itm.alias == alias
    );

    if (existingAlias) {
      cb && cb(false, `An alias already exist with: ${alias}.`);
      return;
    }

    const dynamicCompletionProvider =
      vscode.languages.registerCompletionItemProvider(languages, {
        provideCompletionItems() {
          const completionItems: vscode.CompletionItem[] = [];
          const snippetCompletion = new vscode.CompletionItem(alias);
          snippetCompletion.insertText = new vscode.SnippetString(snippet);
          snippetCompletion.documentation = new vscode.MarkdownString(
            documentation
          );
          completionItems.push(snippetCompletion);
          return completionItems;
        }
      });

    context.subscriptions.push(dynamicCompletionProvider);
    await addToCache(context, [...addedSnippet, snippetConfig]);
    cb && cb(true);
  } catch (e: any) {
    cb && cb(false, e?.message || "Error Adding Script");
  }
};

const addToCache = async (
  context: IContext,
  addedSnippet: Array<ISnippetConfigType>
) => {
  await GLOBAL_STATE_MANAGER.setItem(
    context,
    LOCAL_STORAGE.ADDED_SNIPPET,
    addedSnippet
  );
};

export const saveAutoCompleteSnippet = (
  webRenderer: IWebRenderer,
  snippetConfig: any
) => {
  webRenderer.sendMessageToUI("errorSnippetAdd", {
    htmlContent: null
  });

  const { snippetAlias, snippetCode, snippetDocumentation } = snippetConfig;

  addAutoCompleteSnippet(
    webRenderer.context,
    {
      alias: snippetAlias,
      documentation: snippetDocumentation,
      snippet: snippetCode
    },
    (flag: boolean, error?: any) => {
      if (flag) {
        logMsg("Snippet Added Succesfully!!!", true);
        webRenderer.panel.dispose();
        return;
      }

      webRenderer.sendMessageToUI("errorSnippetAdd", {
        htmlContent: `<div class='text-danger'>${error}</div>`
      });
    }
  );
};

export const populateAddedSnippet = async (context: IContext) => {
  const addedSnippet = await GLOBAL_STATE_MANAGER.getItem(
    context,
    LOCAL_STORAGE.ADDED_SNIPPET
  );

  if (addedSnippet && Array.isArray(addedSnippet) && addedSnippet.length > 0) {
    for await (const snippetConfig of addedSnippet) {
      const { alias, snippet, documentation } = snippetConfig;
      const dynamicCompletionProvider =
        vscode.languages.registerCompletionItemProvider(languages, {
          provideCompletionItems() {
            const completionItems: vscode.CompletionItem[] = [];
            const snippetCompletion = new vscode.CompletionItem(alias);
            snippetCompletion.insertText = new vscode.SnippetString(snippet);
            snippetCompletion.documentation = new vscode.MarkdownString(
              documentation
            );
            completionItems.push(snippetCompletion);
            return completionItems;
          }
        });

      context.subscriptions.push(dynamicCompletionProvider);
    }
  }
};
