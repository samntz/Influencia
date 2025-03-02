const { REST, Routes } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const TOKEN = config.token;
const CLIENT_ID = '1345718062648786966'; // ⚠️ Reemplaza esto con el ID de tu bot
const GUILD_ID = '1345695110813188217'; // ⚠️ Si solo lo quieres en un servidor, pon su ID

const commands = [];
const commandFiles = fs.readdirSync('./Comandos').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./Comandos/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken("MTM0NTcxODA2MjY0ODc4Njk2Ng.GeBxQh.WauDut0WiOrPUzDcU76cvOctdGGs0JHfiHY6NI");

(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos de barra...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), 
            { body: commands }
        );

        console.log('✅ ¡Comandos registrados con éxito!');
    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
})();
