import vscode from "vscode";
import { IAAnalyticsType } from "./analytics";
export type IRecord = Record<string, any>;

export interface IAppMetaInfo {
  appName?: string;
  version?: string;
  description?: string;
  appTotalDep?: number;
}

export interface IUserInfo {
  userName: string;
  hostname: string;
  platform: string;
  macAddress: string;
}
export interface IWebRenderer {
  initialized: boolean;
  extensionVersion: string;
  template?: any;
  title?: string;
  panel?: any;
  panelId?: string | null;
  context: any;
  content: any;
  appMeta: any;
  userInfo?: IUserInfo;
  analytics?: IAAnalyticsType;
  parentPath: string;
  extensionPath: string;
  outdatedPackages?: Array<any>;
  packagesWithVersion: Record<string, any>;
  pkgJSON: any | null;
  uri: any;
  packageLockFile: any;
  pckName?: string;
  scanAudit?: boolean;
  scanOutdated?: boolean;
  auditingOutdatedPackages?: boolean;
  auditingVulnerabilities?: boolean;
  projectStat: IRecord;
  tempData: IRecord;
  npmAuditViewData?: IRecord;
  init: (context: IContext) => void;
  setAppMetaData: (appInfo: IAppMetaInfo) => void;
  renderContent: (content: string, title?: string, sourceType?: string) => void;
  renderError: (data: Record<string, any>) => void;
  renderLoader: () => void;
  sendMessageToUI: (command: string, data: IRecord) => void;
  setReportData: (view: IRecord) => void;
  sendAnalytics: (
    category: string,
    action: string,
    label: string,
    value: string
  ) => void;
}

interface VulFixType {
  isSemVerMajor: boolean;
  name: string;
  version: string;
}

export interface INPMAuditVulnerabilityType {
  isNoVul?: boolean;
  configuredVersion: string;
  installedVersion: string;
  range?: string;
  severity: "critical" | "high" | "moderate" | "low";
  title?: string;
  url?: string;
  viaPackage?: string;
  fixAvailable?: "Yes" | "No" | "Breaking";
  isBreakingChange?: boolean;
  fixPackageName?: string;
  fixPackageVersion?: string;
  cwe?: Array<string>;
  cvss?: { score: number; vectorString: string };
  recommendation?: string;
}

export interface INPMAuditResponseType {
  id: string;
  packageName: string;
  dependencyType: "Prod" | "Dev" | "Peer" | "Optional";
  version: string;
  hasVulnerability: boolean;
  count: { c: number; h: number; m: number; l: number; t: number };
  vulnerabilities?: Array<INPMAuditVulnerabilityType>;
}

export interface IOutdatedPackageType {
  packageName: string;
  version: string;
  id: string;
  current: string;
  wanted: string;
  latest: string;
  dependent: string;
  location: string;
  severity?: number;
  dependencyType: "Prod" | "Dev" | "Peer" | "Optional";
}

export type DEPENDENCY_TYPE = "Prod" | "Dev" | "Peer" | "Optional";

export interface IPILLType {
  val: string | number;
  label: string;
  showZero: boolean;
  tooltip?: string;
  hideTooltip?: boolean;
}

export type IContext = vscode.ExtensionContext;
export type IUri = vscode.Uri;

export interface IExtensionListItem {
  id: string;
  name: string;
  description: string;
}

export interface ID_Title_DESC {
  id: number | string;
  title: string;
  description: string;
}

export interface ITopicStepType extends ID_Title_DESC {
  status?: number;
  subtitle?: string;
  successMsg?: string;
  errorMsg?: string;
  command: string;
  commandType?: string;
  fileName?: string;
  fileContent?: string;
  commandAttribute?: string;
  commandAddAttributeKey?: string;
  commandAddAttributeValue?: string;
}

export interface ITopicItemType extends ID_Title_DESC {
  steps?: Array<ITopicStepType>;
}

export type AIProviderType = "openAI" | "gemini";
