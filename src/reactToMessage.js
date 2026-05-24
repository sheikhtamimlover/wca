"use strict";

const utils = require("../utils");

module.exports = function (sock, api, ctx) {
    return async function reactToMessage(threadID, messageID, reaction, callback) {
        if (typeof callback !== "function") callback = function () {};
        try {
            const jid = utils.formatJID(threadID);
            const key = {
                remoteJid: jid,
                id: messageID,
                fromMe: false,
            };

            const result = await sock.sendMessage(jid, {
                react: {
                    text: reaction,
                    key: key,
                },
            });

            callback(null, result);
            return result;
        } catch (err) {
            callback(err, null);
            throw err;
        }
    };
};
