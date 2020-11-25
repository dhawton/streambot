import axios from "axios";
import Log from "./log";

interface TwitchConfig {
  clientId: string;
  secret: string;
  token?: string;
  tokenExpires?: number;
}

interface RequestOptions {
  baseURL: string;
  headers: {
    "Client-ID": string;
    Authorization: string;
  };
}

interface TwitchUser {
  id?: string;
  bio?: string;
  created_at?: string;
  display_name?: string;
  logo?: string | null;
  name?: string;
  type?: string;
  updated_at?: string;
}

interface TwitchStreamInfo {
  id: string;
  user_id: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
}

class Twitch {
  config: TwitchConfig = {
    clientId: "",
    secret: "",
    token: "",
    tokenExpires: 0,
  };

  timerCheckOAuth: NodeJS.Timer | undefined;

  constructor(config: TwitchConfig) {
    this.config = config;
    this.fetchOAuth();
    this.timerCheckOAuth = setInterval(() => {
      this.checkOAuth();
    }, 60000);
  }

  requestOptions(): RequestOptions {
    return {
      baseURL: "https://api.twitch.tv/helix/",
      headers: {
        "Client-ID": this.config.clientId,
        Authorization: `Bearer ${this.config.token}`,
      },
    };
  }

  async fetchOAuth(): Promise<void> {
    let ret;
    Log.info("Refreshing Twitch OAuth token.");
    try {
      ret = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${this.config.clientId}&client_secret=${this.config.secret}&grant_type=client_credentials`,
      );
    } catch (error) {
      Log.error(`Could not retrieve Twitch OAuth token: ${error.message}`);
    }
    const { data } = ret;

    if (data.access_token !== undefined) {
      this.config.token = data.access_token;
      const d = new Date();
      d.setSeconds(d.getSeconds() + parseInt(data.expires_in, 10));
      this.config.tokenExpires = d.getTime();
    }
  }

  fetchUser(channel: string): Promise<TwitchUser> {
    return new Promise((resolve, reject) => {
      axios
        .get(`/users?login=${channel}`, this.requestOptions())
        .then((res) => {
          Log.info(JSON.stringify(res.data.data[0]));
          resolve(res.data.data[0] || []);
        })
        .catch((err) => {
          Log.error(`Error fetching user info from Twitch API ${err.message}`);
          reject(err);
        });
    });
  }

  fetchStreamInfo(channel: string): Promise<TwitchStreamInfo> {
    Log.info(`Fetching stream infor for channel #${channel}`);
    return new Promise((resolve, reject) => {
      axios
        .get(`/streams?user_login=${channel}`, this.requestOptions())
        .then((res) => {
          // Log.info(JSON.stringify(res.data.data[0]));
          resolve(res.data.data[0] || null);
        })
        .catch((err) => {
          Log.info(JSON.stringify(err));
          Log.error(`Error fetching stream info from Twitch API ${err.message}`);
          reject(err);
        });
    });
  }

  // Run every minute to see if we're within 5 minutes of token expiration
  checkOAuth(): void {
    if (this.config.token) {
      if (this.config.tokenExpires - new Date().getTime() > 5 * 60 * 1000) {
        this.fetchOAuth();
      }
    }
  }
}

export default Twitch;
