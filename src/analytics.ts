import { IRecord, IUserInfo } from "./common.types";
import { httpAPI } from "./util";

export interface IAAnalyticsType {
  trackingId: string;
  initialized: boolean;
  userInfo: IUserInfo | undefined;
  clientId: string;
  sendEvent: (
    category: string,
    action: string,
    label: string,
    value: string | IRecord | Array<any>
  ) => void;
}

export class IAAnalytics {
  trackingId: string = "";
  initialized: boolean = false;
  userInfo: IUserInfo | undefined = undefined;
  clientId: string = "";

  constructor(userInfo: IUserInfo) {
    this.clientId = `${userInfo.userName}-${userInfo.hostname}`;
  }

  sendEvent(
    category: string,
    action: string,
    label: string = "",
    value: string | IRecord | Array<any> = ""
  ) {
    const valObj = {
      user: this.clientId,
      data: value
    };

    const EVENT_NAME = "Experience_Event";
    const GA_MEASUREMENT_ID = "G-1BNYYW5N2W";
    const GA_API_SECRET = "PPs_tmSTSdO3tUzV2gdzpQ";

    const payload: any = {
      client_id: this.clientId,
      events: [
        {
          name: EVENT_NAME,
          params: {
            category: category,
            action,
            label: label,
            value: valObj
          }
        }
      ]
    };

    try {
      httpAPI(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        "POST",
        JSON.stringify(payload)
      );
    } catch (e) {}
  }
}
