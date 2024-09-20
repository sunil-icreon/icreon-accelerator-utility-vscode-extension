// @ts-nocheck

const vscode = acquireVsCodeApi();

var allSections = [
  {
    id: "vulnerabilities",
    label: "Vulnerabilities",
    selected: true
  },
  {
    id: "outdatedPackages",
    label: "Outdated Packages",
    selected: true
  },
  {
    id: "dependencies",
    label: "Dependencies",
    selected: true
  },
  {
    id: "eslintIssues",
    label: "ESLint Issues",
    selected: false
  },
  {
    id: "unused_codes",
    label: "Unused Code",
    selected: false
  },
  {
    id: "duplicateCodes",
    label: "Duplicate Codes",
    selected: false
  },
  {
    id: "codeScores",
    label: "Code Scores",
    selected: false
  },
  {
    id: "licensed",
    label: "Licensed/External",
    selected: false
  }
];

function initAccordian() {
  var headers = document.querySelectorAll(".accordion-header");
  headers.forEach(function (header) {
    const isClickAdded = header.getAttribute("on-click-added") === "1";

    if (!isClickAdded) {
      header.setAttribute("on-click-added", "1");
      header.addEventListener("click", function () {
        var content = header.nextElementSibling;
        var icon = header.querySelector(".icon");
        var isOpen =
          content.style.display === "block" || content.style.display === "flex";

        // Close all accordion contents
        document
          .querySelectorAll(".accordion-content")
          .forEach(function (item) {
            item.style.display = "none";
          });

        // Reset all icons
        document.querySelectorAll(".icon").forEach(function (icon) {
          icon.classList.remove("rotate");
          icon.textContent = "+";
        });

        // Toggle the clicked accordion item
        if (!isOpen) {
          content.style.display = "block";
          icon.classList.add("rotate");
          icon.textContent = "−";
        }
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initAccordian();
  addToggleForFolder();
});

const setContent = (id, htmlContent, onlyIfData) => {
  const elm = document.getElementById(id);
  if (elm) {
    if (onlyIfData && !htmlContent) {
      elm.innerHTML = "";
      return;
    }
    elm.innerHTML = htmlContent;
  }
};

const showElement = (id, flag, blockProperty) => {
  const elm = document.getElementById(id);
  if (elm) {
    if (flag === true) {
      elm.style.display = blockProperty || "block";
    }
    if (flag === false) {
      elm.style.display = "none";
    }
  }
};

function downloadReport(reportType) {
  vscode.postMessage({
    command:
      reportType === "html" ? "downloadReportAsHTML" : "downloadReportAsPDF",
    text: "Download Report Now",
    webContent: document.documentElement.outerHTML
  });
}

function selectRow(id) {
  const table = document.getElementById("tblKnowledge");
  const rows = table.getElementsByTagName("tr");

  for (let row of rows) {
    row.classList.remove("selected");
  }

  const targetRow = document.getElementById("tr_" + id);
  if (targetRow) {
    targetRow.classList.add("selected");
  }
}

function addToggleForFolder() {
  var lis = document.querySelectorAll(".file-tree-li");
  lis.forEach(function (li) {
    const folder = li.querySelector(".folder-name");

    folder.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevents the click from bubbling up to parent elements

      // Toggle the 'open' class on the current li
      li.classList.toggle("open");

      // Find the .child_ui element directly under the current li
      const childUl = li.querySelector(".child_ui");

      // Toggle display based on the 'open' class
      if (childUl) {
        childUl.style.display = li.classList.contains("open")
          ? "block"
          : "none";
      }
    });
  });
}

function handleAIAutoWrite() {
  const autoWriteChkbox = document.getElementById("ai_chk_auto_write");
  if (autoWriteChkbox) {
    showElement("ai_auto_write_option_box", autoWriteChkbox.checked);
  }
}

function handleOpenAISearchToolInputKeyPress(event, containerId, id) {
  if (event.key === "Enter") {
    event.preventDefault();
    aiSearchInGPT(containerId, id);
  }
}

function aiSearchInGPT(containerId, id) {
  const promptInput = document.getElementById(`${id}_ai_search_input`);
  if (promptInput) {
    const promptVal = (promptInput.value || "").trim();
    const gptModelSelect = document.getElementById(`ai_model_select_${id}`);

    vscode.postMessage({
      command: "searchInGPT",
      data: {
        prompt: promptVal,
        gptModel: gptModelSelect ? gptModelSelect.value : null,
        containerId,
        id
      }
    });
  }
}

function openFile(filePath, line, column) {
  vscode.postMessage({
    command: "openFile",
    filePath: filePath,
    line: line,
    column: column
  });
}

function installAnotherExtension(extensionID, extensionName, source) {
  vscode.postMessage({
    command: "installExtension",
    extensionID,
    extensionName,
    source
  });
}

function updatePackage(pkgName, pkgNumber, rootFolder) {
  vscode.postMessage({
    command: "updatePackage",
    pkgNumber: pkgNumber,
    pkgName: pkgName,
    rootFolder: rootFolder
  });
}

function updateAllPackages(updateType, rootFolder) {
  vscode.postMessage({
    command: "updateAllPackage",
    updateType: updateType,
    rootFolder: rootFolder
  });
}

function terminateUnitTestRun() {
  vscode.postMessage({
    command: "terminateUnitTestRun"
  });
}

function saveOpenAPIKey() {
  const apiKeyInput = document.getElementById("ai_open_ap_api_key");
  if (apiKeyInput) {
    const apiKeyVal = (apiKeyInput.value || "").trim();
    if (apiKeyVal.length > 0) {
      vscode.postMessage({
        command: "saveOpenAPIKey",
        apiKey: apiKeyVal
      });
    }
  }
}

const getFieldValue = (fieldKey, defaualtValue) => {
  const filedControl = document.getElementById(fieldKey);

  if (!filedControl) {
    return defaualtValue;
  }

  const val = (filedControl.value || "").trim();
  return val || defaualtValue;
};

function saveConfigurations() {
  const apiKey = getFieldValue("open_ai_api_key");
  const ignoreStandarFolders = getFieldValue("ignore_standard_folders");
  const ignoreStandarFiles = getFieldValue("ignore_standard_files");
  const ignoreUnitTestFolders = getFieldValue("ignore_unit_test_folders");
  const ignoreUnitTestFiles = getFieldValue("ignore_unit_test_files");
  const projectInfoServerURL = getFieldValue("project_info_url");
  const vulnerabilityServerURL = getFieldValue("vulnerability_url");

  vscode.postMessage({
    command: "saveConfigurations",
    data: {
      apiKey,
      ignoreStandarFolders,
      ignoreStandarFiles,
      ignoreUnitTestFolders,
      ignoreUnitTestFiles,
      projectInfoServerURL,
      vulnerabilityServerURL
    }
  });
}

function writeUnitTests(singleRunIndex) {
  const promptInput = document.getElementById("ai_unit_test_prompt");
  if (promptInput) {
    const promptVal = (promptInput.value || "").trim();
    if (promptVal) {
      const sourceFolderInput = document.getElementById(
        "ai_unit_test_source_folder"
      );
      const testFolderInput = document.getElementById(
        "ai_unit_test_test_folder"
      );
      const testFileConventionInput = document.getElementById(
        "ai_unit_test_test_file_convention"
      );
      const autoRightChkBox = document.getElementById("ai_chk_auto_write");
      const gptModelSelect = document.getElementById("ai_model_select_1");

      let overWriteAction = null;

      if (autoRightChkBox && autoRightChkBox.value) {
        if (document.getElementById("ai_rd_ask").checked) {
          overWriteAction = "ask";
        } else if (document.getElementById("ai_rd_append").checked) {
          overWriteAction = "append";
        } else if (document.getElementById("ai_rd_overright").checked) {
          overWriteAction = "overwrite";
        } else if (document.getElementById("ai_rd_skip").checked) {
          overWriteAction = "skip";
        }
      }

      showElement("ai_action_btns", true);

      vscode.postMessage({
        command: "aiWriteUnitTestForAllFiles",
        data: {
          prompt: promptVal,
          sourceFolder: sourceFolderInput
            ? (sourceFolderInput.value || "").trim()
            : null,
          testFolderName: testFolderInput
            ? (testFolderInput.value || "").trim()
            : null,
          testFileNamingConvention: testFileConventionInput
            ? (testFileConventionInput.value || "").trim()
            : null,
          gptModel: gptModelSelect ? gptModelSelect.value : null,
          autoRight: autoRightChkBox.value,
          overWriteAction: overWriteAction,
          singleRunIndex
        }
      });
    }
  }
}

function autoFixVulnerabilities(rootFolder) {
  vscode.postMessage({
    command: "autoFixVulnerabilities",
    rootFolder: rootFolder
  });
}

function openNPMViewer(pkgName) {
  vscode.postMessage({
    command: "openNPMViewer",
    pkgName
  });
}

function renderPage(pageID, sourceType) {
  vscode.postMessage({
    command: "renderPage",
    pageID,
    sourceType
  });
}

function updateSubmitProjInfoBtn(isLoading) {
  const submitBtn = document.getElementById("btn_submit_project_info");
  if (submitBtn) {
    submitBtn.innerHTML = isLoading
      ? "Submitting..."
      : "Submit Project Information";

    submitBtn.disabled = isLoading;
  }
}

function submitDashboardStat() {
  updateSubmitProjInfoBtn(true);

  vscode.postMessage({
    command: "submitDashboardStat"
  });
}

function aiDashboardShowFileContent(filePath) {
  vscode.postMessage({
    command: "aiDashboardShowFileContent",
    filePath
  });
}

function startAuditing() {
  showElement("selection_section", false);
  showElement("detailed_section", true);
  showElement("downloadButton", true);

  const selectedItems = (allSections || []).filter((sec) => sec.selected);
  selectedItems.map((itm) => {
    showElement(itm.id + "_brief_section", true, "flex");
  });

  const firstBtn = document.getElementById(
    selectedItems[0].id + "_accordian_item"
  );
  if (firstBtn) {
    showElement(selectedItems[0].id + "_accordian_item", true);
    firstBtn.click();
  }

  vscode.postMessage({
    command: "startAuditing",
    auditChecklist: allSections
  });
}

function toggleLeftMenuItem(menuId) {
  const menuItems = document.getElementsByClassName("menu-li-item");
  for (i = 0; i < menuItems.length; i++) {
    menuItems[i].classList.remove("selected");
  }

  const activeMenu = document.getElementById(menuId);
  if (activeMenu) {
    activeMenu.classList.add("selected");
  }
}

function toggleChecklistItem(sectionId) {
  allSections = (allSections || []).filter((section) => !section.silent);
  const sectionIndex = (allSections || [])
    .filter((section) => !section.silent)
    .findIndex((sec) => sec.id === sectionId);

  if (sectionIndex > -1) {
    allSections[sectionIndex].selected = !allSections[sectionIndex].selected;

    const checkedIcon = document.getElementById(sectionId + "_check_icon");
    const unCheckedIcon = document.getElementById(sectionId + "_uncheck_icon");
    const checkListOptions = document.getElementsByClassName("checklist-item");

    if (allSections[sectionIndex].selected) {
      showElement(sectionId + "_check_icon", true);
      showElement(sectionId + "_uncheck_icon", false);
      checkListOptions[sectionIndex].classList.add("selected");
    } else {
      showElement(sectionId + "_check_icon", false);
      showElement(sectionId + "_uncheck_icon", true);
      checkListOptions[sectionIndex].classList.remove("selected");
    }
  }

  const selectedItems = (allSections || []).filter((sec) => sec.selected);
  const auditBtn = document.getElementById("start_audit_button");
  if (auditBtn) {
    auditBtn.disabled = selectedItems.length === 0;
  }

  setContent(
    "checklist_count",
    selectedItems.length > 0 ? " (" + selectedItems.length + ")" : ""
  );
}

function openTab(evt, tabName) {
  let i, tabcontent, tablinks;
  let activeTab = null;

  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
    tabcontent[i].classList.remove("active");

    if (tabcontent[i].id === tabName) {
      activeTab = tabcontent[i];
    }
  }

  tablinks = document.getElementsByClassName("tab-button");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove("active");
  }

  evt.currentTarget.classList.add("active");

  const activeTabBtn = document.getElementById(tabName + "_accordian_item");
  if (activeTabBtn) {
    activeTabBtn.classList.add("active");
  }

  if (activeTab) {
    activeTab.style.display = "block";
    activeTab.classList.add("active");
  }

  let infoBoxes = document.getElementsByClassName("info-box");
  for (i = 0; i < infoBoxes.length; i++) {
    infoBoxes[i].classList.remove("selected");
  }

  const activeInfoBox = document.getElementById(tabName + "_info_box");
  if (activeInfoBox) {
    activeInfoBox.classList.add("selected");
  }
}

function renderResponses(id, data) {
  if (data.hideSection) {
    showElement(id + "_brief_section", false, "flex");
    initAccordian();
    return;
  }

  const npmAuditLabel = document.getElementById(id + "_summary_main_content");

  if (npmAuditLabel) {
    showElement(id + "_summary_main_content", true);
    setContent(id + "_summary_main_content", data.htmlContent);

    // extra check for total packages
    if (id === "vulnerabilities") {
      if (data.dependencyData) {
        setContent("dependencies_summary_table", data.dependencyData);
        showElement("dependencies_summary_table", true);
      }
    }

    if (data.summaryTableData) {
      setContent(id + "_summary_table", data.summaryTableData);
      showElement(id + "_summary_table", true);
    }

    setContent(id + "_count", data.Count || 0);
    showElement(id + "_accordian_item", true);
    setContent(id + "_help_text", data.helpText, true);
    setContent(id + "_info_sub", data.subInfo, true);

    if (data.showSummary) {
      showElement("summary_tabs", true);
      setContent(id + "_summary_header", data.summaryHeader, true);
      showElement("summary_divider", true);
    }
  }

  setTimeout(() => {
    initAccordian();
  }, 500);
}

function showTopicDetails(topicId) {
  selectRow(topicId);
  vscode.postMessage({
    command: "knowledgeCenterCommand",
    subCommand: "showTopicDetails",
    topicId: topicId
  });
}

function executeTopicSteps(topicId) {
  selectRow(topicId);
  vscode.postMessage({
    command: "knowledgeCenterCommand",
    subCommand: "executeTopicSteps",
    topicId: topicId
  });
}

function handleNPMSearchKeyPress(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchNPMPackage();
  }
}

function debounce(func, delay) {
  let timer;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

function handleInputChange(event) {
  const searchVal = event.target.value;
  if (searchVal && searchVal.trim().length > 3) {
    showElement("npm_package_info", false);
    vscode.postMessage({
      command: "npmSearchCommand",
      subCommand: "searchNPMPackages",
      data: searchVal
    });
  }
}

const debounceInputChange = debounce(handleInputChange, 500);

function searchNPMPackage() {
  const searchInput = document.getElementById("npm_search_input");

  if (searchInput) {
    const searchVal = (searchInput.value || "").trim();
    if (searchVal && searchVal.length > 0) {
      showElement("npm_package_info", false);
      vscode.postMessage({
        command: "npmSearchCommand",
        subCommand: "searchNPMPackages",
        data: searchVal
      });
    }
  }
}

function removeFromRecent(packageName) {
  vscode.postMessage({
    command: "npmSearchCommand",
    subCommand: "removeFromRecent",
    data: packageName
  });
}

function showPackageInfo(packageName) {
  showElement("npm_package_info", true);
  showElement("npm_result_section", true);
  vscode.postMessage({
    command: "npmSearchCommand",
    subCommand: "showNPMPackageInfo",
    data: packageName
  });
}

function checkPackageForVulnerabities(packageName, version) {
  vscode.postMessage({
    command: "npmSearchCommand",
    subCommand: "scanVulnerability",
    data: {
      packageName,
      version
    }
  });
}

function checkPckVulSingle(packageName, version) {
  vscode.postMessage({
    command: "npmSearchCommand",
    subCommand: "scanVulnerabilityForSingle",
    data: {
      packageName,
      version
    }
  });
}

function installPackage(packageName, version, type, rootFolder) {
  vscode.postMessage({
    command: "npmSearchCommand",
    subCommand: "installPackage",
    data: {
      packageName,
      version,
      type,
      rootFolder
    }
  });
}

function runScript(selectedScript) {
  vscode.postMessage({
    command: "runPackageScript",
    data: {
      script: selectedScript
    }
  });
}

function toggleVersionMoreLess(maxCount) {
  const moreVersionBtn = document.getElementById("vul_more_rows");
  if (moreVersionBtn) {
    const currentState = moreVersionBtn.textContent;
    const rows = document.getElementsByClassName("version_list_item");

    if (currentState === "Show more versions.") {
      moreVersionBtn.textContent = "Show less versions.";
      for (let row of rows) {
        row.classList.remove("hidden-row");
        row.style.display = "table-row";
      }
    } else {
      moreVersionBtn.textContent = "Show more versions.";
      let index = 0;
      for (let row of rows) {
        if (index > maxCount) {
          row.classList.add("hidden-row");
          row.style.display = "none";
        }
        index++;
      }
    }
  }
}

function scrollToDiv(divId) {
  const element = document.getElementById(divId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function aiWriteTestFile(action) {
  vscode.postMessage({
    command: "aiWriteTestFile",
    action
  });
}

window.addEventListener("message", (event) => {
  const message = event.data;
  const data = message.data;
  const downloadBtn = document.getElementById("downloadLink");

  switch (message.command) {
    case "downloadingStart":
      if (downloadBtn) {
        downloadBtn.textContent = "Downloading...";
      }
      break;

    case "downloadingEnd":
      if (downloadBtn) {
        downloadBtn.textContent = "Download";
      }
      break;

    case "fileSummaryContent":
      setContent("fileSummaryLabel", data.htmlContent);
      showElement("processFileSection", data.htmlContent);

      if (data.primaryLanguage) {
        setContent("primary_language", data.primaryLanguage);
        showElement("primary_language", true);
      }

      if (data.styleLanguage) {
        setContent("style_language", data.styleLanguage);
        showElement("style_language", true);
      }

      break;

    case "largeFilesContent":
      setContent("largeFileLabel", data.htmlContent);
      break;

    case "npmAuditContent":
      renderResponses("vulnerabilities", data);
      break;

    case "npmPackageContent":
      renderResponses("dependencies", data);
      break;

    case "outdatedPackageContent":
      renderResponses("outdatedPackages", data);
      break;

    case "esLintContent":
      renderResponses("eslintIssues", data);
      break;

    case "duplicateCodeContent":
      renderResponses("duplicateCodes", data);
      break;

    case "codeScoreContent":
      renderResponses("codeScores", data);
      break;

    case "licensedContent":
      renderResponses("licensed", data);
      break;

    case "nodeVerionContent":
      setContent("nodeVerionsLabel", data.htmlContent);
      break;

    case "unusedCodeContent":
      renderResponses("unused_codes", data);
      break;

    case "submitVulnerabilityDataContent":
      vscode.postMessage({
        command: "submitVulnerabilityData",
        data: data.vulSummary
      });
      break;

    case "fileProcessed":
      const totalFileLabel = document.getElementById("totalFileLabel");
      if (totalFileLabel) {
        totalFileLabel.textContent = data.fileName;
      }
      break;

    case "knowledgeTopicDetailContent":
      setContent("knowledge_topics_details_info", data.topicInfo);
      setContent("knowledge_topics_details_steps", data.htmlContent);
      showElement("knowledge_topics_details", true);
      showElement("knowledge_topics_details_steps", true);
      showElement("knowledge_topics_details_execution", false);
      initAccordian();
      break;

    case "knowledgeTopicExecutionContent":
      showElement("knowledge_topics_details", true);
      setContent("knowledge_topics_details_info", data.topicInfo);
      showElement("knowledge_topics_details_steps", false);
      showElement("knowledge_topics_details_execution", true);
      setContent("knowledge_topics_details_execution", data.htmlContent);
      initAccordian();
      break;

    case "npmSearchResultContent":
      showElement("npm_result_section", true);
      showElement("npm_search_result", true);
      setContent("npm_search_result", data.htmlContent);
      break;

    case "npmSearchRecentViewed":
      setContent("npm_recent_search", data.htmlContent);
      break;

    case "npmPackageInfoContentLoader":
      showElement("npm_package_info", false);
      showElement("npm_search_result", true);
      setContent("npm_search_result", data.htmlContent);
      break;

    case "npmPackageInfoContent":
      showElement("npm_search_result", false);
      showElement("npm_package_info", true);
      showElement("npm_result_section", true);
      setContent("npm_package_detail", data.htmlContent);
      setContent("npm_package_basic_info", data.basicInfo);
      setContent("npm_package_readme", data.readMeContent);

      break;

    case "npmScanNPMVulnerabilityForTDContent":
      showElement("vul_error", false);
      setContent("td_" + data.id + "_vul", data.htmlContent);

      if (data.error) {
        setContent("vul_error", data.error);
        showElement("vul_error", true);
        scrollToDiv("vul_error");
      }
      break;

    case "npmInstallDependencyForTDContent":
      if (data.type === "dev") {
        setContent("td_" + data.id + "_dev_dep", data.htmlContent);
      } else {
        setContent("td_" + data.id + "_prod_dep", data.htmlContent);
      }

      if (data.error) {
        setContent("install_error", data.error);
        showElement("install_error", true);
        scrollToDiv("install_error");
      }
      break;

    case "npmPackageInfoDownloadCount":
      setContent("weekly_download_" + data.pckName, data.htmlContent);
      break;

    case "packageScriptsContent":
      setContent("npm_package_scripts", data.htmlContent);
      break;

    case "unitTestContent":
      setContent("unitTestContent", data.htmlContent);

      if (data.unitTestStatus) {
        setContent("unit_test_status", data.unitTestStatus);
        showElement("unit_test_status", true);
      }
      break;

    case "lintContent":
      setContent("lintContent", data.htmlContent);

      if (data.esLintStatus) {
        setContent("lint_status", data.esLintStatus);
        showElement("lint_status", true);
      }
      break;

    case "prettierContent":
      setContent("prettierLabel", data.htmlContent);
      showElement("prettierLabel", true);

      if (data.prettierStatus) {
        setContent("prettier_status", data.prettierStatus);
        showElement("prettier_status", true);
      }
      break;

    case "dockerContent":
      setContent("docker_status", data.dockerStatus);
      showElement("docker_status", true);
      break;

    case "webServerContent":
      setContent("web_server_status", data.webServerStatus);
      showElement("web_server_status", true);
      break;

    case "cspContent":
      setContent("cspContent", data.htmlContent);
      if (data.cspStatus) {
        setContent("csp_status", data.cspStatus);
        showElement("csp_status", true);
      }
      break;

    case "suggestedExtensionContent":
      setContent("suggestedExtensionContent", data.htmlContent);
      break;

    case "aiFileTreeContent":
      setContent("aiUnitTestFilesContent", data.htmlContent);
      showElement("aiUnitTestFilesContent", true);
      break;

    case "aiUnitTestFilesContent":
      setContent("aiUnitTestFilesContent", data.htmlContent);
      showElement("aiUnitTestFilesContent", true);
      break;

    case "aiUnitTestProgressStatus":
      setContent("ai_unit_td_" + data.index + "_status", data.htmlContent);
      break;

    case "aiUnitTestUpdateActionContent":
      setContent("ai_unit_td_" + data.index + "_action_btns", data.htmlContent);
      showElement(
        "ai_unit_td_" + data.index + "_action_btns",
        data.showAction,
        "flex"
      );
      break;

    case "aiClearUnitTestStatusContent":
      for (let i = 0; i < data.count; i++) {
        setContent("ai_unit_td_" + i + "_status", data.htmlContent);
        showElement("ai_unit_td_" + i + "_action_btns", false);
      }
      break;

    case "aiUnitTestCurrentContent":
      setContent("ai_current_test_filename", data.currentFileName);
      showElement("ai_stop_execution", data.showStopExecution, "flex");

      if (data.showCompare) {
        setContent("aiUnitFileContent", data.codeFileContent);

        // Uncomment below code to display existing test file content
        // if(data.codeFileContent) {
        // showElement('ai_existing_test', true, 'flex');
        //}

        // showElement('ai_existing_test', true);
      } else {
        showElement("ai_existing_test", false);
      }

      showElement("btn_ai_test_write_file", !data.showCompare);
      showElement("btn_ai_test_overright_file", data.showCompare);
      break;

    case "aiUnitTestGeneratedContent":
      setContent("aiUnitGeneratedContent", data.generatedContent);
      showElement("ai_gen_test", true);
      break;

    case "aiUnitTestReadyToWriteContent":
      setContent("aiUnitGeneratedContent", data.generatedContent);
      break;

    case "aiSearchInGPTContent":
      setContent(`${data.containerId}_search_output`, data.htmlContent);
      showElement(
        `${data.containerId}_search_output`,
        data.htmlContent ? true : false
      );
      break;

    case "submitProjectInfoContent":
      updateSubmitProjInfoBtn(false);
      break;
  }
});
