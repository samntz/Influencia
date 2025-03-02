const { 
    Events, 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const fs = require('fs');

// Almacenamiento temporal de datos del ticket
const ticketData = new Map();

// Ruta del archivo de configuración para los logs
const settingsPath = './serverSettings.json';

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // ✅ Manejar el menú desplegable para crear tickets
            if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
                if (!interaction.values || interaction.values.length === 0) {
                    return interaction.reply({ content: '❌ No se seleccionó ninguna opción.', ephemeral: true });
                }

                await interaction.deferUpdate();

                const [type, category, roleId, categoryId] = interaction.values[0].split('_');
                const categoria = interaction.guild.channels.cache.get(categoryId);

                if (!categoria || categoria.type !== ChannelType.GuildCategory) {
                    return interaction.followUp({ content: '❌ La categoría especificada no es válida.', ephemeral: true });
                }

                const userTicket = Array.from(ticketData.values()).find(ticket =>
                    ticket.author.id === interaction.user.id
                );

                if (userTicket) {
                    return interaction.followUp({
                        content: '⚠️ Solo puedes tener un ticket abierto a la vez.',
                        ephemeral: true,
                    });
                }

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: categoria.id,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                        { id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                ticketData.set(ticketChannel.id, {
                    author: interaction.user,
                    createdAt: new Date(),
                    category: category,
                    channelId: ticketChannel.id,
                    messages: {},
                });

                const embed = new EmbedBuilder()
                    .setTitle('📩 Ticket Abierto')
                    .setDescription(
                        'Describe tu problema y un miembro del equipo de soporte te asistirá en breve.\n\n' +
                        `**Razón:** ${category}`
                    )
                    .setColor('#2b2d31')
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_cerrar').setLabel('🗑️ Cerrar').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('ticket_claim').setLabel('📌 Reclamar').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('📜 Transcribir').setStyle(ButtonStyle.Secondary)
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [buttons] });

                await interaction.followUp({
                    content: `✅ Tu ticket ha sido creado: [${ticketChannel.name}](${ticketChannel.url})`,
                    ephemeral: true,
                });
            }

            // ✅ Manejar botones en los tickets
            if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
                const ticket = ticketData.get(interaction.channel.id);

                if (!ticket) {
                    return interaction.reply({ content: '❌ Este ticket no está registrado.', ephemeral: true });
                }

                if (interaction.customId === 'ticket_cerrar') {
                    const modal = new ModalBuilder()
                        .setCustomId('close_ticket_modal')
                        .setTitle('Cerrar Ticket');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('reason_input')
                        .setLabel('Razón para cerrar el ticket')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(reasonInput);
                    modal.addComponents(row);

                    await interaction.showModal(modal);
                } else if (interaction.customId === 'ticket_transcript') {
                    const messages = await interaction.channel.messages.fetch();
                    const transcript = messages.map(m => `${m.author.tag}: ${m.content}`).reverse().join('\n');
                    const transcriptFileName = `transcript-${interaction.channel.name}.txt`;

                    fs.writeFileSync(transcriptFileName, transcript);

                    // Obtener el canal de logs desde el archivo de configuración
                    let logChannelId;
                    if (fs.existsSync(settingsPath)) {
                        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                        logChannelId = settings[interaction.guild.id]?.logChannelId;
                    }

                    if (logChannelId) {
                        const logsChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logsChannel) {
                            await logsChannel.send({
                                files: [{ attachment: transcriptFileName, name: transcriptFileName }],
                            });
                        }
                    }

                    // Eliminar el archivo después de enviarlo
                    if (fs.existsSync(transcriptFileName)) {
                        fs.unlinkSync(transcriptFileName);
                    }

                    await interaction.reply({
                        content: '📜 El transcript ha sido generado y enviado al canal de logs.',
                        ephemeral: true,
                    });
                }
            }

            // ✅ Manejar el cierre del ticket al enviar el modal
            if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
                const ticket = ticketData.get(interaction.channel.id);

                if (!ticket) {
                    return interaction.reply({ content: '❌ Este ticket no está registrado.', ephemeral: true });
                }

                try {
                    const reason = interaction.fields.getTextInputValue('reason_input');
                    const closedAt = new Date();
                    const messages = await interaction.channel.messages.fetch();
                    const transcript = messages.map(m => `${m.author.tag}: ${m.content}`).reverse().join('\n');
                    const transcriptFileName = `transcript-${interaction.channel.name}.txt`;

                    fs.writeFileSync(transcriptFileName, transcript);

                    let logChannelId;
                    if (fs.existsSync(settingsPath)) {
                        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                        logChannelId = settings[interaction.guild.id]?.logChannelId;
                    }

                    if (logChannelId) {
                        const logsChannel = interaction.guild.channels.cache.get(logChannelId);
                        if (logsChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🗑️ Ticket Cerrado')
                                .addFields(
                                    { name: 'Nombre del Ticket', value: interaction.channel.name, inline: true },
                                    { name: 'Autor del Ticket', value: `<@${ticket.author.id}>`, inline: true },
                                    { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'Fecha de Apertura', value: ticket.createdAt.toLocaleString(), inline: true },
                                    { name: 'Fecha de Cierre', value: closedAt.toLocaleString(), inline: true },
                                    { name: 'Razón de Cierre', value: reason || 'No especificada', inline: false }
                                )
                                .setColor('#ff0000');

                            await logsChannel.send({
                                embeds: [logEmbed],
                                files: [{ attachment: transcriptFileName, name: transcriptFileName }],
                            });
                        }
                    }

                    // Eliminar el archivo después de enviarlo
                    if (fs.existsSync(transcriptFileName)) {
                        fs.unlinkSync(transcriptFileName);
                    }

                    ticketData.delete(interaction.channel.id);
                    await interaction.reply({ content: '🗑️ El ticket ha sido cerrado correctamente.', ephemeral: true });
                    setTimeout(() => interaction.channel.delete(), 1000);
                } catch (error) {
                    console.error('❌ Error al cerrar el ticket:', error);
                    await interaction.reply({ content: '❌ Algo salió mal al cerrar el ticket. Por favor, inténtalo de nuevo.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('❌ Error en InteractionCreate:', error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocurrió un error al manejar la interacción.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Ocurrió un error inesperado.', ephemeral: true });
            }
        }
    },
};
