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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import UserArgument from "@framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import ConfigurationManager from "@main/services/ConfigurationManager";
import InfractionManager from "@main/services/InfractionManager";
import { AttachmentBuilder, User } from "discord.js";
import { GeneratePlainTextExportColumn } from "../../services/InfractionManager";

type SendHistoryCommandArgs = {
    user: User;
};

@ArgumentSchema.Definition({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    rules: [
        {
            "interaction:no_required_check": true
        }
    ],
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user"
})
class SendHistoryCommand extends Command {
    public override readonly name = "sendhistory";
    public override readonly description = "Sends a full list of infractions of a member.";
    public override readonly detailedDescription =
        "Sends a full list of infractions of a member. This includes all warnings, mutes, bans, and other types of infracti";
    public override readonly defer = true;
    public override readonly aliases = ["smh", "sendinfs"];
    public override readonly permissions = [PermissionFlags.ManageMessages];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly configManager!: ConfigurationManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("The user to get the infraction history for.")
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context<CommandMessage>, args: SendHistoryCommandArgs) {
        if (process.isBun) {
            await context.error("This command is not available in a Bun environment.");
            return;
        }

        const { user } = args;

        const columnsToInclude: GeneratePlainTextExportColumn[] = [
            "id",
            "type",
            "moderatorId",
            "reason",
            "duration",
            "deliveryStatus",
            "metadata",
            "createdAt",
            "updatedAt",
            "expiresAt"
        ];

        const { count, output: table } = await this.infractionManager.generatePlainTextExport({
            guild: context.guild,
            user,
            columnsToInclude,
            onlyNotified: false
        });

        if (count === 0) {
            await context.reply("This user has no infractions in this server.");
            return;
        }

        let output = `Date: ${new Date().toUTCString()}\n`;

        output += `Server: ${context.guild.name}\n`;
        output += `User: ${user.username} (${user.id})\n\n`;
        output += `Generated By: SudoBot/${this.application.metadata.version}\n\n`;
        output += table;
        output += "\n";

        await context.success({
            content: "Here is the full list of infractions for this user.",
            files: [
                new AttachmentBuilder(Buffer.from(output)).setName(
                    `${user.username}_infractions.txt`
                )
            ]
        });
    }
}

export default SendHistoryCommand;
