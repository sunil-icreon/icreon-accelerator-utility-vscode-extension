const { SOURCE_TYPE, PAGE_TITLE } = require("./constants");
const { initializeAppInfo } = require("./util");
const { renderAISearchTool } = require("./open-ai-util");

const getWebviewContent = async (webRenderer) => {
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

const renderAISearchPage = async (webRenderer) => {
  await initializeAppInfo(webRenderer);

  let content = await getWebviewContent(webRenderer);
  webRenderer.content = content;
  webRenderer.renderContent(content, PAGE_TITLE.AI_SEARCH, SOURCE_TYPE.PROJECT);
};

module.exports = {
  renderAISearchPage
};
