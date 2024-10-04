import { closeIcon, icreonIcon } from "./icons";
import { hrDivider } from "./util";

export const getCopyrightContent = () => {
  let htmlStr = "";

  const currentYear = new Date().getFullYear();

  htmlStr += `
  <div class='dep-info-box info-pages'>
    <button class='close-link' 
            onclick='toggleCopyRight(false)'
            data-tooltip="Close"
            >
      ${closeIcon(24)}
    </button> 

    <div class='icreon-icon'>${icreonIcon("#212529")}</div>
    <h1 class='grey-header mt-0'>Copyright Notice</h1> 
    ${hrDivider}
    
    <div class='dep-info'>
      <div class='section'>
          <h2 class='grey-header mb-0'>Extension Name</h2>
          <p>Icreon Accelerator: Utilities</p>
          <p>Version: 1.0.0</p>
          <p>© ${currentYear} Icreon</p>
          <p>All rights reserved.</p>

          <h2 class='grey-header'>License</h2>
          <p>This Visual Studio Code extension is licensed under the Apache 2.0 license.</p>

          <h2 class='grey-header'>Copyright Holders</h2>
          Icreon, ${currentYear}.

          <h2 class='grey-header'>Disclaimer</h2>
          <p>This extension is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.</p>
        </div>
    </div>
  </div>
  `;

  return htmlStr;
};
