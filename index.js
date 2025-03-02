const { Client, GatewayIntentBits, EmbedBuilder, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Token } = process.env;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const configPath = './config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.token;
let welcomeChannelId = config.welcomeChannelId || null;

client.once('ready', () => {
    console.log(`Bot iniciado como ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
    if (!welcomeChannelId) return;
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#000000') // Color NEGRO
        .setTitle('🎉 ¡BIENVENIDO A INFUENCIA RP! ')// BIENVENIDA A TODO !
        .setDescription(`¡Bienvenido/a <@${member.id}>! 🎊\nDisfruta tu estancia en ** INFUENCIA RP** `) // TEXTO DE   BIENVENIDA
    
        .setFooter({ text: 'Diviértete y sigue las normas 📜' });

    channel.send({ content: `¡Hola <@${member.id}>! 👋`, embeds: [welcomeEmbed] });
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!setwelcome') || message.author.bot) return;

    const args = message.content.split(' ');
    if (args.length < 2) {
        return message.reply('Uso correcto: !setwelcome <ID_DEL_CANAL>');
    }

    welcomeChannelId = args[1];
    config.welcomeChannelId = welcomeChannelId;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    message.reply(`Canal de bienvenida establecido a <#${welcomeChannelId}> 🍊`);
});
// Crear una colección para almacenar los comandos
client.commands = new Collection();

// Función para cargar comandos
const loadCommands = () => {
    const commandsPath = path.resolve(__dirname, './Comandos');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    console.log("Cargando comandos...");
    for (const file of commandFiles) {
        const command = require(`${commandsPath}/${file}`);
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Comando cargado: ${command.data.name}`);
        } else {
            console.warn(`⚠️ El archivo "${file}" no tiene "data" o "execute".`);
        }
    }
};

// Función para cargar eventos
const loadEvents = () => {
    const eventsPath = path.resolve(__dirname, './Eventos');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    console.log("Cargando eventos...");
    for (const file of eventFiles) {
        const event = require(`${eventsPath}/${file}`);
        if (event.name && event.execute) {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(`✅ Evento cargado: ${event.name}`);
        } else {
            console.warn(`⚠️ El archivo "${file}" no tiene "name" o "execute".`);
        }
    }
};

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({ content: '❌ Comando no encontrado.', ephemeral: true });
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error("❌ Error al manejar la interacción:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Hubo un error al ejecutar este comando.', ephemeral: true });
        }
    }
});

(async () => {
    try {
        loadCommands();
        loadEvents();

        client.login(Token);
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
    }
})();

client.login(Token);