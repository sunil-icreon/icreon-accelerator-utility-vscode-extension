import { IWebRenderer } from "./common.types";
import { PAGE_TITLE, SOURCE_TYPE } from "./constants";
import { populateAIModelDropdown, renderAISearchTool } from "./open-ai-util";
import { initializeAppInfo } from "./util";

const getWebviewContent = async (webRenderer: IWebRenderer) => {
  let htmlStr = `<div class='app-info'>`;

  htmlStr += await renderAISearchTool(
    webRenderer,
    "ai_search_page",
    "ai_search_page"
  );

  htmlStr += `</div>`;

  htmlStr += `<script>
      document.addEventListener('DOMContentLoaded', function() {
        toggleLeftMenuItem('li_ai_search');
      });
    </script>`;

  return htmlStr;
};

export const renderAISearchPage = async (webRenderer: IWebRenderer) => {
  await initializeAppInfo(webRenderer);

  let content = await getWebviewContent(webRenderer);
  webRenderer.content = content;
  webRenderer.renderContent(content, PAGE_TITLE.AI_SEARCH, SOURCE_TYPE.PROJECT);

  setTimeout(() => {
    populateAIModelDropdown(webRenderer);
  });
};
