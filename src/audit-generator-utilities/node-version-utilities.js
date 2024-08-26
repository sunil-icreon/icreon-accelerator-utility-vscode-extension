const { exec } = require("child_process");

const getNodeVersions = (webRenderer) => {
  try {
    exec("node -v", (error, stdout, stderr) => {
      if (error) {
        renderNodeVersions(webRenderer, error.message);

        return;
      }
      if (stderr) {
        renderNodeVersions(webRenderer, stderr);

        return;
      }

      renderNodeVersions(webRenderer, stdout);
    });
  } catch (output) {
    if (output.stderr && output.stderr.length > 0) {
      renderNodeVersions(webRenderer, output);
    }

    renderNodeVersions(webRenderer, output);
  }
};

const renderNodeVersions = async (webRenderer, data) => {
  webRenderer.sendMessageToUI("nodeVerionContent", {
    htmlContent: `<div>Node version: <b>${data}</b></div>`
  });
};

module.exports = {
  getNodeVersions
};
