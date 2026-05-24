"use strict";

const utils = require("../utils");

module.exports = function (sock, api, ctx) {
    return async function deleteMessage(threadID, messageID, forEveryone, callback) {
        if (typeof forEveryone === "function") {
            callback = forEveryone;
            forEveryone = true;
        }
        if (typeof callback !== "function") callback = function () {};
        try {
            const jid = utils.formatJID(threadID);

            if (forEveryone) {
                const key = {
                    remoteJid: jid,
                    id: messageID,
                    fromMe: true,
                };
                await sock.sendMessage(jid, { delete: key });
            } else {
                const key = {
                    remoteJid: jid,
                    id: messageID,
                    fromMe: true,
                };
                await sock.chatModify(
                    { clear: { messages: [{ id: messageID, fromMe: true }] } },
                    jid
                );
            }

            callback(null, true);
            return true;
        } catch (err) {
            callback(err, null);
            throw err;
        }
    };
};
