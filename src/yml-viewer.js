const vscode = require("vscode");
const yaml = require("js-yaml");
const { getApplicationMeta } = require("./util");

function getWebviewContent(yamlContent) {
  let parsedYaml;
  try {
    parsedYaml = yaml.load(yamlContent);
  } catch (e) {
    parsedYaml = `Error parsing YAML: ${e.message}`;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YAML Viewer</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <pre>${JSON.stringify(parsedYaml, null, 2)}</pre>
    </body>
    </html>`;
}

const YMLViewer = async (webRenderer) => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    let view = {};

    webRenderer.setReportData(view);

    const applicationMeta = await getApplicationMeta(webRenderer);
    if (applicationMeta) {
      const { appName, appVersion, appDescription, appTotalDep } =
        applicationMeta;
      view = { ...view, appName, appVersion, appDescription, appTotalDep };
      webRenderer.setAppMetaData(applicationMeta);
    }

    const document = editor.document;
    const text = document.getText();
    let content = getWebviewContent(text);
    webRenderer.content = content;
    webRenderer.renderContent(content);
  }
};

module.exports = {
  YMLViewer
};
