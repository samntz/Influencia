const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const settingsPath = path.resolve(__dirname, '../serverSettings.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('📩 | Configura un sistema de tickets con un menú desplegable')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Requiere permisos de Administrador
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Selecciona el canal donde se configurará el panel de tickets.')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('rol_staff')
        .setDescription('Selecciona el rol que podrá gestionar los tickets.')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('categoria')
        .setDescription('Selecciona la categoría donde se crearán los tickets.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const canal = interaction.options.getChannel('canal');
      const rol = interaction.options.getRole('rol_staff');
      const categoria = interaction.options.getChannel('categoria');

      // Embed del panel de tickets
      const embed = new EmbedBuilder()
        .setTitle('🎫 Contacta con nuestro equipo')
        .setDescription('Aquí podrás abrir un ticket para solicitar asistencia sobre algún problema o duda que tengas en Voxel Studio. Tan solo tienes que desplegar el menú inferior y seleccionar la categoría que más se corresponda con tu problema y rellenar el formulario con los datos pedidos.\n\nHacer un uso inadecuado del sistema de tickets puede ser sancionado, así que mantén la calma y sé en todo momento respetuoso con el equipo de Staff 🛡️')
        .setColor('#3df2e0');

      // Menú desplegable
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_menu')
          .setPlaceholder('Selecciona una categoría para tu ticket')
          .addOptions([
            {
              label: 'Soporte General',
              description: 'Para dudas o problemas generales.',
              emoji: '🌐',
              value: `ticket_general_${rol.id}_${categoria.id}`,
            },
            {
              label: 'Negocios',
              description: 'Para realizar negocios con Voxel Studio.',
              emoji: '📄',
              value: `ticket_negocios_${rol.id}_${categoria.id}`,
            },
            {
              label: 'Reportes',
              description: 'Para reportar bugs o usuarios.',
              emoji: '🚫',
              value: `ticket_reportes_${rol.id}_${categoria.id}`,
            },
            {
              label: 'Partner',
              description: 'Para asociarse con Voxel Studio.',
              emoji: '👑',
              value: `ticket_partner_${rol.id}_${categoria.id}`,
            },
            {
              label: 'Otro',
              description: 'Si ninguna categoría anterior aplica a tu problema.',
              emoji: '❓',
              value: `ticket_otro_${rol.id}_${categoria.id}`,
            },
          ])
      );

      // Enviar el panel de tickets
      await canal.send({ embeds: [embed], components: [menu] });
      await interaction.reply({ content: '✅ Panel de tickets configurado correctamente.', ephemeral: true });

      // Enviar logs al canal configurado
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const logChannelId = settings[interaction.guild.id]?.logChannelId;

        if (logChannelId) {
          const logChannel = interaction.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('📩 Sistema de Tickets Configurado')
              .addFields(
                { name: 'Canal del Panel:', value: `<#${canal.id}>`, inline: true },
                { name: 'Rol del Staff:', value: `<@&${rol.id}>`, inline: true },
                { name: 'Categoría:', value: `${categoria.name}`, inline: true },
                { name: 'Configurado por:', value: `<@${interaction.user.id}>` }
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Ocurrió un error al configurar el panel de tickets.', ephemeral: true });
    }
  },
};
