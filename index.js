"use strict";

const path = require("path");
const fs = require("fs");
const utils = require("./utils");

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    bGreen: "\x1b[92m",
    bCyan: "\x1b[96m",
    bYellow: "\x1b[93m",
    bWhite: "\x1b[97m",
    dim: "\x1b[2m",
};

function printWCABanner(selfID, region) {
    const rows = [
        C.bold + C.bGreen + "  ✅  WCA - WhatsApp Client API Connected" + C.reset,
        "",
        C.bold + C.bWhite + "  📱  Account        " + C.reset + C.bYellow + (selfID || "Unknown") + C.reset,
        C.bCyan + "  🌐  github.com/sheikhtamimlover" + C.reset,
        "",
        C.bold + C.magenta + "  💎  WCA by ST | Sheikh Tamim" + C.reset,
    ];
    process.stdout.write("\n");
    rows.forEach((l) => console.log(l));
    process.stdout.write("\n");
}

/**
 * Main WCA entry point — mirrors FCA login() style.
 *
 * @param {object}   options
 * @param {string}   [options.authFolder]         Folder to store auth state   (default: './wca_auth')
 * @param {string}   [options.phoneNumber]        Phone number for pair code   (e.g. '8801xxxxxxxxx')
 * @param {boolean}  [options.usePairingCode]     Force pairing-code flow      (default: auto if phoneNumber provided)
 * @param {boolean}  [options.printQR]            Print QR in terminal         (default: true when no phoneNumber)
 * @param {object}   [options.globalOptions]      FCA-style global options
 * @param {boolean}  [options.globalOptions.selfListen]          Listen to own messages    (default: false)
 * @param {boolean}  [options.globalOptions.listenEvents]        Emit group/call events    (default: true)
 * @param {boolean}  [options.globalOptions.autoReconnect]       Auto reconnect on drop    (default: true)
 * @param {boolean}  [options.globalOptions.autoMarkDelivery]    Auto-read on receive      (default: false)
 * @param {boolean}  [options.globalOptions.emitReady]           Emit ready event          (default: false)
 * @param {boolean}  [options.globalOptions.updatePresence]      Emit presence events      (default: false)
 * @param {boolean}  [options.globalOptions.enableTypingIndicator] Show typing before send (default: false)
 * @param {number}   [options.globalOptions.typingDuration]      Typing duration ms        (default: 3000)
 *
 * @param {function} callback  (err, api)
 */
function wca(options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (typeof callback !== "function") callback = function () {};

    options = options || {};

    const authFolder = options.authFolder || "./wca_auth";
    utils.ensureDir(authFolder);

    const globalOptions = Object.assign(
        {
            // ── Listen ──────────────────────────────────────────────
            selfListen:             false,   // process own sent messages as events
            selfListenEvent:        false,   // emit own messages to listen() callback
            listenEvents:           true,    // emit group/call/presence events
            // ── Presence / typing ────────────────────────────────────
            updatePresence:         false,   // emit presence.update events
            listenTyping:           false,   // emit composing/paused presence events
            // ── Delivery / receipts ──────────────────────────────────
            autoMarkDelivery:       false,   // auto-read every received message
            // ── Connection ───────────────────────────────────────────
            autoReconnect:          true,    // reconnect on unexpected disconnect
            forceLogin:             false,   // delete auth + force re-login on conflict
            online:                 true,    // appear online on connect
            emitReady:              false,   // emit ready event on connection open
            // ── Typing indicator before send ─────────────────────────
            enableTypingIndicator:  false,
            typingDuration:         3000,
            // ── Logging ──────────────────────────────────────────────
            logLevel:               "error", // "silent" | "error" | "warn" | "info" | "debug"
        },
        options.globalOptions || {}
    );

    let sockInstance = null;
    let ctx = {
        selfID:       null,
        authState:    null,
        globalOptions,
        sock:         null,
        // lidCache: phoneJID → lid, built during group fetches etc.
        lidCache:     {},
    };

    // ── Dynamic ESM import of Baileys ────────────────────────────────────────
    import(path.resolve(__dirname, "../lib/index.js"))
        .then(async (Baileys) => {
            const {
                default: makeWASocket,
                useMultiFileAuthState,
                DisconnectReason,
                fetchLatestBaileysVersion,
                Browsers,
                makeInMemoryStore,
                downloadMediaMessage,
            } = Baileys;

            let qrCodeTerminal;
            try { qrCodeTerminal = require("qrcode-terminal"); } catch (_) {}

            const { state, saveCreds } = await useMultiFileAuthState(authFolder);

            let { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1023451250] }));

            const phoneNumber = options.phoneNumber
                ? utils.normalizePhoneNumber(String(options.phoneNumber))
                : null;
            const usePairingCode = options.usePairingCode || !!phoneNumber;
            const printQR = options.printQR !== false && !usePairingCode;

            function createSocket() {
                const sock = makeWASocket({
                    version,
                    auth: state,
                    printQRInTerminal: printQR,
                    browser: Browsers ? Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "20.0.04"],
                    syncFullHistory: false,
                    markOnlineOnConnect: globalOptions.online !== false,
                    logger: require("pino")({ level: "silent" }).child({}),
                    generateHighQualityLinkPreview: true,
                    connectTimeoutMs: 60000,
                    defaultQueryTimeoutMs: 60000,
                    keepAliveIntervalMs: 30000,
                });

                sockInstance = sock;
                ctx.sock = sock;

                sock.ev.on("creds.update", saveCreds);

                let pairCodeRequested = false;
                sock.ev.on("connection.update", async (update) => {
                    const { connection, lastDisconnect, qr } = update;

                    if (qr && !printQR) {
                        if (qrCodeTerminal) {
                            console.log(C.cyan + "\n  📱  Scan this QR Code:\n" + C.reset);
                            qrCodeTerminal.generate(qr, { small: true });
                        } else {
                            console.log(C.yellow + "  [QR]  " + qr + C.reset);
                        }
                    }

                    if (qr && usePairingCode && phoneNumber && !pairCodeRequested) {
                        pairCodeRequested = true;
                        try {
                            await utils.delay(2000);
                            const code = await sock.requestPairingCode(phoneNumber);
                            console.log(
                                "\n" + C.bold + C.bGreen + "  🔑  PAIRING CODE: " + C.reset +
                                C.bold + C.bYellow + code + C.reset + "\n" +
                                C.dim + "  Enter this code in WhatsApp → Linked Devices → Link with phone number\n" + C.reset
                            );
                        } catch (e) {
                            console.log(C.red + "  [WCA] Failed to get pairing code: " + e.message + C.reset);
                        }
                    }

                    if (connection === "open") {
                        const selfJid = sock.user?.id || "";
                        ctx.selfID = selfJid;
                        ctx.authState = state;

                        printWCABanner(selfJid);

                        const api = buildAPI(sock, ctx, globalOptions);
                        callback(null, api);
                    }

                    if (connection === "close") {
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        const loggedOut = statusCode === DisconnectReason.loggedOut;

                        console.log(
                            C.yellow + "  [WCA] Connection closed." +
                            (loggedOut ? " Logged out – delete auth folder to re-login." : " Reconnecting…") +
                            C.reset
                        );

                        if (!loggedOut && globalOptions.autoReconnect) {
                            await utils.delay(3000);
                            createSocket();
                        }
                    }
                });

                return sock;
            }

            createSocket();
        })
        .catch((err) => {
            console.error(C.red + "  [WCA] Failed to load Baileys:" + C.reset, err);
            callback(err, null);
        });
}

function buildAPI(sock, ctx, globalOptions) {
    const api = {
        setOptions: function (opts) {
            Object.assign(ctx.globalOptions, opts);
        },

        getAppState: require("./src/getAppState")(sock, null, ctx),
    };

    // ── Load every feature file from src/ ────────────────────────────────────
    const srcDir = path.join(__dirname, "src");
    // listenMqtt has a different signature (sock, ctx, globalCallback) — skip auto-load
    const SKIP = new Set(["listenMqtt.js"]);
    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js") && !SKIP.has(f));

    for (const file of files) {
        const name = file.replace(".js", "");
        try {
            const mod = require(path.join(srcDir, file))(sock, api, ctx);

            if (typeof mod === "function") {
                api[name] = mod;
            } else if (mod && typeof mod === "object") {
                Object.assign(api, mod);
            }
        } catch (e) {
            console.warn(C.yellow + "  [WCA] Warning: failed to load " + file + ": " + e.message + C.reset);
        }
    }

    // ── Convenience aliases (FCA-style) ─────────────────────────────────────
    api.listen = function (callback) {
        require("./src/listenMqtt")(sock, ctx, callback);
        return sock;
    };
    api.listenMqtt = api.listen;

    api.sendMessage = require("./src/sendMessage")(sock, api, ctx);

    const mediaMod = require("./src/sendMedia")(sock, api, ctx);
    api.sendImage = mediaMod.sendImage;
    api.sendVideo = mediaMod.sendVideo;
    api.sendAudio = mediaMod.sendAudio;
    api.sendPTT = mediaMod.sendPTT;
    api.sendDocument = mediaMod.sendDocument;
    api.sendSticker = mediaMod.sendSticker;
    api.sendGif = mediaMod.sendGif;
    api.sendMedia = mediaMod.sendMedia;

    api.sendTypingIndicator = require("./src/sendTypingIndicator")(sock, api, ctx);
    api.markAsRead = require("./src/sendReadReceipt")(sock, api, ctx);
    api.sendReadReceipt = api.markAsRead;
    api.getGroupInfo = require("./src/getGroupInfo")(sock, api, ctx);
    api.addUserToGroup = require("./src/addUserToGroup")(sock, api, ctx);
    api.kickUser = require("./src/kickUser")(sock, api, ctx);
    api.removeUserFromGroup = api.kickUser;
    api.changeGroupSubject = require("./src/changeGroupSubject")(sock, api, ctx);
    api.changeGroupDescription = require("./src/changeGroupDescription")(sock, api, ctx);
    api.getGroupAdmins = require("./src/getGroupAdmins")(sock, api, ctx);
    api.getGroupInviteLink = require("./src/getGroupInviteLink")(sock, api, ctx);
    api.createGroup = require("./src/createGroup")(sock, api, ctx);
    api.leaveGroup = require("./src/leaveGroup")(sock, api, ctx);
    api.getProfilePicture = require("./src/getProfilePicture")(sock, api, ctx);
    api.updateProfilePicture = require("./src/updateProfilePicture")(sock, api, ctx);
    api.updateProfileStatus = require("./src/updateProfileStatus")(sock, api, ctx);
    api.updateProfileName = require("./src/updateProfileName")(sock, api, ctx);

    const blockMod = require("./src/blockContact")(sock, api, ctx);
    api.blockContact = blockMod.blockContact;
    api.unblockContact = blockMod.unblockContact;

    api.reactToMessage = require("./src/reactToMessage")(sock, api, ctx);
    api.deleteMessage = require("./src/deleteMessage")(sock, api, ctx);
    api.downloadMedia = require("./src/downloadMedia")(sock, api, ctx);
    api.getUserInfo = require("./src/getUserInfo")(sock, api, ctx);

    const adminMod = require("./src/setGroupAdmin")(sock, api, ctx);
    api.promoteAdmin = adminMod.promoteAdmin;
    api.demoteAdmin = adminMod.demoteAdmin;

    api.groupSettingUpdate = require("./src/groupSettingUpdate")(sock, api, ctx);
    api.sendPresenceUpdate = require("./src/sendPresenceUpdate")(sock, api, ctx);
    api.fetchStatus = require("./src/fetchStatus")(sock, api, ctx);
    api.groupRevokeInvite = require("./src/groupRevokeInvite")(sock, api, ctx);
    api.groupAcceptInvite = require("./src/groupAcceptInvite")(sock, api, ctx);
    api.sendLocation = require("./src/sendLocation")(sock, api, ctx);

    const buttonsMod = require("./src/sendButtons")(sock, api, ctx);
    api.sendButtons  = buttonsMod.sendButtons;
    api.sendList     = buttonsMod.sendList;
    api.sendTemplate = buttonsMod.sendTemplate;

    // ── Expose raw Baileys sock for power users ──────────────────────────────
    api.sock = sock;
    api.ctx = ctx;

    // ── Helper: get self JID ────────────────────────────────────────────────
    api.getCurrentUserID = function () {
        return ctx.selfID;
    };

    return api;
}

module.exports = wca;
module.exports.default = wca;
