/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { APIEmbed, Embed, EmbedBuilder, GuildMember, MessageCreateOptions, TextBasedChannel, User } from "discord.js";
import JSON5 from "json5";

type EmbedType = Embed | APIEmbed;

export default class EmbedSchemaParser {
    static parseString(string: string): [EmbedBuilder[], string] {
        const length = string.length;
        const embeds = [];
        let outString = string;

        for (let i = 0; i < length; i++) {
            if (i + 8 < length && (i === 0 || [" ", "\n"].includes(string[i - 1])) && string.substring(i, i + 8) === "embed::{") {
                const pos = i;
                i += 7;

                let jsonStream = "";

                while (string.substring(i, i + 3) !== "}::") {
                    if (string[i] === "\n") {
                        i = pos;
                        break;
                    }

                    jsonStream += string[i];
                    i++;
                }

                jsonStream += "}";

                if (i !== pos) {
                    try {
                        const parsedJSON = JSON5.parse(jsonStream);

                        if (typeof parsedJSON.color === "string") {
                            parsedJSON.color = parsedJSON.color.startsWith("#")
                                ? parseInt(parsedJSON.color.substring(1), 16)
                                : parseInt(parsedJSON.color);
                        }

                        embeds.push(new EmbedBuilder(parsedJSON));
                        outString = outString.replace(new RegExp(`(\\s*)embed::(.{${jsonStream.length}})::(\\s*)`, "gm"), "");
                    } catch (e) {
                        console.error(e);
                        continue;
                    }
                }
            }
        }

        return [embeds, outString];
    }

    private static toSchemaStringSingle(embed: EmbedType) {
        return `embed::${JSON.stringify(embed)}::`;
    }

    static toSchemaString(embed: EmbedType): string;
    static toSchemaString(embeds: EmbedType[]): string;

    static toSchemaString(embed: EmbedType | EmbedType[]) {
        if (embed instanceof Array) {
            return embed.map(this.toSchemaStringSingle.bind(this));
        }

        return this.toSchemaStringSingle(embed);
    }

    static getMessageCreateOptions({ content, embeds = [], ...options }: MessageCreateOptions, withContent = true) {
        if (!content) {
            return {
                content,
                embeds,
                ...options
            };
        }

        const [parsedEmbeds, strippedContent] = EmbedSchemaParser.parseString(content);

        return {
            ...options,
            embeds: [...embeds, ...parsedEmbeds.slice(0, 10)],
            content: withContent ? strippedContent : undefined
        };
    }

    static sendMessage(sendable: TextBasedChannel | User | GuildMember, options: MessageCreateOptions) {
        return sendable.send(EmbedSchemaParser.getMessageCreateOptions(options));
    }
}
