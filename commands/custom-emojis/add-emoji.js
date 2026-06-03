const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { insert, getMany } = require('../../utils/database');
const { getGuildSettings, updateGuildSettings } = require('../../utils/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-emoji')
    .setDescription('Add a custom emoji to the server')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name for the emoji (e.g., "happy")')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Image file for the emoji')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),
  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const image = interaction.options.getAttachment('image');

    // Check if the image is valid
    if (!image.contentType.startsWith('image/')) {
      return interaction.editReply('❌ Please upload an image file (PNG, JPG, GIF).');
    }

    try {
      // Check if custom emojis are enabled
      const guildSettings = await getGuildSettings(interaction.guild.id);
      if (!guildSettings.custom_emojis_enabled) {
        return interaction.editReply('❌ Custom emojis are not enabled for this server. Ask an admin to enable them.');
      }

      // Check if emoji name already exists
      const existingEmoji = await getMany('custom_emojis', {
        guild_id: interaction.guild.id,
        name: name.toLowerCase(),
      });

      if (existingEmoji.length > 0) {
        return interaction.editReply(`❌ An emoji with the name **${name}** already exists.`);
      }

      // Add the emoji to the database
      await insert('custom_emojis', {
        guild_id: interaction.guild.id,
        name: name.toLowerCase(),
        url: image.url,
        created_by: interaction.user.id,
      });

      // Add the emoji to the guild's custom_emojis array
      const customEmojis = guildSettings.custom_emojis || [];
      customEmojis.push({ name: name.toLowerCase(), url: image.url });
      await updateGuildSettings(interaction.guild.id, {
        custom_emojis: customEmojis,
      });

      await interaction.editReply(`✅ Custom emoji **${name}** added! Use it with \`:${name}:\``);
    } catch (error) {
      console.error('Error adding emoji:', error);
      await interaction.editReply('❌ Failed to add emoji. Please try again.');
    }
  },
};
