const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { OpenAI } = require('openai');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure you're using the correct key
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const token = process.env.MUDAE_BOT_TOKEN;
const clientId = process.env.MUDAE_CLIENT_ID;

// Registering Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a character in a humorous way!'),
  new SlashCommandBuilder()
    .setName('glaze')
    .setDescription('Praise how amazing a character is!'),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(token);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || !['roast', 'glaze'].includes(interaction.commandName)) return;

  try {
    // Defer reply immediately to avoid timeout
    await interaction.deferReply();

    // Fetch the latest message in the channel with an embed
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    const embedMessage = messages.find(msg => msg.embeds.length > 0);

    if (!embedMessage) {
      return interaction.editReply('Could not find any recent message with an embed to analyze!');
    }

    // Extract data from the embed
    const embed = embedMessage.embeds[0];
    const description = embed.description || '';
    const showName = description.split('\n')[0] || 'Unknown Show'; // First line as show name
    const characterName = embed.author?.name || embed.title || embed.fields?.[0]?.value || embed.description || 'Unknown Character';

    if (!characterName) {
      return interaction.editReply('Could not find a character name in the embed!');
    }

    // Generate the OpenAI prompt based on the command
    const prompt =
      interaction.commandName === 'roast'
        ? `Roast the fictional character "${characterName}" from the show "${showName}" humorously. Be light but a tad mean. Make it short and mock them in the style of gen z. Don't use hashtags those are cringe.`
        : `Praise the fictional character "${characterName}" from the show "${showName}" as if they are the most amazing being ever. Be over-the-top, heartfelt, and funny. Make it short and mock them in the style of gen z. Make it two to four sentences at most.`;

    // Generate response using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    const result = response.choices[0].message.content.trim();
    return interaction.editReply(result);
  } catch (error) {
    console.error('Error handling interaction:', error);

    // Handle errors gracefully
    if (interaction.deferred || interaction.replied) {
      // Interaction was acknowledged, edit the reply
      return interaction.editReply('An error occurred while processing your request. Please try again later.');
    } else {
      // Interaction not acknowledged, reply normally
      return interaction.reply({ content: 'An error occurred while processing your request. Please try again later.', ephemeral: true });
    }
  }
});
