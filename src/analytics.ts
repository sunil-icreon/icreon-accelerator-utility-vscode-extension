// // export const ANALYTICS = {
// //   sendEvent: (category:string, action:string, label:string = '', value:string = '') => {
// //     const trackingId = 'UA-XXXXX-Y'; // Replace with your Google Analytics tracking ID
// //     const clientId = generateClientId(); // Generate or retrieve client ID (can be stored locally)

import { IUserInfo, IWebRenderer } from "./common.types";
import { closeIcon, icreonIcon } from "./icons";
import { formatDate, hrDivider, httpAPI, logMsg } from "./util";

// //     const data = {
// //       v: '1', // Version of the protocol
// //       tid: trackingId, // Tracking ID
// //       cid: clientId, // Client ID (randomly generated or stored)
// //       t: 'event', // Hit type: event
// //       ec: category, // Event category
// //       ea: action, // Event action
// //       el: label, // Event label (optional)
// //       ev: value, // Event value (optional)
// //     };
// //   }
// // };

export interface ILogEventType {
  v: string;
  tid: string;
  cid: string;
  t: string;
  ec: string;
  ea: string;
  el?: string;
  ev?: string;
  ts: string;
}

export interface IAAnalyticsType {
  trackingId: string;
  initialized: boolean;
  userInfo: IUserInfo | undefined;
  clientId: string;
  eventLogs: Array<ILogEventType>;
  sendEvent: (
    category: string,
    action: string,
    label: string,
    value: string
  ) => void;

  showEventLog: (webRenderer: IWebRenderer) => void;
}

export class IAAnalytics {
  trackingId: string = "";
  initialized: boolean = false;
  userInfo: IUserInfo | undefined = undefined;
  clientId: string = "";

  eventLogs: Array<ILogEventType> = [];
  constructor(userInfo: IUserInfo) {
    this.clientId = `${userInfo.userName}-${userInfo.hostname}`;
  }

  setClientID(clientIdValue: string) {
    this.clientId = clientIdValue;
  }

  sendEvent(
    category: string,
    action: string,
    label: string = "",
    value: string = ""
  ) {
    const data: ILogEventType = {
      v: "1",
      tid: this.trackingId,
      cid: this.clientId,
      t: "event", // Hit type: event
      ec: category, // Event category
      ea: action, // Event action
      el: label, // Event label (optional)
      ev: value, // Event value (optional),
      ts: new Date().toUTCString()
    };

    const payload: any = {
      client_id: this.clientId,
      events: [
        {
          name: "ia_ext_event",
          params: {
            category: category,
            label: label,
            value: value,
            engagement_time_msec: "100"
          }
        }
      ]
    };

    const GA_MEASUREMENT_ID = "G-BRNZ91CF58";
    const GA_API_SECRET = "8_s2IjRPQXOOGMiZtLnZQA";

    try {
      httpAPI(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        "POST",
        JSON.stringify(payload)
      );
    } catch (e) {
      logMsg(e, true);
    }

    this.eventLogs = [...this.eventLogs, data];
  }

  showEventLog(webRenderer: IWebRenderer) {
    let htmlStr = ``;

    htmlStr += `
  <div class='dep-info-box info-pages'>
    <button class='close-link' 
            onclick='showEventLog(false)'
            data-tooltip="Close"
            >
      ${closeIcon(24)}
    </button> 

    <div class='icreon-icon'>${icreonIcon("#212529")}</div>
    <h1 class='grey-header mt-0'>Analytics Logs</h1> 
    ${hrDivider}
    
    <div class='dep-info'>
      <div class='section'>`;

    htmlStr += `<div class="content-box">
      <table class='table table-striped table-bordered table-sm simple-table'>
        <tr>
            <th class='text-align-left'>#</th>
            <th class='text-align-left'>Client ID</th>
            <th class='text-align-left'>Category</th>
            <th class='text-align-left'>Action</th>
            <th class='text-align-left'>Label</th>
            <th class='text-align-left'>Value</th>
            <th class='text-align-left'>Date</th>
        </tr>`;

    this.eventLogs.map((event: ILogEventType, index: number) => {
      htmlStr += `
        <tr>
            <td class='text-align-left'>${index + 1}</th>
            <td class='text-align-left'>${event.cid}</th>
            <td class='text-align-left'>${event.ec}</th>
            <td class='text-align-left'>${event.ea}</th>
            <td class='text-align-left'>${event.el}</th>
            <td class='text-align-left'>${event.ev}</th>
            <td class='text-align-left'>${formatDate(event.ts, true)}</th>
        </tr>`;
    });

    htmlStr += `
            </table>
        </div>
    </div>
  </div>
  `;

    webRenderer.sendMessageToUI("analyticsEventLogContent", {
      htmlContent: htmlStr
    });
  }
}
