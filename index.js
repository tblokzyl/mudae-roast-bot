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

// Registering Slash Command
const commands = [
  new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a character in a humorous way!'),
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
  if (!interaction.isCommand() || interaction.commandName !== 'roast') return;

  try {
    // Acknowledge the interaction early by deferring the reply
    await interaction.deferReply();

    // Fetch the latest message in the channel with an embed
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    const embedMessage = messages.find(msg => msg.embeds.length > 0);
    
    if (!embedMessage) {
      return interaction.editReply({ content: 'Could not find any recent message with an embed to roast!' });
    }

    const embed = embedMessage.embeds[0];
    const description = embed.description || '';
    const showName = description.split('\n')[0] || 'Unknown Show'; // Grab the first line as show name
    const characterName = embed.author?.name || embed.title || embed.fields?.[0]?.value || embed.description || 'Unknown Character';
    console.log('Show Name:', showName);
    console.log('Character Name:', characterName);

    if (!characterName) {
      return interaction.editReply({ content: 'Could not find a character name in the embed!' });
    }

    // Generate the roast using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: `Roast the fictional character "${characterName}" from the show "${showName}" humorously. Be light but a tad mean. Make it short and mock them in the style of gen z. Don't use hashtags those are cringe.` }
      ]
    });

    const roast = response.choices[0].message.content.trim();
    return interaction.editReply({ content: roast });
  } catch (error) {
    console.error('Error handling interaction:', error);
    return interaction.editReply({ content: 'An error occurred while processing your request. Please try again later.' });
  }
});
