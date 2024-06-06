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
  name: "remoteban",
  description: "bans the specified member",
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
        description: "the member",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "guildid",
        description: "ID of server to ban user in",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reason",
        description: "reason for ban",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const match = await message.client.resolveUsers(args[0], true);
    const target = match[0];
    if (!target) return message.safeReply(`No user found matching ${args[0]}`);
    const guild = message.client.guilds.cache.get(args[1]);
    const reason = message.content.split(args[1])[2].trim();
    const response = await ban(message.member, target, reason, guild);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const target = interaction.options.getUser("name");
    const reason = interaction.options.getString("reason");
    const guild = interaction.client.guilds.cache.get(interaction.options.getString("guildid"));
    const response = await ban(interaction.member, target, reason, guild);
    await interaction.followUp(response);
  },
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} match
 */
async function ban(issuer, target, reason, guild) {
  const response = await banTarget(issuer, target, reason, guild);
  if (typeof response === "boolean") return `${target.username} is banned!`;
  if (response === "BOT_PERM") return `I do not have permission to ban ${target.username}`;
  else if (response === "MEMBER_PERM") return `You do not have permission to ban ${target.username}`;
  else return `Failed to ban ${target.username}`;
}

async function banTarget(issuer, target, reason, guild) {
  const targetMem = await guild.members.fetch(target.id).catch(() => {});
  try {
    await guild.bans.create(target.id, { days: 0, reason });
    return true;
  } catch (ex) {
    error(`banTarget`, ex);
    return "ERROR";
  }
}