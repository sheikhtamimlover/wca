"use strict";

const utils = require("../utils");

// ── ANSI ──────────────────────────────────────────────────────────────────────
const C = {
    reset:   "\x1b[0m",  bold:    "\x1b[1m",  dim:     "\x1b[2m",
    green:   "\x1b[32m", bGreen:  "\x1b[92m", cyan:    "\x1b[36m",
    bCyan:   "\x1b[96m", yellow:  "\x1b[33m", bYellow: "\x1b[93m",
    magenta: "\x1b[35m", bWhite:  "\x1b[97m", red:     "\x1b[31m",
    blue:    "\x1b[34m", bBlue:   "\x1b[94m",
};

function printListenBanner(ctx) {
    const jid   = ctx.selfID || "";
    const phone = jid.split(":")[0].split("@")[0] || jid;
    const lines = [
        "",
        C.bold + C.bCyan  + "  ╔══════════════════════════════════════════════╗" + C.reset,
        C.bold + C.bCyan  + "  ║" + C.reset + C.bold + C.bWhite + "        📡  WCA — WhatsApp Client API         " + C.reset + C.bold + C.bCyan + "║" + C.reset,
        C.bold + C.bCyan  + "  ╠══════════════════════════════════════════════╣" + C.reset,
        C.bold + C.bCyan  + "  ║" + C.reset + "  " + C.bGreen  + "✅  Connected & Listening for events" + C.reset + "        " + C.bold + C.bCyan + "║" + C.reset,
        C.bold + C.bCyan  + "  ║" + C.reset + "  " + C.bYellow + "📱  Bot  : " + C.reset + C.bWhite + phone.padEnd(34) + C.reset + C.bold + C.bCyan + "║" + C.reset,
        C.bold + C.bCyan  + "  ║" + C.reset + "  " + C.cyan    + "✍️   Author : Sheikh Tamim" + C.reset + "                  " + C.bold + C.bCyan + "║" + C.reset,
        C.bold + C.bCyan  + "  ║" + C.reset + "  " + C.dim     + "🔗  github.com/sheikhtamimlover" + C.reset + "             " + C.bold + C.bCyan + "║" + C.reset,
        C.bold + C.bCyan  + "  ╚══════════════════════════════════════════════╝" + C.reset,
        "",
    ];
    lines.forEach((l) => process.stdout.write(l + "\n"));
}

/**
 * WCA event listener — maps all Baileys socket events to FCA-style callbacks.
 *
 * Event types emitted to globalCallback(err, event):
 *
 *   message           text / media / location / poll / buttons
 *   message_reaction  emoji reaction on a message
 *   message_unsend    delete-for-everyone (protocolMessage type 0)
 *   message_status    delivery / read status update
 *   message_receipt   per-device read/play receipt
 *   event             group-participant change (log:subscribe / log:unsubscribe / log:thread-admins)
 *   group_update      group metadata change   (log:thread-name / log:thread-image / …)
 *   presence          typing / online / offline
 *   contact_update    contact name or picture changed
 *   call              incoming call
 *   stop_listen       connection closed
 *   ready             connection opened  (emitReady option)
 */
module.exports = function listenMqtt(sock, ctx, globalCallback) {
    if (typeof globalCallback !== "function") return;

    // Print the listening banner once
    printListenBanner(ctx);

    const selfID = () => ctx.selfID || "";
    const opts   = () => ctx.globalOptions || {};

    const emitEvent = (payload) => {
        if (!opts().listenEvents) return;
        globalCallback(null, payload);
    };

    // ── Incoming messages ─────────────────────────────────────────────────────
    // Accept both "notify"  (messages from others)
    // and   "append"  (our own sent messages, also reactions arriving as append)
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify" && type !== "append") return;

        for (const msg of messages) {
            if (!msg.message) continue;

            const remoteJid = msg.key?.remoteJid || "";
            if (remoteJid === "status@broadcast") continue;

            const fmtMsg = utils.formatMessageEvent(msg, selfID(), sock);
            if (!fmtMsg) continue;

            // ── selfListen / selfListenEvent gate ──────────────────────────
            if (fmtMsg.fromMe) {
                // "message" type: gate by selfListen
                if (fmtMsg.type === "message" && !opts().selfListen) continue;
                // all other types (reactions, deletes…): gate by selfListenEvent
                if (fmtMsg.type !== "message" && !opts().selfListenEvent) continue;
            }

            if (opts().autoMarkDelivery && msg.key) {
                try { await sock.readMessages([msg.key]); } catch (_) {}
            }

            globalCallback(null, fmtMsg);
        }
    });

    // ── Message edits / delivery status ──────────────────────────────────────
    sock.ev.on("messages.update", (updates) => {
        if (!opts().listenEvents) return;
        for (const update of updates) {
            if (update.update?.status !== undefined) {
                globalCallback(null, {
                    type:      "message_status",
                    threadID:  utils.normalizeJID(update.key?.remoteJid || "", sock),
                    senderID:  utils.normalizeJID(update.key?.participant || update.key?.remoteJid || "", sock),
                    author:    utils.normalizeJID(update.key?.participant || update.key?.remoteJid || "", sock),
                    messageID: update.key?.id,
                    status:    update.update.status,
                    raw:       update,
                });
            }
        }
    });

    // ── Per-device receipts ───────────────────────────────────────────────────
    sock.ev.on("message-receipt.update", (updates) => {
        if (!opts().listenEvents) return;
        for (const update of updates) {
            globalCallback(null, {
                type:      "message_receipt",
                threadID:  utils.normalizeJID(update.key?.remoteJid || "", sock),
                messageID: update.key?.id,
                receipt:   update.receipt,
                raw:       update,
            });
        }
    });

    // ── Presence / typing ─────────────────────────────────────────────────────
    sock.ev.on("presence.update", ({ id, presences }) => {
        if (!opts().updatePresence && !opts().listenTyping) return;
        for (const [jid, presence] of Object.entries(presences)) {
            const pType = presence.lastKnownPresence;
            if (opts().listenTyping && !opts().updatePresence) {
                if (pType !== "composing" && pType !== "paused") continue;
            }
            globalCallback(null, {
                type:     "presence",
                userID:   utils.normalizeJID(jid, sock),
                senderID: utils.normalizeJID(jid, sock),
                author:   utils.normalizeJID(jid, sock),
                threadID: utils.normalizeJID(id, sock),
                presence: pType,
                isTyping: pType === "composing",
                lastSeen: presence.lastSeen,
                raw:      { id, jid, presence },
            });
        }
    });

    // ── Group metadata changes ────────────────────────────────────────────────
    sock.ev.on("groups.update", (updates) => {
        if (!opts().listenEvents) return;
        for (const update of updates) {
            const threadID = update.id || "";
            const author   = utils.normalizeJID(update.author || update.participant || "", sock);
            const changes  = [];

            if (update.subject   !== undefined) changes.push({ logMessageType: "log:thread-name",        value: update.subject });
            if (update.desc      !== undefined) changes.push({ logMessageType: "log:thread-description", value: update.desc });
            if (update.icon      !== undefined) changes.push({ logMessageType: "log:thread-icon",        value: update.icon });
            if (update.picture   !== undefined) changes.push({ logMessageType: "log:thread-image",       value: update.picture });
            if (update.announce  !== undefined) changes.push({ logMessageType: "log:thread-admins",      value: update.announce ? "announcement" : "not_announcement" });
            if (update.restrict  !== undefined) changes.push({ logMessageType: "log:thread-lock",        value: update.restrict });
            if (changes.length   === 0)         changes.push({ logMessageType: "log:thread-name",        value: null });

            for (const change of changes) {
                emitEvent({
                    type:           "group_update",
                    logMessageType: change.logMessageType,
                    threadID,
                    author,
                    senderID:       author,
                    logMessageData: { value: change.value, raw: update },
                    raw:            update,
                });
            }
        }
    });

    // ── Group participant events ──────────────────────────────────────────────
    sock.ev.on("group-participants.update", ({ id, participants, action, author: rawAuthor }) => {
        if (!opts().listenEvents) return;
        const threadID = id || "";
        const author   = utils.normalizeJID(rawAuthor || "", sock);
        const logType  = utils.GROUP_ACTION_TO_LOG[action] || ("log:" + action);
        const resolved = (participants || []).map((p) => utils.normalizeJID(p, sock));

        globalCallback(null, {
            type:           "event",
            logMessageType: logType,
            threadID,
            author,
            senderID:       author,
            participants:   resolved,
            logMessageData: {
                addedParticipants:    action === "add"                          ? resolved : [],
                removedParticipants:  action === "remove" || action === "leave" ? resolved : [],
                promotedParticipants: action === "promote"                      ? resolved : [],
                demotedParticipants:  action === "demote"                       ? resolved : [],
                action,
            },
            raw: { id, participants, action, author: rawAuthor },
        });
    });

    // ── Contact updates ───────────────────────────────────────────────────────
    sock.ev.on("contacts.update", (updates) => {
        if (!opts().listenEvents) return;
        for (const contact of updates) {
            const userID = utils.normalizeJID(contact.id || "", sock);
            globalCallback(null, {
                type:           "contact_update",
                logMessageType: "log:user-nickname",
                userID,
                senderID:       userID,
                author:         userID,
                name:           contact.name || contact.notify || "",
                imgUrl:         contact.imgUrl || null,
                raw:            contact,
            });
        }
    });

    // ── Calls ─────────────────────────────────────────────────────────────────
    sock.ev.on("call", (calls) => {
        if (!opts().listenEvents) return;
        for (const call of calls) {
            globalCallback(null, {
                type:    "call",
                callID:  call.id,
                from:    utils.normalizeJID(call.from || "", sock),
                senderID:utils.normalizeJID(call.from || "", sock),
                author:  utils.normalizeJID(call.from || "", sock),
                isVideo: call.isVideo,
                isGroup: call.isGroup,
                status:  call.status,
                date:    call.date,
                raw:     call,
            });
        }
    });

    // ── Connection state ──────────────────────────────────────────────────────
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            globalCallback({
                type:           "stop_listen",
                logMessageType: "log:disconnect",
                reason:         "connection_closed",
                shouldReconnect: opts().autoReconnect &&
                    lastDisconnect?.error?.output?.statusCode !== 401,
                error: lastDisconnect?.error || null,
            }, null);
        }
        if (connection === "open" && opts().emitReady) {
            globalCallback({ type: "ready", logMessageType: "log:ready", error: null }, null);
        }
    });

    return sock;
};
