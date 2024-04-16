/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GuildMember, PermissionFlagsBits } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";
import { ErrorMessages } from "../../utils/ErrorMessages";

type KickCommandArgs = {
    member: GuildMember;
    reason?: string;
};

@TakesArgument<KickCommandArgs>({
    names: ["member"],
    types: [GuildMemberArgument<true>],
    optional: false,
    errorMessages: [GuildMemberArgument.defaultErrors],
    interactionName: "member",
    interactionType: GuildMemberArgument<true>
})
@TakesArgument<KickCommandArgs>("reason", RestStringArgument, true, [ErrorMessages.reason])
class KickCommand extends Command {
    public override readonly name = "kick";
    public override readonly description: string = "Kicks a member from the server.";
    public override readonly detailedDescription: string =
        "Kicks a member from the server. They can rejoin if they want to.";
    public override readonly permissions = [PermissionFlagsBits.KickMembers];
    public override readonly defer = true;
    public override readonly usage = ["<member: GuildMember> [reason: RestString]"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("member").setDescription("The member to kick.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the kick.")
                        .setMaxLength(Limits.Reason)
                )
                .addBooleanOption(option =>
                    option
                        .setName("notify")
                        .setDescription("Whether to notify the user. Defaults to true.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: KickCommandArgs
    ): Promise<void> {
        const { member, reason } = args;

        if (
            !context.member ||
            !(await this.permissionManager.canModerate(member, context.member))
        ) {
            await context.error("You don't have permission to kick this member!");
            return;
        }

        const { overviewEmbed, status } = await this.infractionManager.createKick({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            member,
            generateOverviewEmbed: true,
            notify: !context.isChatInput() || context.options.getBoolean("notify") !== false
        });

        if (status === "failed") {
            await context.error("Failed to kick member.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default KickCommand;
