const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ApplicationCommandOptionType,
  ComponentType,
} = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "remoteunban",
  description: "unbans the specified member",
  category: "OWNER",
  botPermissions: ["BanMembers"],
  command: {
    enabled: true,
    usage: "<ID|@member> [ServerID]",
    minArgsCount: 2,
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "name",
        description: "match the name of the member",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "guildid",
        description: "ID of server to unban user in",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reason",
        description: "reason for unban",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const match = args[0];
    const guild = message.client.guilds.cache.get(args[1]);
    const reason = message.content.split(args[1])[2].trim();

    const response = await getMatchingBans(guild, match);
    const sent = await message.safeReply(response);
    if (typeof response !== "string") await waitForBan(message.member, reason, sent, guild);
  },

  async interactionRun(interaction) {
    const match = interaction.options.getString("name");
    const guild = interaction.client.guilds.cache.get(interaction.options.getString("guildid"));
    const reason = interaction.options.getString("reason");

    const response = await getMatchingBans(guild, match);
    const sent = await interaction.followUp(response);
    if (typeof response !== "string") await waitForBan(interaction.member, reason, sent, guild);
  },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} match
 */
async function getMatchingBans(guild, match) {
  const bans = await guild.bans.fetch({ cache: false });

  const matched = [];
  for (const [, ban] of bans) {
    if (ban.user.partial) await ban.user.fetch();

    // exact match
    if (ban.user.id === match || ban.user.tag === match) {
      matched.push(ban.user);
      break;
    }

    // partial match
    if (ban.user.username.toLowerCase().includes(match.toLowerCase())) {
      matched.push(ban.user);
    }
  }

  if (matched.length === 0) return `No user found matching ${match}`;

  const options = [];
  for (const user of matched) {
    options.push({ label: user.tag, value: user.id });
  }

  const menuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("unban-menu").setPlaceholder("Choose a user to unban").addOptions(options)
  );

  return { content: "Please select a user you wish to unban", components: [menuRow] };
}

/**
 * @param {import('discord.js').GuildMember} issuer
 * @param {string} reason
 * @param {import('discord.js').Message} sent
 */
async function waitForBan(issuer, reason, sent, guild) {
  const collector = sent.channel.createMessageComponentCollector({
    filter: (m) => m.member.id === issuer.id && m.customId === "unban-menu" && sent.id === m.message.id,
    time: 20000,
    max: 1,
    componentType: ComponentType.StringSelect,
  });

  //
  collector.on("collect", async (response) => {
    const userId = response.values[0];
    const user = await issuer.client.users.fetch(userId, { cache: true });

    const status = await unBanTarget(issuer, user, reason, guild);
    if (typeof status === "boolean") return sent.edit({ content: `${user.username} is un-banned!`, components: [] });
    else return sent.edit({ content: `Failed to unban ${user.username}`, components: [] });
  });

  // collect user and unban
  collector.on("end", async (collected) => {
    if (collected.size === 0) return sent.edit("Oops! Timed out. Try again later.");
  });
}

async function unBanTarget(issuer, target, reason, guild) {
  try {
    await guild.bans.remove(target, reason);
    return true;
  } catch (ex) {
    error(`unBanTarget`, ex);
    return "ERROR";
  }
}
