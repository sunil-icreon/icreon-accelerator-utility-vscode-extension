const {
  PILLS,
  formatNumber,
  onylFileName,
  deleteFolderRecursive,
  getFileContent,
  getScanningHTML,
  getScanningHTMLSmall,
  convertSeconds,
  getIgnoreFileFolder
} = require("../util");

const fs = require("fs");
const util = require("util");
const vscode = require("vscode");

const { PROJECT_STAT } = require("../constants");

const renderDuplicateCodes = (webRenderer, data) => {
  if (!data) {
    webRenderer.sendMessageToUI("duplicateCodeContent", {
      htmlContent: "Something went wrong",
      Count: `-1`,
      hideSection: true,
      showSummary: true
    });
    return;
  }

  data = JSON.parse(data);
  const total = data.statistics.total;
  if (total.clones === 0) {
    webRenderer.sendMessageToUI("duplicateCodeContent", {
      htmlContent: `<div class="content-box box box-success-alt">
            <div class="field-label">Great</div>
            <div class="field-value">There are no duplicate codes.</div>
          </div>`,
      summaryTableData: ``,
      Count: 0,
      showSummary: false
    });
    return;
  }

  webRenderer.projectStat[PROJECT_STAT.DUPLICATE_CODE] = {
    percentage: total.percentage,
    duplicates: (data.duplicates || []).length,
    lines: total.duplicatedLines,
    ts: new Date().toUTCString()
  };

  // NODE_API.sendProjectStat(webRenderer);

  webRenderer.sendMessageToUI("duplicateCodeContent", {
    htmlContent: renderDuplicateSummary(data),
    summaryTableData: renderDuplicateTable(data),
    Count: `${Math.ceil(total.percentage)}%`,
    subInfo: `${formatNumber(total.duplicatedLines)} Lines of code`,
    showSummary: true,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.MODERATE(
        `${Math.ceil(total.percentage)}%`,
        "Duplicate",
        false,
        "Duplicate"
      )}
    </div>
    `
  });
};

const renderDuplicateTable = (data) => {
  const total = data.statistics.total;
  const formats = data.statistics.formats;

  const fileFormats = Object.keys(formats);
  let htmlStr = `
  <h3 class='grey-header'>Duplicate Codes</h3>  
  <div class='flex-1'>
              <div class="content">`;

  htmlStr += `<div class="content-box">
              <table class='table table-striped table-bordered table-sm simple-table'>`;

  htmlStr += `<tr>
                  <th class='text-align-left'>File Type</th>
                  <th class='text-right'>Clones</th>
                  <th class='text-right'>Duplicate Lines</th>
                  <th class='text-right'>Percentage</th>
                </tr>`;

  /* 
  Result return bit incorrect percentage, if there's only 1 type of file.
  Therefore, we are displaying first record.
   */
  let totalRow = 0;
  let singleTotalPercentage = 0;
  fileFormats.map((key) => {
    const { total: formatTotal } = formats[key];

    if (formatTotal.clones > 0) {
      totalRow++;
      singleTotalPercentage = formatTotal.percentage;
      htmlStr += `<tr>
                  <td class='text-align-left'>${key}</td>
                  <td class='text-right'>${formatNumber(
                    formatTotal.clones
                  )}</td>
                  <td class='text-right'>${formatNumber(
                    formatTotal.duplicatedLines
                  )}</td>
                  <td class='text-right'>${formatTotal.percentage}%</td>
              </tr>`;
    }
  });

  htmlStr += `<tr>
                  <td class='text-align-left'><b>Total</b></td>
                  <td class='text-right b'>${formatNumber(total.clones)}</td>
                  <td class='text-right b'>${formatNumber(
                    total.duplicatedLines
                  )}</td>
                  <td class='text-right b'>${
                    totalRow === 1 ? singleTotalPercentage : total.percentage
                  }%</td>
              </tr>`;

  htmlStr += "</table></div></div>";

  return htmlStr;
};

const renderDuplicateSummary = (data) => {
  const duplicates = data.duplicates;
  let htmlStr = `<div>
  <div class='accordian'>`;

  duplicates.map((dups, index) => {
    htmlStr += `<div class="accordion-item" id="${index}_accordian_item" >
            <button class="accordion-header">
            <div class='summary-box'>
                 <div class='grey-box-1'>
      <div class='dup-file mb-1 flex-group'>
        <div class='flex-1'>
        <b>[Lines ${dups.firstFile.startLoc.line}-${
      dups.firstFile.endLoc.line
    }]</b>&nbsp;&nbsp;
        <a href='javascript:void(0)' 
                      target='_blank' 
                      class='remove-link-on-browser' 
                      onclick="openFile('${dups.firstFile.name.replace(
                        /\\/g,
                        "\\\\"
                      )}', ${dups.firstFile.startLoc.line - 1}, ${
      dups.firstFile.startLoc.column
    })">
     ${onylFileName(dups.firstFile.name)}
                        
          </a>
          </div>
          <div class='flex text-right color-grey i'>
            (${dups.firstFile.endLoc.line - dups.firstFile.startLoc.line} lines)
          </div>
      </div>

      <div class='dup-file flex-group'>  
        <div class='flex-1'>    
        <b>[Lines ${dups.secondFile.startLoc.line}-${
      dups.secondFile.endLoc.line
    }]</b>&nbsp;&nbsp;

          <a href='javascript:void(0)' 
                      target='_blank' 
                      class='remove-link-on-browser' 
                      onclick="openFile('${dups.secondFile.name.replace(
                        /\\/g,
                        "\\\\"
                      )}', ${dups.secondFile.startLoc.line - 1}, ${
      dups.secondFile.startLoc.column
    })">${onylFileName(dups.secondFile.name)}
          </a>
        </div>
     </div>

     
    </div>
            </div>
            <span class="icon">+</span></button>
            <div class="accordion-content">
              <div>
        <pre class='dup-code'>
          <code>
            ${dups.fragment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </code>
        </pre>
     </div>
            </div>
        </div>`;
  });

  // htmlStr += `<div>`;

  // (duplicates || []).map((dups) => {
  //   htmlStr += `
  //   <div class='grey-box'>
  //     <div class='dup-file mb-1 flex-group'>
  //       <div class='flex-1'>
  //       <b>[Lines ${dups.firstFile.startLoc.line}-${
  //     dups.firstFile.endLoc.line
  //   }]</b>&nbsp;&nbsp;
  //       <a href='javascript:void(0)'
  //                     target='_blank'
  //                     class='remove-link-on-browser'
  //                     onclick="openFile('${dups.firstFile.name.replace(
  //                       /\\/g,
  //                       "\\\\"
  //                     )}', ${dups.firstFile.startLoc.line - 1}, ${
  //     dups.firstFile.startLoc.column
  //   })">
  //    ${onylFileName(dups.firstFile.name)}

  //         </a>
  //         </div>
  //         <div class='flex text-right color-grey i'>
  //           (${dups.firstFile.endLoc.line - dups.firstFile.startLoc.line} lines)
  //         </div>
  //     </div>

  //     <div class='dup-file flex-group'>
  //       <div class='flex-1'>
  //       <b>[Lines ${dups.secondFile.startLoc.line}-${
  //     dups.secondFile.endLoc.line
  //   }]</b>&nbsp;&nbsp;

  //         <a href='javascript:void(0)'
  //                     target='_blank'
  //                     class='remove-link-on-browser'
  //                     onclick="openFile('${dups.secondFile.name.replace(
  //                       /\\/g,
  //                       "\\\\"
  //                     )}', ${dups.secondFile.startLoc.line - 1}, ${
  //     dups.secondFile.startLoc.column
  //   })">${onylFileName(dups.secondFile.name)}
  //         </a>
  //       </div>
  //    </div>

  //    <div>
  //       <pre class='dup-code'>
  //         <code>
  //           ${dups.fragment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  //         </code>
  //       </pre>
  //    </div>
  //   </div>
  //   `;
  // });

  htmlStr += `</div>`;
  // htmlStr += `</div>`;

  return htmlStr;
};

const getDuplicateCodes = async (webRenderer) => {
  const rootFolder = (webRenderer.parentPath.split("/").pop() || "").trim();

  let searchPattern = `${rootFolder}`;
  if (vscode.workspace.workspaceFolders[0].name === rootFolder) {
    searchPattern = `.`;
  }

  webRenderer.sendMessageToUI("duplicateCodeContent", {
    htmlContent: getScanningHTML(" for Duplicate Code"),
    Count: getScanningHTMLSmall()
  });

  const exec = util.promisify(require("child_process").exec);

  const reportFilePath = `${webRenderer.parentPath}/jscpd-reports`;

  try {
    let ignoreStr = ``;

    const { ignoredFolders, ignoredFiles } = await getIgnoreFileFolder(
      webRenderer.context
    );

    ignoredFolders.map((itm) => {
      ignoreStr += `**/${itm}/**/*.*,`;
    });

    ignoredFiles.map((itm) => {
      ignoreStr += `**/${itm},`;
    });

    ignoreStr = ignoreStr.slice(0, -1);

    exec(
      `npx jscpd -r json ${webRenderer.parentPath} --ignore "${ignoreStr}" --output "${reportFilePath}"`,
      { windowsHide: true }
    )
      .then(async () => {
        if (
          fs.existsSync(
            `${webRenderer.parentPath}/jscpd-reports/jscpd-report.json`
          )
        ) {
          const result = await getFileContent(
            await vscode.workspace.openTextDocument(
              `${webRenderer.parentPath}/jscpd-reports/jscpd-report.json`
            )
          );

          renderDuplicateCodes(webRenderer, result);
          deleteFolderRecursive(reportFilePath);
        } else {
          webRenderer.sendMessageToUI("duplicateCodeContent", {
            htmlContent: "",
            Count: `Something went wrong, while finding duplicate codes.`,
            showSummary: false
          });
        }
      })
      .catch(() => {
        webRenderer.sendMessageToUI("duplicateCodeContent", {
          htmlContent: ``,
          Count: `Something went wrong, while finding duplicate codes.`,
          showSummary: false
        });
      });

    // await exec(
    //   `npx jscpd -r json ${webRenderer.parentPath} --ignore "**/node_modules/**/*.*" --output "${reportFilePath}"`,
    //   { windowsHide: true }
    // );
  } catch (output) {
    webRenderer.sendMessageToUI("duplicateCodeContent", {
      htmlContent: ``,
      Count: `Something went wrong, while finding duplicate codes.`,
      showSummary: false
    });
  }
};

const renderScoreTable = (data) => {
  let htmlStr = `
  <h3 class='grey-header'>Code Scores</h3>
  <div class='flex-1'>
    <div class="content">`;

  htmlStr += `<div class="content-box">
                <table class='table table-striped table-bordered table-sm simple-table'>`;

  htmlStr += `<tr>
                  <th class='text-align-left'>Assessment</th>
                  <th class='text-right'>Files</th>
                  <th class='text-right'>Lines</th>
                </tr>`;

  const needImprovement = data.filter((score) => score.fta_score > 60);
  const needImprovementLines = needImprovement.reduce((acc, val) => {
    return acc + val.line_count;
  }, 0);

  const couldBeBetter = data.filter(
    (score) => score.fta_score >= 50 && score.fta_score <= 60
  );

  const couldBeBetterLines = couldBeBetter.reduce((acc, val) => {
    return acc + val.line_count;
  }, 0);

  const ok = data.filter((score) => score.fta_score < 50);

  const okLines = ok.reduce((acc, val) => {
    return acc + val.line_count;
  }, 0);

  htmlStr += `<tr>
                  <td class='text-critical'>Needs improvement</td>
                  <td class='text-right'>${formatNumber(
                    needImprovement.length
                  )}</td>
                  <td class='text-right'>
                    ${formatNumber(needImprovementLines)}
                  </td>
              </tr>`;

  htmlStr += `<tr>
              <td class='text-moderate'>Could be better</td>
              <td class='text-right'>${formatNumber(couldBeBetter.length)}</td>
              <td class='text-right'>
                ${formatNumber(couldBeBetterLines)}
              </td>
          </tr>`;

  htmlStr += `<tr>
              <td class='text-green'>OK</td>
              <td class='text-right'>${formatNumber(ok.length)}</td>
              <td class='text-right'>
                ${formatNumber(okLines)}
              </td>
          </tr>`;

  htmlStr += "</table></div></div>";

  return htmlStr;
};

const renderScoreSummary = (data) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  let htmlStr = `<div class='flex-1'>
              <div class="content">`;

  htmlStr += `<div class="content-box">
    <div class='grey-header'>
        <div><b># Volume: </b>  <i>An estimate of how much 'space' (number of tokens) the code takes up.</i></div>
        <div><b># Difficulty: </b> <i>How hard is this code to understand?</i></div>
        <div><b># Effort: </b>  <i>How much logical work is required to write this code (E = Difficulty * Volume)?</i></div>
        <div><b># Time Required: </b>  <i>How long (in seconds) might this code take to write?</i></div>
        <div><b># Bugs: </b>  <i>How buggy is this code likely to be?</i></div>
        <hr/> 
        <br/>
    </div>

    <table class='table table-striped table-bordered table-sm'>`;

  htmlStr += `<tr>
                  <th class='text-align-left'>File</th>
                  <th class='text-right'>Lines</th>
                  <th class='text-right'>Score</th>
                  <th class='text-right' style='min-width:80px'>Volume</th>
                  <th class='text-right' style='min-width:90px'>Difficulty</th>
                  <th class='text-right' style='min-width:70px'>Effort</th>
                  <th class='text-right' style='min-width:125px'>Time Required</th>
                  <th class='text-right' style='min-width:70px'>Bugs</th>
                  <th class='text-right' style='min-width:150px'>Assessment</th>
                </tr>`;

  data
    .filter((score) => score.fta_score >= 50)
    .map((score) => {
      const fileName = `${workspaceFolder}\\${score.file_name}`.replace(
        /\\/g,
        "\\\\"
      );

      htmlStr += `<tr>
                  <td class='text-align-left'>
                   <a href='javascript:void(0)' 
                      target='_blank' 
                      class='remove-link-on-browser' 
                      onclick="openFile('${fileName}')">
                      ${score.file_name}
                  </a>

                  </td>
                  <td class='text-right'>${formatNumber(score.line_count)}</td>

                  <td class='text-right ${
                    score.fta_score > 60 ? "text-danger" : "text-moderate"
                  }'>
                    ${Number(score.fta_score).toFixed(0)}
                  </td>

                  <td class='text-right'>
                    ${formatNumber(Number(score.halstead.volume).toFixed(0))}
                  </td>

                  <td class='text-right'>
                    ${Number(score.halstead.difficulty).toFixed(0)}
                  </td>

                  <td class='text-right'>
                    ${formatNumber(Number(score.halstead.effort).toFixed(0))}
                  </td>

                  <td class='text-right'>
                    ${convertSeconds(Number(score.halstead.time).toFixed(0))}
                  </td>

                  <td class='text-right'>
                    ${Number(score.halstead.bugs).toFixed(0)}
                  </td>

                  <td class='text-right no-wrap ${
                    score.fta_score > 60 ? "text-danger" : "text-moderate"
                  }'>${score.assessment}</td>
              </tr>`;
    });

  htmlStr += "</table></div></div>";

  return htmlStr;
};

const renderCodeScore = (webRenderer, data) => {
  if (!data) {
    webRenderer.sendMessageToUI("codeScoreContent", {
      htmlContent: "Something went wrong",
      Count: `-1`,
      hideSection: true,
      showSummary: false
    });
    return;
  }

  const needImprovement = data.filter((score) => score.fta_score > 60);

  const couldBeBetter = data.filter(
    (score) => score.fta_score >= 50 && score.fta_score <= 60
  );

  webRenderer.projectStat[PROJECT_STAT.CODE_SCORE] = {
    needImprovement: needImprovement.length,
    couldBeBetter: couldBeBetter.length
  };

  webRenderer.sendMessageToUI("codeScoreContent", {
    htmlContent: renderScoreSummary(data),
    summaryTableData: renderScoreTable(data),
    Count: `${needImprovement.length}`,
    subInfo: `Files Need Improvements`,
    hideSection: false,
    showSummary: true,
    summaryHeader: `
    <div class='flex-group'>
      ${PILLS.SEVERITY.HIGH(
        needImprovement.length,
        "N",
        false,
        "Needs Improvement"
      )}
      ${PILLS.SEVERITY.MODERATE(
        couldBeBetter.length,
        "C",
        false,
        "Could be Better"
      )}
    </div>
    `
  });
};

const getCodeScores = async (webRenderer) => {
  webRenderer.sendMessageToUI("codeScoreContent", {
    htmlContent: getScanningHTML(" for Code Score"),
    Count: getScanningHTMLSmall()
  });

  const exec = util.promisify(require("child_process").exec);

  try {
    exec(`npx fta-cli ${webRenderer.parentPath} --json `, {
      windowsHide: true
    })
      .then((result) => {
        renderCodeScore(webRenderer, JSON.parse(result.stdout || "[]"));
      })
      .catch((e) => {
        renderCodeScore(webRenderer, JSON.parse(e.stdout || "[]"));
      });
  } catch (output) {
    webRenderer.sendMessageToUI("codeScoreContent", {
      htmlContent: JSON.stringify(output),
      subInfo: `Something went wrong, while finding duplicate codes. -1`,
      showSummary: true
    });
  }
};

module.exports = {
  getDuplicateCodes,
  getCodeScores
};
