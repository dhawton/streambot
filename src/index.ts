import Discord from "discord.js";
import fs from "fs";
import path from "path";
import Log from "./log";
import Utils from "./util";
import Twitch from "./twitch";
import LiveEmbed from "./embed";

const Streamers: { [key: string]: boolean } = {};
const Streams: { [key: string]: string } = {};
let guild: Discord.Guild;
let streamLock = false;

interface Config {
  discord: {
    token: string;
    announceChannel: string;
    role: string;
  };
  twitch: {
    clientId: string;
    secret: string;
    token: string | null;
  };
}

if (!fs.existsSync(path.resolve(__dirname, "config.json"))) {
  Log.error("Config not found");
  process.exit(1);
}

const config: Config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "config.json")).toString());

const client = new Discord.Client();
const twitch = new Twitch(config.twitch);
let streamRole: Discord.Role;

Log.info("Starting up VBRP Bot");

client.on("ready", () => {
  Log.info(`Logged in as ${client.user.tag}`);
  client.user.setActivity("https://discord.vbrp.org", { type: "WATCHING" });
  guild = client.guilds.cache.first();
  streamRole = guild.roles.cache.find((role) => role.name === config.discord.role);
});

client.on(
  "presenceUpdate",
  (_, newPresence): Promise<void> => {
    if (!newPresence.activities) return;

    newPresence.activities.forEach((activity) => {
      if (activity.type === "STREAMING" && !Streamers[newPresence.user.tag] && Utils.isVBRP(activity.details)) {
        Log.info(`${newPresence.user.tag} is streaming at ${activity.url}`);
        const channel = activity.url.replace("https://www.twitch.tv/", "");
        twitch
          .fetchStreamInfo(channel)
          .then(async (streamData) => {
            if (!streamData) {
              Log.info("No streamdata...");
              return;
            }

            const msg = LiveEmbed.createFromStream(streamData);
            guild = newPresence.guild;
            Utils.sendMessage(
              newPresence.guild,
              config.discord.announceChannel,
              `${client.emojis.cache.find((emoji) => emoji.name === "vbrp")} ${
                newPresence.user.tag
              } is now streaming on Twitch!`,
              msg,
            );
            Streamers[newPresence.user.tag] = true;
            Streams[channel] = newPresence.user.tag;
            Log.info(JSON.stringify(Streams));
            try {
              await guild.members.cache
                .find((member) => member.user.tag === newPresence.user.tag)
                .roles.add(streamRole);
            } catch (err) {
              Log.error(`Error adding role for ${newPresence.user.tag}, ${err}`);
            }
          })
          .catch(() => {
            Log.error("Skipping stream due to error");
          });
      }
    });
  },
);

setInterval(() => {
  if (!streamLock) {
    streamLock = true;
    Object.keys(Streams).forEach(async (key) => {
      const v = Streams[key];
      try {
        await twitch.fetchStreamInfo(v).then(
          async (streamData): Promise<void> => {
            if (streamData.length === 0) {
              Streams[key] = undefined;
              try {
                await guild.members.cache.find((member) => member.user.tag === v).roles.remove(streamRole);
              } catch (err) {
                Log.error(`Error clearing role for ${v}, ${err}`);
              }
            }
          },
        );
      } catch (err) {
        Log.error(err);
        Log.error(err.trace);
      }
    });
    Log.info(`interval check, active streams are: ${JSON.stringify(Streams)}`);
    streamLock = false;
  }
}, 120000);

client.login(config.discord.token);
