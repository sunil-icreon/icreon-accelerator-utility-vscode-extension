export const extensionPrefix = `icreon-accelerator-utility`;
export const REPORT_TITLE = "Icreon Accelerator: Utilities";
export const REPORT_TEMPLATE = "npm-audit-report";
export const REPORT_FOLDER_NAME = "icreon-accelerator-utility";
export const REPORT_FILE_NAME = "icreon-accelerator-utility";

export const AIProvider = { OPEN_AI: "openAI", GEMINI: "gemini" };

export const EXTENSION_CONFIG = {
  GPT_MODELS: "GPTModels",
  GEMINI_MODELS: "GeminiModels",
  API_URL: {
    VULNERABILITY: "apiURL.vulnerability",
    PROJECT_STATS: "apiURL.projectStatistics"
  }
};

export const SOURCE_TYPE = {
  PROJECT: "project",
  AI: "ai"
};

export const EXECUTION_STATUS = {
  NOT_STARTED: 0,
  RUNNING: 1,
  COMPLETE: 2,
  FAILED: 3,
  CONFIRM: 4
};

export const SEVERITY_TYPE = {
  CRITICAL: "Critical",
  HIGH: "High",
  MODERATE: "Moderate",
  LOW: "Low",
  INFO: "Info",
  SUCCESS: "Success",
  GENERAL: "General"
};

export const VUL_SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MODERATE: "moderate",
  LOW: "low"
};

export const PROJECT_STAT = {
  OUTDATED_PACKAGES: "outdatedStat",
  UNUSED_CODE: "ununsedStat",
  LICENSED: "licensedStat",
  DUPLICATE_CODE: "duplicateStat",
  ESLINT: "eslintStat",
  AUDIT: "auditStat",
  CODE_SCORE: "codeScoreStat",
  DASHBOARD: "dashboardStat",
  DEPENDENCY: "dependencyStat"
};

export const LOCAL_STORAGE = {
  RECENT_PACKAGE_VIEWED: "recent_package_viewed",
  VULNERABILITIES: "vulnerabilities",
  OPEN_AI_KEY: "openAIKey",
  GEMINI_AI_KEY: "geminiAIKey",
  IGNORE_PATH_STANDARD_FOLDERS: "ignoreStandardFolders",
  IGNORE_PATH_STANDARD_FILES: "ignoreStandardFiles",
  IGNORE_UNIT_TEST_FOLDERS: "ignoreUnitTestFolders",
  IGNORE_UNIT_TEST_FILES: "ignoreUnitTestFiles",
  VULNERABILITY_SERVER_URL: "vulnerabilityServerURL",
  PROJECT_INFO_SERVER_URL: "projectInfoServerURL",
  ADDED_SNIPPET: "addedSnippet"
};

export const PAGE_TITLE = {
  AUDIT: "Icreon Accelerator: Audit Report",
  DASHBOARD: "Icreon Accelerator: Project Info",
  TITLE: "Icreon Accelerator: Solutions Hub",
  NPM_SEARCH: "Icreon Accelerator: Search NPM Packages",
  ADD_SNIPPET: "Icreon Accelerator: Add Snippet",
  AI_DASHBOARD: "Icreon Accelerator: AI Dashboard",
  AI_SEARCH: "Icreon Accelerator: AI Search",
  CONFIGURATION: "Icreon Accelerator: Configuration",
  COPYRIGHT: "Icreon Accelerator: Copyright Notice"
};

export const COMMANDS = {
  DASHBOARD: `${extensionPrefix}.dashboard`,
  NPM_AUDIT: `${extensionPrefix}.npmAuditReportCommand`,
  NPM_AUDIT_SINGLE: `${extensionPrefix}.npmAuditReportCommandSingleFile`,
  KNOWLEDGE_CENTER: `${extensionPrefix}.knowledgeCenter`,
  NPM_SEARCH: `${extensionPrefix}.npmSearch`,
  AI_DASHBOARD: `${extensionPrefix}.aiDashboard`,
  AI_SEARCH: `${extensionPrefix}.aiSearch`,
  REBRANDING_ASETS: `${extensionPrefix}.rebrandingAssets`,
  ON_SELECTION: `${extensionPrefix}.runCommandOnNPMPackageSearch`,
  SUBMIT_VUL_DATA: `${extensionPrefix}.submitVulnerabilityData`,
  CONFIGURATION: `${extensionPrefix}.configuration`,
  ADD_TO_SNIPPET: `${extensionPrefix}.addToSnippet`
};

export const MSGS = {
  PACKAGE_LOCK_JSON_NOT_FOUND: `Error: package-lock.json file not found!`,
  INVALID_SELECTION: `Invalid Selection`,
  REPORT_CREATED: `Report downloaded successfully!`,
  PDF_ERROR: `Error generating PDF Report. Please try again later. You may need to open VSCode in Administrator mode.`,
  PREPARING_PDF: `Generating PDF, please wait...`,
  SCORE_TOOLTIP: `This score calculates overall vulnerability severity from 0 to 10 and is based on the Common Vulnerability Scoring System (CVSS).`,
  CWE_TOOLTIP: `The Common Weakness Enumeration (CWE) is a list of weaknesses in software that can lead to security issues.`,
  GHSA_TOOLTIP: `GHSA is the GitHub Security Advisories database. GHSA ID is the identifier of the advisory for any given vulnerability.`
};

export const SECTIONS_IDS = {
  VULNERABILITIES: "vulnerabilities",
  DEPENDENCIES: "dependencies",
  OUTDATED_PACKAGES: "outdatedPackages",
  ESLINT: "eslintIssues",
  DUPLICATE_CODES: "duplicateCodes",
  CODE_SCORE: "codeScores",
  LICENSED: "licensed",
  UNUSED_CODES: "unused_codes"
};

export let SECTIONS = [
  {
    id: SECTIONS_IDS.VULNERABILITIES,
    label: "Vulnerabilities",
    info: `Will run <b>'npm audit'</b> command, to scan the project for known security issues along with recommendations to fix them.`,
    selected: true
  },
  {
    id: SECTIONS_IDS.OUTDATED_PACKAGES,
    label: "Outdated Packages",
    info: `Will run <b>'npm oudated'</b> command, to scan the project for outdated packages.`,
    selected: true
  },
  {
    id: SECTIONS_IDS.DEPENDENCIES,
    label: "Dependencies",
    info: `We'll read package.json & package-lock.json files to get the information of the packages installed.`,
    selected: true
  },
  {
    id: SECTIONS_IDS.ESLINT,
    label: "ESLint Issues",
    info: `Will run <b>'eslint'</b> command, to run static code analysis and generate reports based on configured rules.`,
    selected: false
  },
  {
    id: SECTIONS_IDS.UNUSED_CODES,
    label: "Unused Code",
    info: `Uses <b>knip</b> <i>(522K+ weekly downloads)</i>, which finds unused files, dependencies and exports in JavaScript and TypeScript projects.`,
    selected: false
  },
  {
    id: SECTIONS_IDS.DUPLICATE_CODES,
    label: "Duplicate Codes",
    info: `Uses <b>jscpd</b> <i>(71K+ weekly downloads)</i>, which implements <b>Rabin-Karp algorithm</b> for searching code duplications.`,
    selected: false
  },
  {
    id: SECTIONS_IDS.CODE_SCORE,
    label: "Code Scores",
    info: `Uses <b>fta-cli</b>, written in <b>Rust</b>, which implements <b>Speedy Web Compiler</b> to parse code then runs various analytical routines against it to understand how complex and maintainable it is likely to be.`,
    selected: false
  }
  // {
  //   id: SECTIONS_IDS.LICENSED,
  //   label: "Licensed Files",
  //   info: `This will find external references of licensed files.`,
  //   selected: false
  // }
];

export const IGNORE_PATHS = {
  UNIT_TEST_FOLDER: ["node_modules", "build", "dist", "public", "coverage"],
  UNIT_TEST_FILES: [
    ".next",
    "tsconfig.json",
    "jsconfig.json",
    ".gitignore",
    ".eslintrc",
    ".eslintignore"
  ],
  CSP_FOLDER: [
    "node_modules",
    "__test__",
    "__tests__",
    "__spec__",
    "build",
    "dist",
    "coverage"
  ],
  FOLDER: [
    "node_modules",
    "__test__",
    "__tests__",
    "__spec__",
    "assets",
    "build",
    "dist",
    "public",
    "coverage"
  ],
  FILES: [
    ".spec",
    ".test",
    ".next",
    "tsconfig.json",
    "jsconfig.json",
    ".gitignore",
    ".eslintrc",
    ".eslintignore"
  ]
};

export const DEFAULT_GPT_MODELS = [
  "gpt-4o",
  "gpt-4o-2024-05-13",
  "gpt-4-turbo",
  "gpt-4-turbo-2024",
  "gpt-4-turbo-preview",
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  "gpt-4",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-instruct",
  "text-davinci-003",
  "text-davinci-002",
  "text-curie-001",
  "text-babbage-001",
  "text-ada-001",
  "code-davinci-002",
  "code-cushman-002"
];

export const DEFAULT_GEMINI_MODELS = [
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-1.5-flash"
];
