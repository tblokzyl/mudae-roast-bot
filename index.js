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

  console.log('Interaction:', interaction);

  // Check if it's a reply to an embed directly
  const repliedMessage = interaction.message?.referencedMessage;
  console.log('Replied Message:', repliedMessage); // Log the replied message

  if (repliedMessage) {
    // If the interaction is a reply to an embed message
    const embed = repliedMessage.embeds[0];
    console.log('Embed Structure (Replied Message):', embed); // Log the full embed structure

    const characterName = embed.author?.name || embed.title || embed.fields?.[0]?.value || embed.description;
    console.log('Character Name (Replied Message):', characterName);

    if (!characterName) {
      return interaction.reply({ content: 'Could not find a character name in the embed!', ephemeral: true });
    }

    try {
      // Use OpenAI's `chat.completions.create` method for generating a roast
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',  // Ensure you are using the correct model
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Roast the fictional character "${characterName}" humorously. Be light but a tad mean. Make it short and mock them in the style of gen z.` }
        ]
      });

      const roast = response.choices[0].message.content.trim();
      return interaction.reply({ content: roast });
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      return interaction.reply({ content: 'Failed to generate a roast. Please try again later.', ephemeral: true });
    }
  } else {
    // If it's not a reply, fetch the most recent message with an embed
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const embedMessage = messages.find(msg => msg.embeds.length > 0);
      
      if (!embedMessage) {
        return interaction.reply({ content: 'Could not find any recent message with an embed to roast!', ephemeral: true });
      }

      // Log the embed structure for the fetched message
      console.log('Embed Structure (Fetched Message):', embedMessage.embeds[0]);

      // Extract the character name from the embed
      const embed = embedMessage.embeds[0];
      const characterName = embed.author?.name || embed.title || embed.fields?.[0]?.value || embed.description;
      console.log('Character Name (Fetched Message):', characterName);

      if (!characterName) {
        return interaction.reply({ content: 'Could not find a character name in the embed!', ephemeral: true });
      }

      // Generate the roast using OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Roast the fictional character "${characterName}" humorously. Be light but a tad mean. Make it short and mock them in the style of gen z.` }
        ]
      });

      const roast = response.choices[0].message.content.trim();
      return interaction.reply({ content: roast });
    } catch (error) {
      console.error('Error fetching recent message with embed:', error);
      return interaction.reply({ content: 'Failed to find a message with an embed. Please try again later.', ephemeral: true });
    }
  }
});
