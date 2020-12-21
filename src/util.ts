import Discord from "discord.js";

class Utils {
  static isVBRP(details: string): boolean {
    if (details.toUpperCase().indexOf("VBRP") !== -1 || details.toUpperCase().indexOf("VESPUCCI BEACH") !== -1) {
      return true;
    }

    return false;
  }

  static sendMessage(
    guild: Discord.Guild,
    announceChannel: string,
    msg: string,
    embeddedmsg: Discord.MessageEmbed,
  ): void {
    const channel = guild.channels.cache.find((ch) => ch.id === announceChannel);
    if (!channel) return;
    (channel as Discord.TextChannel).send(msg, { embed: embeddedmsg });
  }
}

export default Utils;
