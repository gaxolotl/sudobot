/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import ConfigurationManager from "@main/services/ConfigurationManager";
import InfractionManager from "@main/services/InfractionManager";
import { AttachmentBuilder } from "discord.js";
import { GeneratePlainTextExportColumn } from "../../services/InfractionManager";

class DMHistoryCommand extends Command {
    public override readonly name = "dmhistory";
    public override readonly description =
        "Sends you a full list of your infractions in this server.";
    public override readonly detailedDescription =
        "Sends you a full list of your infractions in this server. This includes all warnings, mutes, bans, and other types of infractions.";
    public override readonly defer = true;
    public override readonly aliases = ["dmh", "dminfs"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly configManager!: ConfigurationManager;

    public override async execute(context: Context<CommandMessage>) {
        if (process.isBun) {
            await context.error("This command is not available in a Bun environment.");
            return;
        }

        const columnsToInclude: GeneratePlainTextExportColumn[] = [
            "type",
            "reason",
            "duration",
            "createdAt",
            "expiresAt"
        ];

        if (this.configManager.config[context.guildId]?.infractions?.send_ids_to_user) {
            columnsToInclude.unshift("id");
        }

        const { count, output: table } = await this.infractionManager.generatePlainTextExport({
            guild: context.guild,
            user: context.user,
            columnsToInclude,
            onlyNotified: true
        });

        if (count === 0) {
            await context.reply("You have no infractions in this server.");
            return;
        }

        let output = `Date: ${new Date().toUTCString()}\n`;

        output += `Server: ${context.guild.name}\n`;
        output += `User: ${context.user.username} (${context.user.id})\n\n`;
        output += `Generated By: SudoBot/${this.application.metadata.version}\n\n`;
        output += table;
        output += "\n";
        output +=
            "If you have any questions or concerns, please contact the server owner or an administrator.";

        try {
            await context.user.send({
                content: `## Hey ${context.user.username}, your moderation history is ready!\nWe've generated your moderation history in ${context.guild.name}. Download the text file below to view your infractions. If you have any questions, please contact the server owner or an administrator.`,
                files: [
                    new AttachmentBuilder(Buffer.from(output)).setName(
                        `history-${context.guild.id}-${context.user.id}.txt`
                    )
                ]
            });
        } catch (error) {
            this.application.logger.error(error);

            await context.error(
                "The system was unable to deliver your moderation history. Please ensure that you have DMs enabled and try again."
            );

            return;
        }

        await context.success(
            `The system has delivered your moderation history to your DMs. Sent ${count} infraction records total.`
        );
    }
}

export default DMHistoryCommand;
