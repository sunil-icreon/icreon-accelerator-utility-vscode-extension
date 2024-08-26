const extensionPrefix = `icreon-accelerator-utility`;
const REPORT_TITLE = "Icreon Accelerator Audit Report";
const REPORT_TEMPLATE = "npm-audit-report";
const REPORT_FOLDER_NAME = "icreon-accelerator-utility";
const REPORT_FILE_NAME = "icreon-accelerator-utility";

const EXTENSION_CONFIG = {
  GPT_MODELS: "GPTModels",
  API_URL: {
    VULNERABILITY: "apiURL.vulnerability",
    PROJECT_STATS: "apiURL.projectStatistics"
  }
};

const SOURCE_TYPE = {
  PROJECT: "project",
  AI: "ai"
};

const EXECUTION_STATUS = {
  NOT_STARTED: 0,
  RUNNING: 1,
  COMPLETE: 2,
  FAILED: 3,
  CONFIRM: 4
};

const SEVERITY_TYPE = {
  CRITICAL: "Critical",
  HIGH: "High",
  MODERATE: "Moderate",
  LOW: "Low",
  INFO: "Info",
  SUCCESS: "Success",
  GENERAL: "General"
};

const VUL_SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MODERATE: "moderate",
  LOW: "low"
};

const PROJECT_STAT = {
  OUTDATED_PACKAGES: "outdatedStat",
  UNUSED_CODE: "ununsedStat",
  LICENSED: "licensedStat",
  DUPLICATE_CODE: "duplicateStat",
  ESLINT: "eslintStat",
  AUDIT: "auditStat",
  CODE_SCORE: "codeScoreStat",
  DASHBOARD: "dashboardStat"
};
const LOCAL_STORAGE = {
  RECENT_PACKAGE_VIEWED: "recent_package_viewed",
  VULNERABILITIES: "vulnerabilities",
  OPEN_AI_KEY: "openAIKey"
};

const KNOWLEDGE_CENTER = {
  DASHBOARD: "Icreon Accelerator: Dashboard",
  TITLE: "Icreon Accelerator Knowledge Center",
  SUB_TITLE: "Collection of resources",
  NPM_SEARCH_SUB_TITLE: "Search npm packages",
  AI_DASHBOARD: "Icreon Accelerator: AI Dashboard",
  AI_SEARCH: "Icreon Accelerator: AI Search"
};

const COMMANDS = {
  DASHBOARD: `${extensionPrefix}.dashboard`,
  NPM_AUDIT: `${extensionPrefix}.npmAuditReportCommand`,
  NPM_AUDIT_SINGLE: `${extensionPrefix}.npmAuditReportCommandSingleFile`,
  KNOWLEDGE_CENTER: `${extensionPrefix}.knowledgeCenter`,
  NPM_SEARCH: `${extensionPrefix}.npmSearch`,
  AI_DASHBOARD: `${extensionPrefix}.aiDashboard`,
  AI_SEARCH: `${extensionPrefix}.aiSearch`,
  OPEN_AI_CLEAR_KEY: `${extensionPrefix}.openAIClearKey`,
  ON_SELECTION: `${extensionPrefix}.runCommandOnNPMPackageSearch`,
  SUBMIT_VUL_DATA: `${extensionPrefix}.submitVulnerabilityData`
};

const MSGS = {
  PACKAGE_LOCK_JSON_NOT_FOUND: `Error: package-lock.json file not found!`,
  INVALID_SELECTION: `Invalid Selection`,
  REPORT_CREATED: `Report downloaded successfully!`,
  PDF_ERROR: `Error generating PDF Report. Please try again later. You may need to open VSCode in Administrator mode.`,
  PREPARING_PDF: `Generating PDF, please wait...`,
  SCORE_TOOLTIP: `This score calculates overall vulnerability severity from 0 to 10 and is based on the Common Vulnerability Scoring System (CVSS).`,
  CWE_TOOLTIP: `The Common Weakness Enumeration (CWE) is a list of weaknesses in software that can lead to security issues.`,
  GHSA_TOOLTIP: `GHSA is the GitHub Security Advisories database. GHSA ID is the identifier of the advisory for any given vulnerability.`
};

const SECTIONS_IDS = {
  VULNERABILITIES: "vulnerabilities",
  DEPENDENCIES: "dependencies",
  OUTDATED_PACKAGES: "outdatedPackages",
  ESLINT: "eslintIssues",
  DUPLICATE_CODES: "duplicateCodes",
  CODE_SCORE: "codeScores",
  LICENSED: "licensed",
  UNUSED_CODES: "unused_codes"
};

const SECTIONS = [
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
  },
  {
    id: SECTIONS_IDS.LICENSED,
    label: "Licensed Files",
    info: `This will find external references of licensed files.`,
    selected: false
  }
];

const IGNORE_PATHS = {
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

const DEFAULT_GPT_MODELS = [
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
module.exports = {
  MSGS,
  extensionPrefix,
  COMMANDS,
  REPORT_FILE_NAME,
  REPORT_FOLDER_NAME,
  REPORT_TITLE,
  REPORT_TEMPLATE,
  IGNORE_PATHS,
  VUL_SEVERITY,
  SECTIONS,
  SECTIONS_IDS,
  SEVERITY_TYPE,
  LOCAL_STORAGE,
  KNOWLEDGE_CENTER,
  PROJECT_STAT,
  EXECUTION_STATUS,
  EXTENSION_CONFIG,
  SOURCE_TYPE,
  DEFAULT_GPT_MODELS
};
