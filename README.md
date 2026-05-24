<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=28&pause=1000&color=25D366&center=true&vcentered=true&width=600&lines=WCA+%E2%80%94+WhatsApp+Client+API;FCA-style+WhatsApp+Bot+Framework;by+Sheikh+Tamim" alt="WCA" />

<br/>

[![npm version](https://img.shields.io/npm/v/@sheikhtamimlover/wca?color=25D366&label=version&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/@sheikhtamimlover/wca)
[![npm downloads](https://img.shields.io/npm/dm/@sheikhtamimlover/wca?color=blue&logo=npm&style=for-the-badge)](https://www.npmjs.com/package/@sheikhtamimlover/wca)
[![Node.js](https://img.shields.io/node/v/@sheikhtamimlover/wca?color=brightgreen&logo=node.js&style=for-the-badge)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/sheikhtamimlover/wca?color=yellow&logo=github&style=for-the-badge)](https://github.com/sheikhtamimlover/wca/stargazers)
[![License](https://img.shields.io/github/license/sheikhtamimlover/wca?color=red&style=for-the-badge)](LICENSE)
[![Visitors](https://visitor-badge.laobi.icu/badge?page_id=sheikhtamimlover.wca&style=for-the-badge&color=0d1117)](https://github.com/sheikhtamimlover/wca)

<br/>

> **WCA** is an FCA-style WhatsApp bot framework built on top of [Baileys](https://github.com/WhiskeySockets/Baileys).  
> If you know how to write a Facebook Messenger bot using `fca-unofficial`, you already know WCA.

<br/>

[📦 NPM](https://www.npmjs.com/package/@sheikhtamimlover/wca) • [🤖 Example Bot](https://github.com/sheikhtamimlover/ST_WhatsappBot) • [🐛 Issues](https://github.com/sheikhtamimlover/wca/issues) • [💬 WhatsApp](https://wa.me/8801xxxxxxxxx)

</div>

---

## ✨ Features

| Category | Feature |
|---|---|
| 🔌 Connection | QR Code login · Pairing Code (no phone scan) · Auto-reconnect |
| 💬 Messaging | Send text · Reply/quote · Mentions · Emoji reactions · Delete for everyone |
| 📎 Media | Image · Video · Audio · PTT/Voice · Document · Sticker · GIF · Location |
| 👥 Groups | Create · Leave · Add/Kick · Promote/Demote · Rename · Description · Invite link · Settings |
| 👤 Profile | Get/Set profile picture · Status text · Display name · Block/Unblock |
| 📡 Events | Messages · Reactions · Delete events · Group changes · Typing presence · Calls |
| 🔄 Updates | Auto-update checker (`checkForWCAUpdate()`) |

---

## 📋 Requirements

- **Node.js** ≥ 18.x  (LTS recommended — [download](https://nodejs.org/en/download))
- **npm** ≥ 8.x
- A WhatsApp account

```bash
# Check your versions
node -v
npm -v
```

---

## 📦 Installation

```bash
npm install @sheikhtamimlover/wca
```

---

## 🚀 Quick Start

### QR Code login

```js
const wca = require('@sheikhtamimlover/wca');

wca({ authFolder: './wca_auth' }, (err, api) => {
    if (err) return console.error(err);

    api.listen((err, msg) => {
        if (err || !msg || msg.type !== 'message') return;
        if (msg.body === '!ping') {
            api.sendMessage('🏓 Pong!', msg.threadID);
        }
    });
});
```

### Pairing Code login (no QR scan needed)

```js
const wca = require('@sheikhtamimlover/wca');

wca({
    authFolder:     './wca_auth',
    phoneNumber:    '8801xxxxxxxxx',   // international format, no +
    usePairingCode: true,
}, (err, api) => {
    if (err) return console.error(err);
    console.log('Connected as', api.getCurrentUserID());

    api.listen((err, msg) => {
        if (!msg || msg.type !== 'message') return;
        if (msg.body === '!ping') {
            api.sendMessage('🏓 Pong!', msg.threadID);
        }
    });
});
```

When the pairing code prints in your console:

1. Open WhatsApp → ⋮ Menu → **Linked Devices**
2. Tap **Link a device** → **Link with phone number instead**
3. Enter the code shown in your terminal

---

## ⚙️ Options

```js
wca({
    authFolder:     './wca_auth',   // auth state folder  (default: './wca_auth')
    phoneNumber:    '628xxx',       // for pairing code
    usePairingCode: true,           // force pairing code flow

    globalOptions: {
        selfListen:            false,   // process own sent messages
        selfListenEvent:       false,   // emit own messages to listen()
        listenEvents:          true,    // emit group / call / presence events
        updatePresence:        false,   // emit all presence updates
        listenTyping:          false,   // emit only typing (composing/paused) events
        autoMarkDelivery:      false,   // auto-read every received message
        autoReconnect:         true,    // reconnect on unexpected drop
        emitReady:             false,   // emit { type:'ready' } on connection open
        enableTypingIndicator: false,   // show typing before every sendMessage
        typingDuration:        3000,    // typing indicator duration ms
        logLevel:              'error', // 'silent' | 'error' | 'warn' | 'info' | 'debug'
        online:                true,    // appear online when connected
    },
}, callback);
```

---

## 📨 Message Event Format

```js
{
    type:          'message',
    body:          'Hello!',
    threadID:      '628xxx@s.whatsapp.net',   // DM  OR  120363xxx@g.us  (group)
    senderID:      '628xxx@s.whatsapp.net',   // always a phone JID (LIDs resolved)
    author:        '628xxx@s.whatsapp.net',   // alias for senderID
    messageID:     'XXXXXXXXXXXXXXXXXX',
    isGroup:       false,
    isSingleUser:  true,
    fromMe:        false,
    timestamp:     1716900000,
    attachments:   [ { type:'image', mimetype:'image/jpeg', caption:'...', ... } ],
    mentions:      [ '628yyy@s.whatsapp.net' ],
    replyToMessage: {
        messageID: 'YYYYY',
        senderID:  '628xxx@s.whatsapp.net',
        body:      'quoted text',
        attachments: [],
    },
    location:     null,   // { latitude, longitude, name, address } if location msg
    poll:         null,   // { name, options, selectableCount }     if poll msg
    quoteOptions: { quoted: <rawWAMessage> },  // pass directly to sendMessage for reply
    args:         ['!ping'],    // body.split(' ')
    raw:          <WAMessage>,  // raw Baileys object
}
```

### Other event types

```js
// Emoji reaction
{ type: 'message_reaction', emoji: '👍', reactionKey: { id, remoteJid, fromMe }, senderID, threadID, ... }

// Someone deleted a message
{ type: 'message_unsend', logMessageType: 'log:unsend', deletedMessageID, senderID, threadID, ... }

// Group participant change
{ type: 'event', logMessageType: 'log:subscribe'|'log:unsubscribe'|'log:thread-admins',
  participants: ['628xxx@s.whatsapp.net'], author, threadID, logMessageData: { action, ... } }

// Group metadata change
{ type: 'group_update', logMessageType: 'log:thread-name'|'log:thread-image'|'log:thread-description'|...,
  threadID, author, logMessageData: { value } }

// Typing / presence
{ type: 'presence', userID, threadID, presence: 'composing'|'paused'|'available'|'unavailable', isTyping }

// Incoming call
{ type: 'call', from, isVideo, isGroup, status }
```

---

## 📚 API Reference

### Messaging

```js
api.sendMessage(msg, threadID, [cb])        // text, attachment, reply, mention
api.sendImage(url, threadID, caption, opts)
api.sendVideo(url, threadID, caption, opts)
api.sendAudio(url, threadID, opts)
api.sendPTT(url, threadID, opts)            // voice note
api.sendDocument(url, threadID, caption, opts)
api.sendSticker(url, threadID, opts)
api.sendGif(url, threadID, caption, opts)
api.sendLocation(threadID, lat, lon, opts)
api.sendTypingIndicator(bool, threadID)
api.markAsRead(threadID, senderID, [ids])
api.reactToMessage(threadID, msgID, emoji)
api.deleteMessage(threadID, msgID, forAll)
api.downloadMedia(rawMsg)                   // → Buffer
```

### Quoted reply

```js
// Using quoteOptions from the incoming event (best):
api.sendMessage('Got it!', msg.threadID, null, { replyToMessage: msg.quoteOptions.quoted });

// Or pass the raw message directly:
api.sendMessage({ body: 'Reply!', replyToMessage: msg.raw }, msg.threadID);
```

### Groups

```js
api.getGroupInfo(threadID)
api.getGroupAdmins(threadID)
api.getGroupInviteLink(threadID)
api.groupRevokeInvite(threadID)
api.groupAcceptInvite(code)
api.addUserToGroup(threadID, [userIDs])
api.kickUser(threadID, [userIDs])
api.createGroup(name, [participantIDs])
api.leaveGroup(threadID)
api.promoteAdmin(threadID, [userIDs])
api.demoteAdmin(threadID, [userIDs])
api.changeGroupSubject(threadID, name)
api.changeGroupDescription(threadID, desc)
api.groupSettingUpdate(threadID, setting)  // 'announcement'|'not_announcement'|'locked'|'unlocked'
```

### Profile & user

```js
api.getProfilePicture(userID, type)
api.getUserInfo([userIDs])
api.fetchStatus(userID)
api.updateProfilePicture(media)
api.updateProfileStatus(text)
api.updateProfileName(name)
api.blockContact(userID)
api.unblockContact(userID)
api.sendPresenceUpdate(type, threadID)     // 'available'|'unavailable'|'composing'|'paused'
api.getCurrentUserID()                     // own JID
api.sock                                   // raw Baileys socket
```

---

## 🔄 Auto-Update

```js
const { checkForWCAUpdate } = require('@sheikhtamimlover/wca/checkUpdate');

// At the top of your bot — checks npm and auto-installs if newer version exists
await checkForWCAUpdate();

// Options:
await checkForWCAUpdate({
    autoUpdate:   true,    // install the update   (default: true)
    silent:       false,   // suppress console log (default: false)
    exitOnUpdate: true,    // exit(2) so pm2/nodemon restarts (default: true)
});
```

---

## 🤖 Full Bot Example

```js
const wca = require('@sheikhtamimlover/wca');
const { checkForWCAUpdate } = require('@sheikhtamimlover/wca/checkUpdate');

async function main() {
    await checkForWCAUpdate({ silent: false });

    wca({
        authFolder:     './wca_auth',
        phoneNumber:    '8801xxxxxxxxx',
        usePairingCode: true,
        globalOptions:  {
            listenEvents:  true,
            selfListen:    false,
            autoReconnect: true,
        },
    }, (err, api) => {
        if (err) return console.error('WCA error:', err);
        console.log('Bot ready:', api.getCurrentUserID());

        api.listen(async (err, msg) => {
            if (err) return;
            if (!msg || msg.type !== 'message' || msg.fromMe) return;

            const { body, threadID } = msg;
            if (!body.startsWith('!')) return;

            const [cmd, ...args] = body.slice(1).split(' ');

            switch (cmd.toLowerCase()) {
                case 'ping':
                    await api.sendMessage('🏓 Pong!', threadID);
                    break;

                case 'react':
                    await api.reactToMessage(threadID, msg.messageID, '👍');
                    break;

                case 'reply':
                    // Quoted reply using quoteOptions
                    await api.sendMessage(
                        { body: 'This is a reply!', replyToMessage: msg.raw },
                        threadID
                    );
                    break;

                case 'image':
                    await api.sendImage('https://picsum.photos/800/600', threadID, 'Test image');
                    break;
            }
        });
    });
}

main().catch(console.error);
```

---

## 📂 Project Structure

```
wca/
 ├── index.js              ← Main entry  wca(options, callback)
 ├── utils.js              ← JID helpers, LID resolver, event formatter
 ├── checkUpdate.js        ← Auto-update checker
 └── src/                  ← One file per feature
     ├── listenMqtt.js
     ├── sendMessage.js
     ├── sendMedia.js
     ├── sendTypingIndicator.js
     ├── sendReadReceipt.js
     ├── sendLocation.js
     ├── sendPresenceUpdate.js
     ├── reactToMessage.js
     ├── deleteMessage.js
     ├── downloadMedia.js
     ├── getGroupInfo.js
     ├── getGroupAdmins.js
     ├── getGroupInviteLink.js
     ├── groupRevokeInvite.js
     ├── groupAcceptInvite.js
     ├── groupSettingUpdate.js
     ├── addUserToGroup.js
     ├── kickUser.js
     ├── createGroup.js
     ├── leaveGroup.js
     ├── setGroupAdmin.js
     ├── changeGroupSubject.js
     ├── changeGroupDescription.js
     ├── getProfilePicture.js
     ├── getUserInfo.js
     ├── fetchStatus.js
     ├── updateProfilePicture.js
     ├── updateProfileStatus.js
     ├── updateProfileName.js
     ├── blockContact.js
     └── getAppState.js
```

---

## 🧠 LID Resolution (Delta System)

WhatsApp internally uses **LID** (Linked Identity) JIDs — e.g. `186393124970625@lid` — which are opaque internal IDs that differ from phone numbers. WCA **automatically resolves** these to real `@s.whatsapp.net` JIDs using Baileys' contact store.

- `msg.senderID` → always a phone JID (`628xxx@s.whatsapp.net`)
- `msg.threadID` → group `@g.us` **or** phone JID for DMs  
- Device suffixes (`628xxx:5@s.whatsapp.net`) are stripped automatically

---

## 🔗 Links

| | |
|---|---|
| 📦 NPM package | [`@sheikhtamimlover/wca`](https://www.npmjs.com/package/@sheikhtamimlover/wca) |
| 🧩 WCA source | [github.com/sheikhtamimlover/wca](https://github.com/sheikhtamimlover/wca) |
| 🤖 Example bot | [github.com/sheikhtamimlover/ST_WhatsappBot](https://github.com/sheikhtamimlover/ST_WhatsappBot) |
| 💬 Contact | [wa.me/8801xxxxxxxxx](https://wa.me/8801xxxxxxxxx) |

---

<div align="center">

Made with ❤️ by **Sheikh Tamim**

[![GitHub](https://img.shields.io/badge/GitHub-sheikhtamimlover-181717?logo=github&style=flat-square)](https://github.com/sheikhtamimlover)

</div>
