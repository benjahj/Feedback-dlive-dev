# Feedback-dLive-Dev

Custom Bitfocus Companion module for **Allen & Heath dLive** with full feedback support via MIDI-over-TCP.

Based on the official [companion-module-allenheath-dlive](https://github.com/bitfocus/companion-module-allenheath-dlive) but extended with mute/fader/send state tracking and button feedbacks.

**Module ID:** `feedback-dlive-dev`
**Companion name:** `A&H Custom: dLive Feedback`
**Tested on:** Companion 4.2.6

---

## Connection Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Target IP | `192.168.1.70` | Mixrack IP address |
| MIDI Port | `51325` | MIDI-over-TCP port (mixrack default) |
| Main MIDI Channels | `1 to 5` | MIDI channel range matching console setup |

> **Tip:** Surface default IP is `192.168.1.71` with port `51328`. This module defaults to mixrack.

---

## Actions (19 stk)

### Mute & Fader
| Action | Description |
|--------|-------------|
| **Mute** | Mute/unmute any channel (input, group, aux, matrix, DCA, mute group, etc.) |
| **Fader Level** | Set fader level (0-127) for any channel |

### Send Routing
| Action | Description |
|--------|-------------|
| **Input to Group / Aux / Matrix (On/Off)** | Set input send on or off (checkbox) |
| **Toggle Input to Group / Aux / Matrix** | Toggle input send - each press flips state |
| **Channel Send On/Off** | Set send on/off for any source channel (checkbox) |
| **Toggle Send On/Off** | Toggle send for any source channel - each press flips state |
| **Aux / FX / Matrix Send Level** | Set send level from source to destination |

### Assignments
| Action | Description |
|--------|-------------|
| **Assign a channel to the main mix** | Assign/remove channel from main LR mix |
| **Assign to DCA** | Assign/remove channel to/from DCA (1-24) |
| **Assign to Mute Group** | Assign/remove channel to/from mute group (1-8) |

### Scene & Cue
| Action | Description |
|--------|-------------|
| **Recall Scene** | Recall a scene (1-500) |
| **Recall Cue List** | Recall a cue list entry |
| **Go Next/Previous (Surface Only)** | Trigger Go/Next/Previous via MIDI CC |

### Channel Settings
| Action | Description |
|--------|-------------|
| **Set Channel Name** | Set channel name (max 6 characters) |
| **Set Channel Colour** | Set channel colour on console |

### Preamp / Socket
| Action | Description |
|--------|-------------|
| **Set Socket Preamp Gain** | Set preamp gain (5-60 dB) |
| **Set Socket Preamp Pad** | Enable/disable preamp pad |
| **Set Socket Preamp 48v** | Enable/disable 48V phantom power |

### EQ & Filter
| Action | Description |
|--------|-------------|
| **Parametric EQ** | Set type, frequency, width and gain for 4-band PEQ |
| **HPF Frequency** | Set high pass filter frequency for input channel |
| **Set HPF On/Off** | Enable/disable high pass filter |

---

## Feedbacks (6 stk)

All feedbacks are **boolean** type - they change button style (color/text) based on state.

| Feedback | Default Style | Description |
|----------|--------------|-------------|
| **Channel Mute Status** | Red background | Any channel type muted (universal) |
| **Mute Group Active** | Red background | Specific mute group (1-8) is active |
| **DCA Mute Status** | Red background | Specific DCA (1-24) is muted |
| **Input Channel Mute** | Red background | Specific input (1-128) is muted |
| **Fader Level Threshold** | Green background | Fader level at or above threshold |
| **Channel Send On/Off Status** | Green background | Send from source to destination is enabled |

### How Feedbacks Work

The module listens to incoming MIDI data from the dLive and tracks state:

- **Note On/Off messages** (0x9n) = Mute status (velocity 0x7F = muted, 0x3F = unmuted)
- **NRPN CC messages** (0xBn) = Fader levels (parameter 0x17)
- **SysEx messages** (0x0E) = Send on/off state

Toggle actions also update state **optimistically** (immediate flip) so buttons respond instantly without waiting for dLive echo.

---

## Supported Channel Types

| Channel Type | Count | MIDI Channel Offset |
|-------------|-------|-------------------|
| Input | 128 | N + 0 |
| Mono Group | 62 | N + 1 |
| Stereo Group | 31 | N + 1 |
| Mono Aux | 62 | N + 2 |
| Stereo Aux | 32 | N + 2 |
| Mono Matrix | 62 | N + 3 |
| Stereo Matrix | 31 | N + 3 |
| Mono FX Send | 16 | N + 4 |
| Stereo FX Send | 16 | N + 4 |
| FX Return | 16 | N + 4 |
| Main | 6 | N + 4 |
| DCA | 24 | N + 4 |
| Mute Group | 8 | N + 4 |
| Stereo UFX Send | 8 | N + 4 |
| Stereo UFX Return | 8 | N + 4 |

---

## Installation

### Windows (Development PC)

```bash
git clone https://github.com/benjahj/Feedback-dlive-dev.git DliveModuleFeedbacl
cd DliveModuleFeedbacl
npm install
npm run build
```

Set Companion Developer modules path to the parent folder.

### CompanionPi (Raspberry Pi - no internet)

Pi'en har ikke internet. Modulet overfoeres som tar-fil fra Windows-PC via SCP/WinSCP.

#### Build and package on Windows

```bash
cd C:\SynologyDrive\Companion-Usermodules-dev\DliveModuleFeedbacl
npm run build
cd ..
tar -czf DliveModuleFeedbacl-ready.tar.gz --exclude=".git" --exclude=".claude" DliveModuleFeedbacl/
```

#### Transfer to Pi

**Option A: WinSCP**
1. Open WinSCP, connect to `192.168.1.25` (user: `pi`, pass: `raspberry`)
2. Upload `DliveModuleFeedbacl-ready.tar.gz` to `/tmp/`

**Option B: SCP from command line**
```bash
scp DliveModuleFeedbacl-ready.tar.gz pi@192.168.1.25:/tmp/
```

#### Install on Pi

```bash
sudo rm -rf /opt/companion-module-dev/DliveModuleFeedbacl
sudo tar -xzf /tmp/DliveModuleFeedbacl-ready.tar.gz -C /opt/companion-module-dev/
rm /tmp/DliveModuleFeedbacl-ready.tar.gz
```

Restart Companion on the Pi. Module appears as **"A&H Custom: dLive Feedback"**.

---

## Updating the Module

### 1. Make changes on Windows PC

Edit source files in `src/`, then:

```bash
cd C:\SynologyDrive\Companion-Usermodules-dev\DliveModuleFeedbacl
npm run build
```

Restart Companion on Windows to test.

### 2. Push to GitHub

```bash
git add -A
git commit -m "Description of changes"
git push
```

### 3. Deploy update to Pi

**On Windows (build + package):**
```bash
cd C:\SynologyDrive\Companion-Usermodules-dev
tar -czf DliveModuleFeedbacl-ready.tar.gz --exclude=".git" --exclude=".claude" DliveModuleFeedbacl/
scp DliveModuleFeedbacl-ready.tar.gz pi@192.168.1.25:/tmp/
```

**On Pi (install):**
```bash
sudo rm -rf /opt/companion-module-dev/DliveModuleFeedbacl
sudo tar -xzf /tmp/DliveModuleFeedbacl-ready.tar.gz -C /opt/companion-module-dev/
rm /tmp/DliveModuleFeedbacl-ready.tar.gz
```

Restart Companion on the Pi.

### Fresh clone on a PC with internet

```bash
git clone https://github.com/benjahj/Feedback-dlive-dev.git DliveModuleFeedbacl
cd DliveModuleFeedbacl
npm install
npm run build
```

---

## Project Structure

```
DliveModuleFeedbacl/
├── companion/
│   └── manifest.json          # Module manifest for Companion
├── src/
│   ├── main.ts                # Entry point, MIDI connection, data parsing
│   ├── actions.ts             # All 19 action definitions
│   ├── feedbacks.ts           # All 6 feedback definitions
│   ├── state.ts               # State tracking (mute, fader, send)
│   ├── midi-parser.ts         # MIDI stream parser + channel resolver
│   ├── constants.ts           # Channel counts, MIDI offsets, choices
│   ├── types.d.ts             # TypeScript type definitions
│   ├── utils/                 # Helper functions
│   │   ├── getChannelSelectOptions.ts
│   │   ├── getMidiOffsetsForChannelType.ts
│   │   ├── getSocketSelectOptions.ts
│   │   ├── makeDropdownChoices.ts
│   │   ├── midiValueConverters.ts
│   │   └── stringToMidiBytes.ts
│   └── validators/
│       └── validators.ts      # Input validation
├── dist/                      # Compiled JavaScript (git-ignored)
├── node_modules/              # Dependencies (git-ignored)
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## GitHub Repository

https://github.com/benjahj/Feedback-dlive-dev
