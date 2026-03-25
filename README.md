# SOFTWARE-ENGINEERING-GAME
This repository is about the game "bubble submarine"
# 🎮 Bubble Submarine Game

🌊 BUBBLE SUBMARINE — Submarine Defense Game

A browser-based submarine defense game developed using the Waterfall Software Development Model.
Defend your bubble from 5 unique deep-sea enemies across endless waves using 3 distinct weapons. Built as a complete academic software engineering project with full documentation, test cases, and coverage reporting.


📋 Table of Contents

Project Overview
Waterfall Model Implementation
Game Features
File Structure
How to Run
Controls
Test Cases & Coverage
Requirements Traceability Matrix
Known Limitations
Future Enhancements


🎯 Project Overview
Deep Bubble is a 2D browser game where the player pilots a submarine enclosed in a protective bubble at the bottom of the ocean. Waves of increasingly difficult enemies attack the bubble, dealing damage on contact. The player must eliminate enemies using three different weapons while managing health and ammo resources.
This project was developed as part of a Software Engineering course to demonstrate the practical application of the Waterfall SDLC model — progressing through clearly defined, sequential phases: Requirements → Design → Implementation → Testing → Maintenance.

🏗️ Waterfall Model Implementation
The Waterfall model was applied strictly and sequentially across the following phases:
Phase 1 — Requirements Analysis
All functional and non-functional requirements were gathered and documented before any design or code was written. See docs/requirements.md.
Key Functional Requirements:
IDRequirementFR-01Player shall control a submarine enclosed in a bubble using WASD keysFR-02The bubble shall have a visible health indicatorFR-03Health shall regenerate over time passivelyFR-04At least 5 distinct enemy types shall existFR-05Enemies shall deal damage to the bubble on contactFR-06Player shall have 3 selectable weapons (keys 1, 2, 3)FR-07Weapons shall have distinct behaviours (rapid, piercing, AOE)FR-08Score shall increase when enemies are destroyedFR-09Waves shall increase in difficulty over timeFR-10Game shall run in a modern browser with no server required
Non-Functional Requirements:

Performance: game loop must sustain ≥ 60 FPS on mid-range hardware
Usability: game shall be learnable within 60 seconds without a manual
Portability: runs in any modern browser (Chrome, Firefox, Safari, Edge)
Maintainability: codebase structured with clearly separated concerns

Phase 2 — System Design
System architecture, data structures, and entity relationships were documented before coding began. See docs/design.md.
Phase 3 — Implementation
Code was written according to the design documents. The game is implemented as a single self-contained HTML5 Canvas application (src/index.html) with embedded CSS and JavaScript, keeping the deployment barrier at zero.
Phase 4 — Testing
A comprehensive test suite was written covering unit tests for all game logic modules. Tests simulate the browser environment using JSDOM. See tests/.
Phase 5 — Maintenance
Known defects, future improvements, and a change log are documented in docs/maintenance.md.

🎮 Game Features
Enemies (5 types)
EnemyHPSpeedDamageSpecial🪼 Jellyfish30Fast8Pulsing movement🐟 Anglerfish80Slow20Glowing lure🦀 Crab55Medium14Sideways walk🐟 Manta Ray100Very Fast10Wide sweeping path🦑 Giant Squid200Crawl30Multi-tentacle boss
Weapons (3 types)
KeyWeaponAmmoCooldownBehaviour1Pulse CannonInfinite12 framesRapid-fire homing shot2Torpedo1230 framesPierces through multiple enemies3Nova Burst560 framesInstant radial area-of-effect blast
Systems

Wave System — enemy count and HP scale with each wave
Health Regen — passive +0.03 HP/frame, max HP grows slowly over time
Ammo Regen — Torpedo: 1 ammo / 3 seconds; Nova: 1 ammo / 5 seconds
Invincibility Frames — 40-frame cooldown after taking damage to prevent instant death
Score System — score = 50% of enemy's max HP on kill


📁 File Structure
deep-bubble/
│
├── src/
│   └── index.html              # Main game file (HTML5 Canvas + embedded JS/CSS)
│
├── tests/
│   ├── game.test.js            # Full test suite (Jest)
│   └── coverage-report.html    # Visual HTML coverage report
│
├── docs/
│   ├── requirements.md         # Phase 1: Requirements specification
│   ├── design.md               # Phase 2: System design document
│   ├── maintenance.md          # Phase 5: Maintenance log & known issues
│   └── waterfall-diagram.md    # Waterfall phase diagram (ASCII)
│
├── assets/
│   └── (game is self-contained; no external assets required)
│
├── README.md                   # This file
└── package.json                # Project metadata & test scripts

🚀 How to Run
Option 1 — Open directly (no server needed)
bash# Just open the file in your browser
open src/index.html        # macOS
start src/index.html       # Windows
xdg-open src/index.html    # Linux
Option 2 — Serve locally (recommended for best performance)
bash# Python 3
python -m http.server 8080
# then open http://localhost:8080/src/index.html
Option 3 — GitHub Pages (live demo)
Push to a GitHub repo, then:

Go to Settings → Pages
Set source to main branch, /src folder
Your game is live at https://<username>.github.io/<repo>/


🎮 Controls
InputActionW / A / S / DMove submarine bubbleMouse MoveAim weaponLeft Click / HoldFire current weapon1Switch to Pulse Cannon2Switch to Torpedo3Switch to Nova Burst

🧪 Test Cases & Coverage
Tests are written in Jest and cover all major game logic modules.
bash# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage report
npm run coverage
See tests/game.test.js for full test suite and tests/coverage-report.html for the visual coverage report.
Coverage Summary:
ModuleStatementsBranchesFunctionsLinesPlayer Logic95%90%100%95%Enemy Spawning90%85%100%90%Weapon System100%95%100%100%Collision Detection88%82%100%88%Wave System90%88%100%90%Health/Ammo Regen92%88%100%92%Overall91%88%100%91%

📐 Requirements Traceability Matrix
Req IDRequirementTest CaseStatusFR-01WASD movementTC-01, TC-02✅ PassedFR-02Health indicatorTC-05✅ PassedFR-03Health regenerationTC-06✅ PassedFR-045 enemy typesTC-10✅ PassedFR-05Enemies deal damageTC-11, TC-12✅ PassedFR-063 selectable weaponsTC-15, TC-16, TC-17✅ PassedFR-07Distinct weapon behaviourTC-18, TC-19, TC-20✅ PassedFR-08Score trackingTC-22✅ PassedFR-09Wave difficulty scalingTC-23✅ PassedFR-10Browser-native, no serverManual✅ Passed

⚠️ Known Limitations

No persistent high score (browser session only)
Mobile touch controls are basic (no virtual joystick)
No audio — sound effects would improve game feel
Single HTML file architecture limits scalability for future modular expansion


🔮 Future Enhancements

 LocalStorage-based high score leaderboard
 Power-up drops from killed enemies
 Boss waves every 5 waves
 Sound effects and background music
 Mobile virtual joystick
 Modular ES6 module refactor




