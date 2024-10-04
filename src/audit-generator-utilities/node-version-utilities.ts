import { exec } from "child_process";
import { IWebRenderer } from "../common.types";

export const getNodeVersions = (webRenderer: IWebRenderer) => {
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
  } catch (output: any) {
    if (output.stderr && output.stderr.length > 0) {
      renderNodeVersions(webRenderer, output);
    }

    renderNodeVersions(webRenderer, output);
  }
};

const renderNodeVersions = async (webRenderer: IWebRenderer, data: string) => {
  webRenderer.sendMessageToUI("nodeVerionContent", {
    htmlContent: `<div class='text-sm'>Node (${data})</div>`
  });
};
