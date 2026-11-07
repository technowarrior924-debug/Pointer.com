// Game Variables & Scene Setup
let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isCrouching = false;
let canJump = false;
let velocity = new THREE.Vector3();

// Player Controls & Stats
let playerHeight = 1.62; 
let targetPlayerHeight = 1.62;
let isLocked = false;
let pitch = 0, yaw = 0;

let headYaw = 0;

let myHealth = 100;
let myKills = 0;
let myDeaths = 0;
let matchTimerString = "10:00";
let isDeadLocal = false;
let playerName = "Player";
let gameStarted = false;

// ⚡ Dash Variables
let isDashing = false;
let dashCooldown = false;
const dashSpeed = 35.0;
const dashDuration = 0.15;
let dashTimer = 0;
let dashDirection = new THREE.Vector3();

let bhopBonus = 0;      
let bhopChain = 0;      
let lastLandTime = 0;   
let shiftReleaseTime = 0; 

let isAiming = false;
const normalFOV = 90;
const aimedFOV = 60;

let headBobTimer = 0;
const bobFrequency = 10;
const bobAmplitude = 0.05;
let playerWalkTimer = 0;

let targets = [];
let bloodParticles = [];
let gun, muzzleFlash;
let isShooting = false;
let recoilTimer = 0;
let localPlayerParts = null;

// Multiplayer Setup
const socket = (typeof io !== 'undefined') ? io() : { on: () => {}, emit: () => {}, id: 'local' };
const otherPlayers = {};
let lobbyCharacter = null;
let lobbySteveParts = null;
let lobbyScene = null;
let lobbyCamera = null;
let lobbyPlatform = null;

let lobbyPlayerSize = 0.65;
let lobbyPlayerRotate = 0;
let lobbyShadowScale = 0.5;

// Official Minecraft dimensions (screenshot): height 1.8m, hitbox 1.8 x 0.6m,
// eye level 1.62m. Character mesh is 2.0 tall and body 0.6 wide, so Y scale
// 0.9 (1.8/2.0) — width (0.6) and eye level (1.62) stay as-is.
const PLAYER_HEIGHT_RATIO = 0.9;
function setPlayerScale(obj, size) {
    obj.scale.set(size, size * PLAYER_HEIGHT_RATIO, size);
}

// Lobby gun editor state: x = left(-)/right(+), y = gun centre height,
// scale = gun size. Base pose ab Jimmy ki look hai (x 0, y 1.15,
// scale 0.95); z 0.62 hi hai taake gun haathon se aage rahe.
let lobbyGunGroup = null;
let lobbyGunX = 0;
let lobbyGunY = 1.15;
let lobbyGunZ = 0.62;
let lobbyGunScale = 0.95;

// Crouch pose (bethne ki position): Jimmy khud banata hai — lobby me
// CROUCH POSE sliders + SIT PREVIEW se. Yehi values game me Shift wale
// crouch ki pose hain (hips aage, knees bend, body drop). Default ab
// Jimmy ki set ki hui pose hai (0.6 / 1.6 / 0.23).
let crouchHip = 0.6;
let crouchKnee = 1.6;
let crouchDrop = 0.23;
let lobbyCrouchPreview = false;

// In-game gun editor state (doosre players ki gun, lobby/first-person gun nahi).
// rot degrees me hai, pos character-local units me. Base ab Jimmy ki look
// hai: posX -0.1, posY 1.65, posZ 0.4, rotX 5. PosX character ke
// left/right hai, posZ aage/peeche hai jo side view me screen par
// left/right lagta hai.
let inGameGunGroups = [];
let inGameGunRotX = 5;
let inGameGunRotY = 0;
let inGameGunPosX = -0.1;
let inGameGunPosY = 1.65;
let inGameGunPosZ = 0.4;
let inGamePlayerSize = 1;
let inGamePlayerRotate = 0;
let isInGameGunEditing = false;

// 🌟 Full Advanced Custom Parts & Elbow State
const partNames = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'leftElbow', 'rightElbow', 'leftKnee', 'rightKnee'];
let lobbyCustomParts = {};

partNames.forEach(p => {
    lobbyCustomParts[p] = {
        scale: 1,
        rotX: 0, rotY: 0, rotZ: 0,
        posX: 0, posY: 0, posZ: 0
    };
});

// 👤 Jimmy ki look, ab app.js me default hai (uske localhost localStorage
// se li gayi values). Kisi bhi Google account / browser / device par yahi
// look dikhegi, localStorage khali ho to bhi. Neeche localStorage load
// iske upar chadhta hai, to jo baad me badlo ge wo phir bhi save hoga.
// (leftKnee/rightKnee customize nahi kiye gaye thay, wo default 0 par hain.)
const DEFAULT_LOOK_CUSTOM_PARTS = {
    head: { scale: 1.05, rotY: 0.16, posY: -0.05 },
    body: { rotX: -0.14, rotY: 0.16, posY: -0.05 },
    leftArm: { rotX: -0.54, rotY: -0.74, rotZ: 0.56 },
    rightArm: { rotX: -2.14, rotY: -0.84, rotZ: -1.14 },
    leftLeg: { rotX: 0.06, rotY: -1.84, rotZ: 0.26, posY: 0.10 },
    rightLeg: { scale: 1.05, rotX: 0.26, rotY: -1.34, rotZ: 0.46, posY: 0.1 },
    leftElbow: { rotX: -0.24, rotY: -0.44 },
    rightElbow: { rotX: -0.34, rotY: -1.94 }
};
Object.keys(DEFAULT_LOOK_CUSTOM_PARTS).forEach((part) => {
    const baked = DEFAULT_LOOK_CUSTOM_PARTS[part];
    Object.keys(baked).forEach((prop) => { lobbyCustomParts[part][prop] = baked[prop]; });
});

try {
    if (typeof localStorage !== 'undefined') {
        const savedSize = parseFloat(localStorage.getItem('pointerx_lobby_player_size'));
        if (!isNaN(savedSize) && savedSize >= 0.3 && savedSize <= 1) lobbyPlayerSize = savedSize;
        const savedRot = parseFloat(localStorage.getItem('pointerx_lobby_player_rotate'));
        if (!isNaN(savedRot) && savedRot >= -180 && savedRot <= 180) lobbyPlayerRotate = savedRot;
        const savedShadow = parseFloat(localStorage.getItem('pointerx_lobby_shadow_scale'));
        if (!isNaN(savedShadow) && savedShadow >= 0.3 && savedShadow <= 2) lobbyShadowScale = savedShadow;
        const savedGunX = parseFloat(localStorage.getItem('pointerx_lobby_gun_x'));
        if (!isNaN(savedGunX)) lobbyGunX = Math.min(0.6, Math.max(-0.6, savedGunX));
        const savedGunY = parseFloat(localStorage.getItem('pointerx_lobby_gun_y'));
        if (!isNaN(savedGunY)) lobbyGunY = Math.min(1.35, Math.max(0.6, savedGunY));
        const savedLobbyGunZ = parseFloat(localStorage.getItem('pointerx_lobby_gun_z'));
        if (!isNaN(savedLobbyGunZ)) lobbyGunZ = Math.min(1, Math.max(0.3, savedLobbyGunZ));
        const savedGunScale = parseFloat(localStorage.getItem('pointerx_lobby_gun_scale'));
        if (!isNaN(savedGunScale)) lobbyGunScale = Math.min(2, Math.max(0.5, savedGunScale));
        const savedCrouchHip = parseFloat(localStorage.getItem('pointerx_crouch_hip'));
        if (!isNaN(savedCrouchHip)) crouchHip = Math.min(1.2, Math.max(0, savedCrouchHip));
        const savedCrouchKnee = parseFloat(localStorage.getItem('pointerx_crouch_knee'));
        if (!isNaN(savedCrouchKnee)) crouchKnee = Math.min(2, Math.max(0, savedCrouchKnee));
        const savedCrouchDrop = parseFloat(localStorage.getItem('pointerx_crouch_drop'));
        if (!isNaN(savedCrouchDrop)) crouchDrop = Math.min(0.3, Math.max(0, savedCrouchDrop));
        const savedCrouchPreview = localStorage.getItem('pointerx_crouch_preview');
        if (savedCrouchPreview === '1') lobbyCrouchPreview = true;
        const savedIGRotX = parseFloat(localStorage.getItem('pointerx_ingame_gun_rotX'));
        if (!isNaN(savedIGRotX)) inGameGunRotX = Math.min(60, Math.max(-60, savedIGRotX));
        const savedIGRotY = parseFloat(localStorage.getItem('pointerx_ingame_gun_rotY'));
        if (!isNaN(savedIGRotY)) inGameGunRotY = Math.min(60, Math.max(-60, savedIGRotY));
        const savedIGPosX = parseFloat(localStorage.getItem('pointerx_ingame_gun_posX'));
        if (!isNaN(savedIGPosX)) inGameGunPosX = Math.min(1, Math.max(-1, savedIGPosX));
        const savedIGPosY = parseFloat(localStorage.getItem('pointerx_ingame_gun_posY'));
        if (!isNaN(savedIGPosY)) inGameGunPosY = Math.min(2, Math.max(0.6, savedIGPosY));
        const savedIGPosZ = parseFloat(localStorage.getItem('pointerx_ingame_gun_posZ'));
        if (!isNaN(savedIGPosZ)) inGameGunPosZ = Math.min(1, Math.max(-0.5, savedIGPosZ));
        const savedIGPlayerSize = parseFloat(localStorage.getItem('pointerx_ingame_player_size'));
        if (!isNaN(savedIGPlayerSize)) inGamePlayerSize = Math.min(2, Math.max(0.3, savedIGPlayerSize));
        const savedIGPlayerRotate = parseFloat(localStorage.getItem('pointerx_ingame_player_rotate'));
        if (!isNaN(savedIGPlayerRotate)) inGamePlayerRotate = Math.min(180, Math.max(-180, savedIGPlayerRotate));
        
        partNames.forEach(part => {
            ['scale', 'rotX', 'rotY', 'rotZ', 'posX', 'posY', 'posZ'].forEach(prop => {
                const val = parseFloat(localStorage.getItem(`pointerx_custom_${part}_${prop}`));
                if (!isNaN(val)) lobbyCustomParts[part][prop] = val;
            });
        });
    }
} catch (e) {}

let lastLocalChatText = '';
let lastLocalChatTime = 0;
let lastServerChatKey = '';
let lastServerChatTime = 0;
const shownChatIds = new Set();

let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let mobileJoystick = { active: false, x: 0, y: 0 };
let touchLook = { active: false, startX: 0, startY: 0 };

let authInitialized = false;

const sounds = {
    shoot: new Audio('sounds/shoot.mp3'),
    jump: new Audio('sounds/jump.mp3'),
    dash: new Audio('sounds/jump.mp3'),
    hit: new Audio('sounds/hit.mp3'),
    death: new Audio('sounds/death.mp3')
};

sounds.shoot.volume = 0.5;
sounds.jump.volume = 0.4;
sounds.dash.volume = 0.6;
sounds.hit.volume = 0.6;
sounds.death.volume = 0.7;

function playSound(soundName) {
    if (sounds[soundName]) {
        try {
            const soundClone = sounds[soundName].cloneNode();
            soundClone.volume = sounds[soundName].volume;
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {});
            }
        } catch (e) {}
    }
}

function unlockAudio() {
    Object.keys(sounds).forEach(key => {
        sounds[key].play().then(() => {
            sounds[key].pause();
            sounds[key].currentTime = 0;
        }).catch(() => {});
    });
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
}
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

init();
animate();

function setupAuthListener() {
    if (authInitialized) return;
    const auth = window.firebaseAuth;
    if (!auth || !window.onAuthStateChanged) return;

    authInitialized = true;

    if (window.getRedirectResult) {
        window.getRedirectResult(auth).then((result) => {
            if (result && result.user) {
                showGoogleNamePrompt(result.user);
            }
        }).catch((err) => {});
    }

    // Starting point hamesha lobby hai: URL khulte hi naam wala lobby
    // dikhega, PLAY dabane par hi game start hogi. Saved naam (Google ya
    // guest) lobby me pehle se bhara hua milega, lekin game khud start
    // nahi hogi — pehle aisa hota tha ke saved naam milte hi game seedha
    // shuru ho jati thi aur lobby dikhta hi nahi tha.
    window.onAuthStateChanged(auth, (user) => {
        if (user) {
            if (!gameStarted) {
                showGoogleNamePrompt(user);
            }
        } else {
            if (!gameStarted) {
                initNamePrompt();
            }
        }
    });
}

if (window.firebaseAuth) {
    setupAuthListener();
} else {
    window.addEventListener('firebase-ready', setupAuthListener);
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!authInitialized && !gameStarted) {
                initNamePrompt();
            }
        }, 1000);
    });
}

window.addEventListener('load', () => {
    setupExitButton();
    setupChatSystem();
});

function setupChatSystem() {
    const chatInput = document.getElementById('chat-input');
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    const sendBtn = document.getElementById('chat-send-btn');

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            submitChatMessage();
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.code === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                submitChatMessage();
            }
        });
    }
}

function submitChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatInputWrapper = document.getElementById('chat-input-wrapper');
    if (!chatInput) return;

    const text = chatInput.value.trim();
    if (text !== '') {
        const msgId = (socket.id || 'local') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        shownChatIds.add(msgId);
        appendChatMessage(playerName, text, 'white');
        lastLocalChatText = text;
        lastLocalChatTime = Date.now();
        socket.emit('sendChatMessage', { id: msgId, message: text });
    }
    chatInput.value = '';
    if (chatInputWrapper) chatInputWrapper.style.display = 'none';
    
    if (gameStarted && !isDeadLocal) {
        try { document.body.requestPointerLock(); } catch (e) {}
    }
}

function setupExitButton() {
    const oldBtn = document.getElementById('logout-btn');
    if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true);
        newBtn.textContent = 'EXIT';
        newBtn.addEventListener('click', exitToLobby);
        oldBtn.replaceWith(newBtn);
        return;
    }
    if (document.getElementById('exit-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'exit-btn';
    btn.textContent = 'EXIT';
    btn.style.position = 'absolute';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.background = '#ff3333';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '8px 14px';
    btn.style.fontWeight = 'bold';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '100';
    btn.style.fontFamily = 'monospace';
    btn.style.display = 'none';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
    btn.addEventListener('click', exitToLobby);
    document.body.appendChild(btn);
}

function exitToLobby() {
    try { document.exitPointerLock(); } catch (e) {}
    gameStarted = false;
    isLocked = false;
    isDeadLocal = false;
    moveForward = false; moveBackward = false; moveLeft = false; moveRight = false;
    isCrouching = false;
    if (velocity) velocity.set(0, 0, 0);
    myHealth = 100; myKills = 0; myDeaths = 0; bhopBonus = 0; bhopChain = 0;
    if (typeof hideRespawnScreen === 'function') hideRespawnScreen();
    Object.keys(otherPlayers).forEach((id) => {
        if (scene) {
            if (otherPlayers[id].mesh) scene.remove(otherPlayers[id].mesh);
            if (otherPlayers[id].nameTag) scene.remove(otherPlayers[id].nameTag);
        }
        delete otherPlayers[id];
    });
    targets = [];
    inGameGunGroups = [];
    if (typeof closeInGameGunEditor === 'function') closeInGameGunEditor();
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    const blocker = document.getElementById('blocker');
    if (blocker) blocker.style.display = 'none';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.style.display = 'none';
    if (camera) camera.position.set(0, playerHeight, 0);
    if (socket && typeof socket.disconnect === 'function') {
        try { socket.disconnect(); } catch (e) {}
    }
    const auth = window.firebaseAuth;
    const currentUser = auth ? auth.currentUser : null;
    if (currentUser) {
        showGoogleNamePrompt(currentUser);
    } else {
        initNamePrompt();
    }
    updateHUD();
}

function appendChatMessage(sender, text, color = 'white') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.style.color = color;
    msgDiv.style.wordBreak = 'break-word';
    
    if (sender) {
        msgDiv.innerHTML = `<span style="font-weight: bold; color: white;">${sender}:</span> ${text}`;
    } else {
        msgDiv.innerHTML = `<span style="font-weight: bold; color: ${color};">${text}</span>`;
    }

    chatMessages.appendChild(msgDiv);

    if (chatMessages.children.length > 8) {
        chatMessages.removeChild(chatMessages.children[0]);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createLobbyCharacter() {
    try {
        if (lobbyCharacter) return;
        if (typeof createSteveCharacter !== 'function') return;
        if (!lobbyScene) {
            lobbyScene = new THREE.Scene();
            lobbyScene.background = new THREE.Color(0x0a1a4a);
            // Roshni itni ke sab kuch saaf dikhe, lekin character white na glow kare.
            // Pehle ambient 0.9 + directional 1.2 tha (bohat zyada, rang dhul jate the).
            lobbyScene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const dl = new THREE.DirectionalLight(0xffffff, 0.7);
            dl.position.set(2, 4, 3);
            lobbyScene.add(dl);
            const platform = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), new THREE.MeshBasicMaterial({ color: 0x050a20 }));
            lobbyPlatform = platform;
            platform.scale.set((lobbyPlayerSize / 0.5) * lobbyShadowScale, (lobbyPlayerSize / 0.5) * lobbyShadowScale, 1);
            platform.rotation.x = -Math.PI / 2;
            platform.position.y = 0.01;
            lobbyScene.add(platform);
            lobbyCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
            lobbyCamera.position.set(0, 1.4, 3.4);
            lobbyCamera.lookAt(0, lobbyPlayerSize * PLAYER_HEIGHT_RATIO, 0);
        }
        const steve = createSteveCharacter('lobby');
        lobbySteveParts = steve;
        
        const group = steve.group;
        group.position.set(0, 0, 0);
        group.rotation.set(0, lobbyPlayerRotate * Math.PI / 180, 0);
        setPlayerScale(group, lobbyPlayerSize);
        
        applyCustomTransformsToParts(lobbySteveParts);

        // Lobby gun, image jaisi pose: seene ke saamne, bilkul horizontal,
        // muzzle viewer ke right side par, aur haathon se aage (z 0.62)
        // taake gun haath ke peeche ghusi hui na lage. Gun group ka origin
        // gun ke centre par hai (y 0.95), taake GUN SIZE slider gun ko usi
        // jagah par bara/chota kare, neeche na khiskaye. Sirf lobby gun
        // badli hai — in-game gun, arms, legs, size/rotate/shadow waisi hi.
        const gunGroup = new THREE.Group();
        gunGroup.position.set(lobbyGunX, lobbyGunY, lobbyGunZ);
        gunGroup.rotation.set(0, Math.PI / 2, 0);
        gunGroup.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
        lobbyGunGroup = gunGroup;
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }));
        gunBody.position.set(0, 0, 0);
        gunGroup.add(gunBody);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true }));
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, 0.45);
        gunGroup.add(barrel);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }));
        stock.position.set(0, 0, -0.38);
        gunGroup.add(stock);
        const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.10), new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true }));
        magazine.position.set(0, -0.16, 0.15);
        gunGroup.add(magazine);
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
        const stripeTop = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.35), neonMat);
        stripeTop.position.set(0, 0.085, 0);
        gunGroup.add(stripeTop);
        const stripeSide = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.20), neonMat);
        stripeSide.position.set(-0.07, 0, 0.15);
        gunGroup.add(stripeSide);
        group.add(gunGroup);

        steve.leftArmGroup.rotation.set(-0.9, 0, 0.3);
        steve.rightArmGroup.rotation.set(-0.9, 0, -0.3);
        steve.leftLeg.rotation.set(0, 0, -0.08);
        steve.rightLeg.rotation.set(0, 0, 0.08);

        lobbyScene.add(group);
        lobbyCharacter = group;
        applyLobbyCrouchPose();
    } catch (e) {}
}

function removeLobbyCharacter() {
    try {
        if (lobbyCharacter && lobbyScene) lobbyScene.remove(lobbyCharacter);
        if (lobbyCharacter && scene) scene.remove(lobbyCharacter);
        lobbyCharacter = null;
        lobbySteveParts = null;
        lobbyGunGroup = null;
    } catch (e) {}
}

function applyCustomTransformsToParts(steveObj) {
    if (!steveObj) return;
    try {
        const mapping = {
            head: steveObj.head,
            body: steveObj.body,
            leftArm: steveObj.leftArmGroup,
            rightArm: steveObj.rightArmGroup,
            leftLeg: steveObj.leftLeg,
            rightLeg: steveObj.rightLeg,
            leftElbow: steveObj.leftElbowMesh,
            rightElbow: steveObj.rightElbowMesh,
            leftKnee: steveObj.leftKneeMesh,
            rightKnee: steveObj.rightKneeMesh
        };

        partNames.forEach(name => {
            const part = mapping[name];
            const cfg = lobbyCustomParts[name];
            if (part && cfg) {
                if (name !== 'leftElbow' && name !== 'rightElbow' && name !== 'leftKnee' && name !== 'rightKnee') {
                    // Head 0.5 x 0.5 x 0.5 cube hai (screenshot) — group ki Y scale
                    // (0.9) use dabati hai, is liye head ki Y scale ko 1/0.9 se
                    // compensate karo taake head cube hi rahe.
                    if (name === 'head') part.scale.set(cfg.scale, cfg.scale / PLAYER_HEIGHT_RATIO, cfg.scale);
                    else part.scale.set(cfg.scale, cfg.scale, cfg.scale);
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                    if (name === 'head') part.position.set(0, 1.75 + cfg.posY, cfg.posZ);
                    else if (name === 'body') part.position.set(0, 1.125 + cfg.posY, cfg.posZ);
                    else if (name === 'leftArm') part.position.set(-0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'rightArm') part.position.set(0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'leftLeg') part.position.set(-0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                    else if (name === 'rightLeg') part.position.set(0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                } else {
                    // Elbow Bend Rotation
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                }
            }
        });
    } catch (e) {}
}

// 🦵 Knee bend (walk + crouch) hamesha peeche ki taraf — taang ke twist
// (leg rotY) se azaad. Seedha rotation.x lagane se shin twist ki taraf
// mud jati hai aur crouch me taange side me bend ho jati hain (Jimmy ki
// screenshot: game me betha player ki taange side par). Quaternion se
// hisaab: total = hip-bend + user-knee, aur knee = hip^-1 * total.
const _kneeEHip = new THREE.Euler();
const _kneeETarget = new THREE.Euler();
const _kneeEUser = new THREE.Euler();
const _kneeQHip = new THREE.Quaternion();
const _kneeQTarget = new THREE.Quaternion();
const _kneeQUser = new THREE.Quaternion();
const _kneeQKnee = new THREE.Quaternion();
function applyKneeBend(kneeMesh, hipRot, baseKnee, bend) {
    if (!kneeMesh || !hipRot || !baseKnee) return;
    _kneeEHip.set(hipRot.x, hipRot.y, hipRot.z);
    _kneeETarget.set(hipRot.x + bend, hipRot.y, hipRot.z);
    _kneeEUser.set(baseKnee.rotX || 0, baseKnee.rotY || 0, baseKnee.rotZ || 0);
    _kneeQHip.setFromEuler(_kneeEHip);
    _kneeQTarget.setFromEuler(_kneeETarget);
    _kneeQUser.setFromEuler(_kneeEUser);
    _kneeQKnee.copy(_kneeQHip).invert().multiply(_kneeQTarget).multiply(_kneeQUser);
    kneeMesh.rotation.setFromQuaternion(_kneeQKnee);
}

// 🎨 SKIN EDITOR — pixel skin (har pixel par color kar sakte ho).
// Har part ka ek pixel grid hai: HEAD 8x8, BODY 8x10, arms/legs 4x10
// (thigh/upper = upar ki 5 rows, shin/forearm = neeche ki 5 rows).
// Skin sirf texture hai — parts ke scale/rot/pos se iska koi lena dena nahi.
const SKIN_PARTS = {
    head: { w: 8, h: 8, label: 'HEAD' },
    body: { w: 8, h: 10, label: 'BODY' },
    armL: { w: 4, h: 10, label: 'LEFT ARM' },
    armR: { w: 4, h: 10, label: 'RIGHT ARM' },
    legL: { w: 4, h: 10, label: 'LEFT LEG' },
    legR: { w: 4, h: 10, label: 'RIGHT LEG' },
    headB: { w: 8, h: 8, label: 'HEAD (BACK)' },
    bodyB: { w: 8, h: 10, label: 'BODY (BACK)' },
    armLB: { w: 4, h: 10, label: 'LEFT ARM (BACK)' },
    armRB: { w: 4, h: 10, label: 'RIGHT ARM (BACK)' },
    legLB: { w: 4, h: 10, label: 'LEFT LEG (BACK)' },
    legRB: { w: 4, h: 10, label: 'RIGHT LEG (BACK)' },
    headS: { w: 8, h: 8, label: 'HEAD (SIDE)' },
    bodyS: { w: 4, h: 10, label: 'BODY (SIDE)' },
    armLS: { w: 4, h: 10, label: 'LEFT ARM (SIDE)' },
    armRS: { w: 4, h: 10, label: 'RIGHT ARM (SIDE)' },
    legLS: { w: 4, h: 10, label: 'LEFT LEG (SIDE)' },
    legRS: { w: 4, h: 10, label: 'RIGHT LEG (SIDE)' },
};
const SKIN_FRONT_PARTS = ['head', 'body', 'armL', 'armR', 'legL', 'legR'];
const SKIN_PART_ORDER = [...SKIN_FRONT_PARTS, 'headB', 'bodyB', 'armLB', 'armRB', 'legLB', 'legRB', 'headS', 'bodyS', 'armLS', 'armRS', 'legLS', 'legRS'];
const SKIN_CODE_KEY = 'pointerx_skin_v1';
const SKIN_DRAFT_KEY = 'pointerx_skin_draft';
const SKIN_B64 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
// 👇 Jimmy ki published skin ka code yahan bake hoga (uske bheje hue code se).
let DEFAULT_SKIN_CODE = 'PX1|e58d3ff3a858eb983fdfc4a2ebd0b0efdabfffffff236224efbbb186b98480825a94966b7bb2788cbe8a94c89271ab6e2b542818381664412c7c573e724e366c462e4f4f4f6565655858586f6f6f3f3f3fde812e5c3b27d4b78f|0121021021020021202033022204544046755764555555555558855445555543|9a4333339b5445559cb55555d9cbaaacededccc9eedcede9ecdfecedffcfdfdcgghhhhgg99d9d9d9|ddddddd9ddeeaaab344455555555555545553455|ddddd9d9eeedbbaa444355555555555555545543|ijklijjkkljjjjlikjjjmnooopnnmnnoqmmqopno|ikjiljjljjljiljkjjjkonoonpnnonnoqmmqopno|0222022012220210121201102110012r012r210r210r120r12r212r022r220r0|ddddddc9ddddc9ddcc9ddede9ededededeedeeeeedececeddcecdcedfcdcdcdfhhggggghdddcd9dd|ddddd9d9ededbaaa444355555445555555545543|dddd99d9ddedaabb344455555445555545553455|scddlsssjjkijjjlllllnnnoqmmqmoomoooommmm|9999ssiilkjjkjjjslllnnnnqmmqmoommoooqmmm|02201020011210202110202211202002000203302220344502r0445520rtt344|dddddccddcccdfcccfcddcfddccdhhhgfccfd9cc|dd9999dddeedaaaa333344344434344434444443|dddd99ddeddebbbb444455555555555555555555|iiiiiiiiiiillllklllknnnoonnnqmmqooommmoo|9ddciccikllkjjkiliilnnnoonnnqmmqooommmoo';

// 🎒 INVENTORY SKINS — built-in skins jo player inventory se click karke
// equip kar sakta hai. AGENT (Jimmy ki nayi skin, black suit + red tie)
// inventory ki default/pehli skin hai. Equip HAR ACCOUNT ke liye alag hai
// (per-account key me save hoti hai), is liye ek account par equip karne
// se doosre Google account par nahi lagti — usko khud equip karna hota hai.
const INVENTORY_SKINS = [
    { id: 'agent', name: 'AGENT', desc: 'Black suit, red tie', code: 'PX1|0a0606171212000000f4dca8ffffffab070ec68642|0011111011101111111101101110111101011011222222222223322233333333|22433422224554222245542222455422224554222245542222455422224544222244442222444422|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|0100111000111001101111011010101100101011110000110000000000000000|22222222222222222222222222222222222222222222222222222222222222222222222222222222|2266226622662266226622662266226622662266|2266226622662266226622662266226622662266|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|0011111000111000111111111110111111111101101002220000031000000013|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222|2222222222222222222222222222222222222222' },
    { id: 'alex', name: 'ALEX', desc: 'Default skin', code: DEFAULT_SKIN_CODE },
    { id: 'steve', name: 'STEVE', desc: 'Classic Steve', code: 'PX1|3b2416c6864200a8b53b449b|0000000000000000000000001111111111111111111111111111111111111111|22222222222222222222222222222222222222222222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333|0000000000000000000000001111111111111111111111111111111111111111|22222222222222222222222222222222222222222222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333|0000000000000000000000001111111111111111111111111111111111111111|2222222222222222222222222222222222222222|1111111111111111111111111111111111111111|1111111111111111111111111111111111111111|3333333333333333333333333333333333333333|3333333333333333333333333333333333333333' },
    { id: 'pink', name: 'PINK', desc: 'Pink hair, pink outfit', code: 'PX1|1008032514073a200bf4b8cce8769c4f2c0f6438137a4417f8cedcdea778e3b48c2a1e14e8c1a02513074f290f60253b4e1e30280a241e201ecac9c9060606140512f0a2bc3d17262a101a18090f1604152c082a2d2d2d202020131313e6e6e6420c3fec8cacfce4ecedceb4|0122231014566341666673665656686525122152010990106abaaba626cccc62|00199aaad2333acc21888338e1888888288888881e8188888128888888888888fg8888fggfhfghfh|iccjkacjhhlj388j388jm33j388jm33jm33jhhhj|j883jlhhj883j883j883j33mj883j33mj33mjlhh|nonpnofgnfgaaaac83388338qrrq8st8stuttvvu|pnongfonagfncaaaccca8q8qr3r3mtswtutsuvvt|22m2222222m5622226m5526225m5525225x55d52d242202d0d4dd0d000400000|00x000000dxdd0d0d2m2202d2emeede22e3ee2e22e3ee2e22emeede2d2x2202d02x220200dxdd0d0|jccijcakjlhhj883j883j33mj883jmmmj33mjllh|388jhhlj388j388j388jm33j388jmmmjm33jhhlj|ononfgonafgncaaa83388338qrrq8338uutsuuut|nononogfngfaaaaccccc8q8qr3r3mwmwstuutuuu|2222222022256220262552622525525225d55d52d202202d0d0dd0d000000000|88888888888888888888888888888888ppllpppp|cccccccchhhh3mm33mm3mxxm3mm3mmmmmxxmhhhh|8338lhhl83y8833883383mm383y8m8833mm3lhhl|llllllllllllaaaa3mm33mm3qrrq3mm3ssssuuuu|oppoooooaaaaccccczcc8q8qr3r3mwmwtsstuttu' },
    { id: 'original', name: 'ORIGINAL', desc: 'Plain Steve (no skin)', code: null },
];

function defaultSkin() {
    const fill = (part, color) => Array(SKIN_PARTS[part].w * SKIN_PARTS[part].h).fill(color);
    const head = fill('head', '#c68642');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) head[y * 8 + x] = '#3b2416';
    const skin = { head, body: fill('body', '#00a8b5'), armL: fill('armL', '#c68642'), armR: fill('armR', '#c68642'), legL: fill('legL', '#3b449b'), legR: fill('legR', '#3b449b') };
    // Back shuru me front jaisa hi hota hai (purani skin jaisi), phir alag se paint hota hai.
    SKIN_FRONT_PARTS.forEach((p) => { skin[p + 'B'] = skin[p].slice(); });
    // Side shuru me plain base colour (front ka design side par nahi jata).
    skin.headS = skin.head.slice();
    skin.bodyS = fill('bodyS', '#00a8b5');
    skin.armLS = fill('armLS', '#c68642');
    skin.armRS = fill('armRS', '#c68642');
    skin.legLS = fill('legLS', '#3b449b');
    skin.legRS = fill('legRS', '#3b449b');
    return skin;
}
function cloneSkin(skin) { const o = {}; SKIN_PART_ORDER.forEach((p) => { o[p] = (skin[p] || []).slice(); }); return o; }
function skinColorDist(a, b) {
    const pa = parseInt(String(a).slice(1), 16), pb = parseInt(String(b).slice(1), 16);
    const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255), dg = ((pa >> 8) & 255) - ((pb >> 8) & 255), db = (pa & 255) - (pb & 255);
    return dr * dr + dg * dg + db * db;
}
function encodeSkinCode(skin) {
    const palette = [];
    const idx = {};
    const parts = [];
    SKIN_PART_ORDER.forEach((p) => {
        let s = '';
        (skin[p] || []).forEach((c) => {
            const col = String(c || '#000000').toLowerCase();
            if (idx[col] === undefined) {
                if (palette.length >= 62) {
                    let best = 0, bestD = Infinity;
                    palette.forEach((pc, i) => { const d = skinColorDist(col, pc); if (d < bestD) { bestD = d; best = i; } });
                    idx[col] = best;
                } else { idx[col] = palette.length; palette.push(col); }
            }
            s += SKIN_B64[idx[col]];
        });
        parts.push(s);
    });
    return 'PX1|' + palette.map((c) => c.slice(1)).join('') + '|' + parts.join('|');
}
function decodeSkinCode(code) {
    try {
        const seg = String(code || '').trim().split('|');
        const isOld6 = seg.length === 2 + SKIN_FRONT_PARTS.length;
        const isOld12 = seg.length === 2 + SKIN_FRONT_PARTS.length * 2;
        const isNew = seg.length === 2 + SKIN_PART_ORDER.length;
        if ((!isOld6 && !isOld12 && !isNew) || seg[0] !== 'PX1') return null;
        const palHex = seg[1];
        if (palHex.length === 0 || palHex.length % 6 !== 0 || palHex.length / 6 > 62) return null;
        const palette = [];
        for (let i = 0; i < palHex.length; i += 6) palette.push('#' + palHex.slice(i, i + 6));
        const skin = {};
        const order = isNew ? SKIN_PART_ORDER : (isOld12 ? SKIN_PART_ORDER.slice(0, 12) : SKIN_FRONT_PARTS);
        for (let k = 0; k < order.length; k++) {
            const p = order[k];
            const s = seg[2 + k];
            const def = SKIN_PARTS[p];
            if (s.length !== def.w * def.h) return null;
            const arr = [];
            for (let i = 0; i < s.length; i++) {
                const j = SKIN_B64.indexOf(s[i]);
                if (j < 0 || j >= palette.length) return null;
                arr.push(palette[j]);
            }
            skin[p] = arr;
        }
        // Purane code me jo part nahi hai, use default se bharo (back/side plain, front ka design wahan nahi jata).
        const defSkin = defaultSkin();
        SKIN_PART_ORDER.forEach((p) => { if (!skin[p]) skin[p] = defSkin[p].slice(); });
        return skin;
    } catch (e) { return null; }
}
let currentSkin = null;
let draftSkin = null;
let skinEditorOpen = false;
let skinEditorPart = 'head';
let skinEditorSide = 'front'; // 'front', 'back' ya 'side' — grid kis taraf ka dikha raha hai
function skinGridPart() { return skinEditorSide === 'back' ? skinEditorPart + 'B' : (skinEditorSide === 'side' ? skinEditorPart + 'S' : skinEditorPart); }
function skinFrontPart(p) { const s = String(p || ''); return (s.endsWith('B') || s.endsWith('S')) ? s.slice(0, -1) : s; }
let skinEditorColor = '#ff0000';
let skinEraser = false;
try {
    const baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
    const savedRaw = localStorage.getItem(SKIN_CODE_KEY);
    currentSkin = (savedRaw ? decodeSkinCode(savedRaw) : null) || baked;
} catch (e) { currentSkin = null; }

// 🎨 SKIN HAR ACCOUNT KE LIYE ALAG — har Google account / guest naam ki
// apni skin hoti hai, sab ke pas ek hi skin nahi. Pehle skin ek hi key
// (pointerx_skin_v1) me save hoti thi, is liye jo bhi login karta tha
// usko wahi skin milti thi. Ab har account ki apni key hai:
// Google -> 'pointerx_skin_g_<uid>', guest -> 'pointerx_skin_guest_<naam>'.
let skinAccountId = '';
function skinCodeKey() { return skinAccountId ? ('pointerx_skin_' + skinAccountId) : SKIN_CODE_KEY; }
function skinDraftKey() { return skinAccountId ? ('pointerx_skin_draft_' + skinAccountId) : SKIN_DRAFT_KEY; }
function setSkinAccount(id) {
    const nid = String(id || '').trim();
    if (!nid || nid === skinAccountId) return;
    skinAccountId = nid;
    // Is account ki skin load karo. Agar is account ki koi skin nahi hai
    // to purani shared key (pointerx_skin_v1) se ek dafa migrate karo
    // (pehle wali skin bach jaye), warna baked default (Alex).
    try {
        const baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
        let raw = localStorage.getItem(skinCodeKey());
        if (!raw) {
            const legacy = localStorage.getItem(SKIN_CODE_KEY);
            if (legacy) { raw = legacy; try { localStorage.setItem(skinCodeKey(), legacy); } catch (e) {} }
        }
        currentSkin = (raw ? decodeSkinCode(raw) : null) || baked;
    } catch (e) { currentSkin = null; }
    draftSkin = null;
    try { applySkinToAll(); } catch (e) {}
}

// Har skin pixel = 4x4 canvas pixel — taake editor me grid lines (boxes)
// ke liye jagah ho aur pixels crisp rahen.
const SKIN_TEX_SCALE = 4;
function skinGridCanvas(grid, w, h, sx, sy, sw, sh, withGrid) {
    const c = document.createElement('canvas');
    c.width = sw * SKIN_TEX_SCALE; c.height = sh * SKIN_TEX_SCALE;
    const ctx = c.getContext('2d');
    if (withGrid) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, c.width, c.height); }
    const cell = withGrid ? SKIN_TEX_SCALE - 1 : SKIN_TEX_SCALE;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        ctx.fillStyle = grid[(sy + y) * w + (sx + x)] || '#ff00ff';
        ctx.fillRect(x * SKIN_TEX_SCALE, y * SKIN_TEX_SCALE, cell, cell);
    }
    return c;
}
function drawSkinFace(ctx) {
    // Aankhein + munh hamesha rehte hain (head ke front par, grid ke upar).
    const S = SKIN_TEX_SCALE;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(1 * S, 4 * S, 2 * S, 1 * S); ctx.fillRect(5 * S, 4 * S, 2 * S, 1 * S);
    ctx.fillStyle = '#3b3b9b'; ctx.fillRect(2 * S, 4 * S, 1 * S, 1 * S); ctx.fillRect(5 * S, 4 * S, 1 * S, 1 * S);
    ctx.fillStyle = '#4a2511'; ctx.fillRect(3 * S, 5 * S, 2 * S, 2 * S);
}
function skinFaceCrops(w, h, dims) {
    // cw = side face ki chaudai (grid cells me), ch = top/bottom ki unchai.
    // Sides ka apna alag grid hai, isliye yahan koi centre/edge crop nahi hota.
    const cw = Math.max(1, Math.round(w * dims.d / dims.fw));
    const ch = Math.max(1, Math.round(h * dims.d / dims.fh));
    return { cw, ch };
}
function skinFaceMaterial(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return new THREE.MeshStandardMaterial({ map: t, transparent: true });
}
// Canvas ko left-right flip karo (ek nayi canvas wapas).
// Minecraft skin ka side hissa net ki tarah bana hota hai: side wale hisse
// ka front kinara Three.js ki +x face ki UV se ulta padta hai, is liye +x
// (right) wali side ko flip karna padta hai. -x (left) wali side ki UV
// pehle se ulti hoti hai, is liye wo bina flip ke theek dikhti hai.
function flipCanvasH(canvas) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    return c;
}
// Steve ka default face (aankhein/munh) sirf tab banao jab head ka front
// waqai default Steve ho. Alex jaisi skin ka apna face grid me hi hota hai,
// us par Steve ki aankhein lagana face bigaad deta hai.
function isDefaultSteveHead(sub) {
    if (!sub || sub.length !== 64) return false;
    const def = defaultSkin().head;
    for (let i = 0; i < 64; i++) {
        if (String(sub[i]).toLowerCase() !== String(def[i]).toLowerCase()) return false;
    }
    return true;
}
// Baalon ka puff (outer layer) — hata diya gaya (Jimmy: 'out layer hata do ab').
function skinMeshMaterials(sub, backSub, sideSub, w, h, dims, isHead, withGrid) {
    const { cw, ch } = skinFaceCrops(w, h, dims);
    const front = skinGridCanvas(sub, w, h, 0, 0, w, h, withGrid);
    if (isHead && isDefaultSteveHead(sub)) drawSkinFace(front.getContext('2d'));
    const back = skinGridCanvas(backSub || sub, w, h, 0, 0, w, h, withGrid);
    const sideC = skinGridCanvas(sideSub || sub, cw, h, 0, 0, cw, h, withGrid);
    const right = flipCanvasH(sideC);
    const left = sideC;
    // Head ke top/bottom par face nahi hona chahiye — front grid me face hai.
    // Top/bottom par backside wala orange (baal) lagao.
    const topGrid = isHead ? (backSub || sub) : sub;
    const top = skinGridCanvas(topGrid, w, h, 0, 0, w, ch, withGrid);
    const bottom = skinGridCanvas(topGrid, w, h, 0, h - ch, w, ch, withGrid);
    // BoxGeometry order: +x, -x, +y, -y, +z, -z
    return [skinFaceMaterial(right), skinFaceMaterial(left), skinFaceMaterial(top), skinFaceMaterial(bottom), skinFaceMaterial(front), skinFaceMaterial(back)];
}
function applySkinToCharacter(steveObj, skin, withGrid) {
    if (!steveObj || !skin) return;
    const list = [
        { mesh: steveObj.head, part: 'head', backPart: 'headB', sidePart: 'headS', grid: skin.head, w: 8, h: 8, dims: { fw: 0.5, fh: 0.5, d: 0.5 }, head: true },
        { mesh: steveObj.body, part: 'body', backPart: 'bodyB', sidePart: 'bodyS', grid: skin.body, w: 8, h: 10, dims: { fw: 0.5, fh: 0.75, d: 0.25 } },
        { mesh: steveObj.leftArmUpper, part: 'armL', backPart: 'armLB', sidePart: 'armLS', grid: skin.armL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftArmLower, part: 'armL', backPart: 'armLB', sidePart: 'armLS', grid: skin.armL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmUpper, part: 'armR', backPart: 'armRB', sidePart: 'armRS', grid: skin.armR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightArmLower, part: 'armR', backPart: 'armRB', sidePart: 'armRS', grid: skin.armR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftThigh, part: 'legL', backPart: 'legLB', sidePart: 'legLS', grid: skin.legL, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.leftShin, part: 'legL', backPart: 'legLB', sidePart: 'legLS', grid: skin.legL, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightThigh, part: 'legR', backPart: 'legRB', sidePart: 'legRS', grid: skin.legR, w: 4, h: 10, y0: 0, y1: 5, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
        { mesh: steveObj.rightShin, part: 'legR', backPart: 'legRB', sidePart: 'legRS', grid: skin.legR, w: 4, h: 10, y0: 5, y1: 10, dims: { fw: 0.25, fh: 0.375, d: 0.25 } },
    ];
    list.forEach((m) => {
        if (!m.mesh || !m.grid) return;
        if (!m.mesh.userData._origMat) m.mesh.userData._origMat = m.mesh.material;
        const sub = (m.y0 !== undefined) ? m.grid.slice(m.y0 * m.w, m.y1 * m.w) : m.grid;
        const sh = (m.y1 !== undefined) ? (m.y1 - m.y0) : m.h;
        const crops = skinFaceCrops(m.w, sh, m.dims);
        const backGrid = skin[m.backPart] || m.grid;
        const backSub = (m.y0 !== undefined) ? backGrid.slice(m.y0 * m.w, m.y1 * m.w) : backGrid;
        const sideGrid = skin[m.sidePart] || m.grid;
        const sideSub = (m.y0 !== undefined) ? sideGrid.slice(m.y0 * crops.cw, m.y1 * crops.cw) : sideGrid;
        m.mesh.userData._skinMap = { part: m.part, backPart: m.backPart, sidePart: m.sidePart, w: m.w, h: sh, y0: (m.y0 || 0), cw: crops.cw, ch: crops.ch };
        m.mesh.material = skinMeshMaterials(sub, backSub, sideSub, m.w, sh, m.dims, !!m.head, !!withGrid);
        if (Array.isArray(m.mesh.material)) m.mesh.material.forEach((mm) => { mm.needsUpdate = true; });
    });
}
function restoreSkinToCharacter(steveObj) {
    if (!steveObj) return;
    [steveObj.head, steveObj.body, steveObj.leftArmUpper, steveObj.leftArmLower, steveObj.rightArmUpper, steveObj.rightArmLower, steveObj.leftThigh, steveObj.leftShin, steveObj.rightThigh, steveObj.rightShin].forEach((mesh) => {
        if (mesh && mesh.userData._origMat) {
            mesh.material = mesh.userData._origMat;
            delete mesh.userData._skinMap;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mm) => { if (mm) mm.needsUpdate = true; });
        }
    });
}
function applySkinToAll() {
    if (typeof lobbySteveParts !== 'undefined' && lobbySteveParts) {
        if (currentSkin) applySkinToCharacter(lobbySteveParts, currentSkin);
        else restoreSkinToCharacter(lobbySteveParts);
    }
    if (typeof otherPlayers !== 'undefined' && otherPlayers) {
        Object.values(otherPlayers).forEach((p) => {
            // Har player ki APNI skin — apni (currentSkin) nahi. p.skin
            // undefined hai to is player ki skin kabhi aayi nahi (purana
            // server/client), usko chhedo mat (purana behaviour).
            if (p && p.parts && p.skin !== undefined) {
                if (p.skin) applySkinToCharacter(p.parts, p.skin);
                else restoreSkinToCharacter(p.parts);
            }
        });
    }
}

// 🎨 Apni skin server ko bhejo, taake doosre players ko tumhari skin
// dikhe (aur tumko unki). Join par aur jab bhi skin badle, call karo.
// NOTE: socket.connected check HATA diya — socket.io disconnect par
// emit ko buffer karke connect hote hi bhej deta hai. Pehle ye check
// skin ko rok deta tha: EXIT ke baad socket disconnect hota hai, aur
// PLAY par connect() async hota hai, to equip/join par skin kabhi
// server tak pahunchti hi nahi thi (game me show nahi hoti thi).
function sendMySkinToServer() {
    try {
        if (!socket || typeof socket.emit !== 'function') return;
        const code = currentSkin ? encodeSkinCode(currentSkin) : '';
        socket.emit('setPlayerSkin', code);
    } catch (e) {}
}

// Ek doosre player par uski apni skin lagao (server se aaya hua code).
// code khaali ('') hai to original Steve (koi skin nahi). code undefined
// hai to purana server/client hai — apni skin hi rehne do.
function applyPlayerSkin(p, code) {
    if (!p || !p.parts) return;
    if (typeof code === 'string' && code) {
        const skin = decodeSkinCode(code);
        if (skin) { p.skin = skin; p.skinCode = code; applySkinToCharacter(p.parts, skin); return; }
    }
    if (code === '') {
        p.skin = null; p.skinCode = '';
        restoreSkinToCharacter(p.parts);
        return;
    }
}

function updatePartProperty(partName, prop, valStr) {
    let v = parseFloat(valStr);
    if (isNaN(v)) return;
    lobbyCustomParts[partName][prop] = v;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(v));
        }
    } catch (e) {}
    applyCustomTransformsToParts(lobbySteveParts);
    applyLobbyCrouchPose();
    const valEl = document.getElementById(`val-${partName}-${prop}`);
    if (valEl) valEl.textContent = v.toFixed(2);
}

function setLobbyPlayerSize(size) {
    let v = parseFloat(size);
    if (isNaN(v)) return;
    v = Math.min(1, Math.max(0.3, v));
    lobbyPlayerSize = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_player_size', String(v)); } catch (e) {}
    if (lobbyCharacter) setPlayerScale(lobbyCharacter, v);
    if (lobbyPlatform) lobbyPlatform.scale.set((v / 0.5) * lobbyShadowScale, (v / 0.5) * lobbyShadowScale, 1);
    const val = document.getElementById('lobby-size-value');
    if (val) val.textContent = v.toFixed(2);
}

function setLobbyPlayerRotate(deg) {
    let v = parseFloat(deg);
    if (isNaN(v)) return;
    v = Math.min(180, Math.max(-180, v));
    lobbyPlayerRotate = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_player_rotate', String(v)); } catch (e) {}
    if (lobbyCharacter) lobbyCharacter.rotation.y = v * Math.PI / 180;
    const val = document.getElementById('lobby-rotate-value');
    if (val) val.textContent = v.toFixed(0) + '°';
    const sl = document.getElementById('lobby-rotate-slider');
    if (sl) sl.value = String(v);
}

function setLobbyShadowScale(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.3, v));
    lobbyShadowScale = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_shadow_scale', String(v)); } catch (e) {}
    if (lobbyPlatform) lobbyPlatform.scale.set((lobbyPlayerSize / 0.5) * v, (lobbyPlayerSize / 0.5) * v, 1);
    const val = document.getElementById('lobby-shadow-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-shadow-slider');
    if (sl) sl.value = String(v);
}

function applyLobbyGunTransform() {
    if (!lobbyGunGroup) return;
    lobbyGunGroup.position.set(lobbyGunX, lobbyGunY, lobbyGunZ);
    lobbyGunGroup.scale.set(lobbyGunScale, lobbyGunScale, lobbyGunScale);
}

function setLobbyGunX(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(0.6, Math.max(-0.6, v));
    lobbyGunX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_x', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-x-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-x-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunY(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(1.35, Math.max(0.6, v));
    lobbyGunY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_y', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-y-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-y-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunScale(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.5, v));
    lobbyGunScale = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_scale', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-size-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-size-slider');
    if (sl) sl.value = String(v);
}

function setLobbyGunZ(vIn) {
    let v = parseFloat(vIn);
    if (isNaN(v)) return;
    v = Math.min(1, Math.max(0.3, v));
    lobbyGunZ = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_lobby_gun_z', String(v)); } catch (e) {}
    applyLobbyGunTransform();
    const val = document.getElementById('lobby-gun-z-value');
    if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-gun-z-slider');
    if (sl) sl.value = String(v);
}

function resetLobbyGun() {
    // RESET ab Jimmy ki baked look par le jata hai, purane factory pose par nahi.
    setLobbyGunX(0);
    setLobbyGunY(1.15);
    setLobbyGunZ(0.62);
    setLobbyGunScale(0.95);
}

// ---- Crouch pose (bethne ki position): Jimmy khud banata hai ----
// Sliders lobby me hain, SIT PREVIEW se lobby character beth kar dikhata
// hai, aur yehi values game me Shift wale crouch ki pose banti hain.
function setCrouchHip(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1.2, Math.max(0, v)); crouchHip = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_hip', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-hip-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-hip-slider'); if (sl) sl.value = String(v);
}
function setCrouchKnee(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0, v)); crouchKnee = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_knee', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-knee-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-knee-slider'); if (sl) sl.value = String(v);
}
function setCrouchDrop(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(0.3, Math.max(0, v)); crouchDrop = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_drop', String(v)); } catch (e) {}
    applyLobbyCrouchPose();
    const val = document.getElementById('lobby-crouch-drop-value'); if (val) val.textContent = v.toFixed(2);
    const sl = document.getElementById('lobby-crouch-drop-slider'); if (sl) sl.value = String(v);
}
function resetCrouchPose() {
    setCrouchHip(0.6);
    setCrouchKnee(1.6);
    setCrouchDrop(0.23);
}
function setLobbyCrouchPreview(on) {
    lobbyCrouchPreview = !!on;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_crouch_preview', lobbyCrouchPreview ? '1' : '0'); } catch (e) {}
    applyLobbyCrouchPose();
    const btn = document.getElementById('lobby-crouch-preview-btn');
    if (btn) btn.textContent = lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)';
}
function applyLobbyCrouchPose() {
    if (!lobbyCharacter || !lobbySteveParts) return;
    const baseLegL = (lobbyCustomParts.leftLeg) ? lobbyCustomParts.leftLeg.rotX : 0;
    const baseLegR = (lobbyCustomParts.rightLeg) ? lobbyCustomParts.rightLeg.rotX : 0;
    const baseKneeL = (lobbyCustomParts.leftKnee) ? lobbyCustomParts.leftKnee.rotX : 0;
    const baseKneeR = (lobbyCustomParts.rightKnee) ? lobbyCustomParts.rightKnee.rotX : 0;
    if (lobbyCrouchPreview) {
        // Betha hua: thigh aage, knee bend, poora group neeche — pair
        // zameen par rehte hain kyunki drop bend ke barabar hai. Knee
        // bend quaternion se lagta hai taake shin peeche jaye, side me nahi.
        lobbySteveParts.leftLeg.rotation.set(baseLegL - crouchHip, lobbyCustomParts.leftLeg.rotY, -0.08);
        lobbySteveParts.rightLeg.rotation.set(baseLegR - crouchHip, lobbyCustomParts.rightLeg.rotY, 0.08);
        applyKneeBend(lobbySteveParts.leftKneeMesh, lobbySteveParts.leftLeg.rotation, lobbyCustomParts.leftKnee, crouchKnee);
        applyKneeBend(lobbySteveParts.rightKneeMesh, lobbySteveParts.rightLeg.rotation, lobbyCustomParts.rightKnee, crouchKnee);
        lobbyCharacter.position.y = -crouchDrop * lobbyPlayerSize * PLAYER_HEIGHT_RATIO;
    } else {
        // Khara hua: lobby ki normal pose wapas.
        lobbySteveParts.leftLeg.rotation.set(0, 0, -0.08);
        lobbySteveParts.rightLeg.rotation.set(0, 0, 0.08);
        lobbySteveParts.leftKneeMesh.rotation.set(baseKneeL, lobbyCustomParts.leftKnee.rotY, lobbyCustomParts.leftKnee.rotZ);
        lobbySteveParts.rightKneeMesh.rotation.set(baseKneeR, lobbyCustomParts.rightKnee.rotY, lobbyCustomParts.rightKnee.rotZ);
        lobbyCharacter.position.y = 0;
    }
}

// ---- In-game gun editor: doosre player ki gun par click (crosshair) ya G ----
function applyInGameGunTransform() {
    inGameGunGroups.forEach((g) => {
        if (!g) return;
        const arm = g.userData.armGroup;
        const pm = g.userData.playerMesh;
        if (arm && pm) {
            // Gun haath se pinned hai — editor values character space me
            // hain, is liye pehle playerMesh par wapas lao, values lagao,
            // phir haath se dobara jodo (world pose wahi rehti hai).
            pm.attach(g);
            g.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
            g.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
            arm.attach(g);
        } else {
            g.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
            g.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
        }
    });
}

function syncInGameGunEditor() {
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setSlider = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    setVal('ig-gun-rotX-value', inGameGunRotX.toFixed(0) + '°'); setSlider('ig-gun-rotX-slider', inGameGunRotX);
    setVal('ig-gun-rotY-value', inGameGunRotY.toFixed(0) + '°'); setSlider('ig-gun-rotY-slider', inGameGunRotY);
    setVal('ig-gun-posX-value', inGameGunPosX.toFixed(2)); setSlider('ig-gun-posX-slider', inGameGunPosX);
    setVal('ig-gun-posY-value', inGameGunPosY.toFixed(2)); setSlider('ig-gun-posY-slider', inGameGunPosY);
    setVal('ig-gun-posZ-value', inGameGunPosZ.toFixed(2)); setSlider('ig-gun-posZ-slider', inGameGunPosZ);
}

function setInGameGunRotX(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(60, Math.max(-60, v)); inGameGunRotX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_rotX', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunRotY(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(60, Math.max(-60, v)); inGameGunRotY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_rotY', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosX(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1, Math.max(-1, v)); inGameGunPosX = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posX', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosY(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.6, v)); inGameGunPosY = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posY', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function setInGameGunPosZ(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(1, Math.max(-0.5, v)); inGameGunPosZ = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_gun_posZ', String(v)); } catch (e) {}
    applyInGameGunTransform(); syncInGameGunEditor();
}

function resetInGameGun() {
    setInGameGunRotX(5); setInGameGunRotY(0); setInGameGunPosX(-0.1); setInGameGunPosY(1.65); setInGameGunPosZ(0.4);
}

function applyInGamePlayerTransform() {
    Object.values(otherPlayers).forEach((pl) => {
        if (!pl.mesh) return;
        setPlayerScale(pl.mesh, inGamePlayerSize);
        pl.mesh.rotation.y = (pl.lastYaw || 0) + Math.PI + inGamePlayerRotate * Math.PI / 180;
    });
}

function syncInGamePlayerEditor() {
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setSlider = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    setVal('ig-player-size-value', inGamePlayerSize.toFixed(2)); setSlider('ig-player-size-slider', inGamePlayerSize);
    setVal('ig-player-rotate-value', inGamePlayerRotate.toFixed(0) + '°'); setSlider('ig-player-rotate-slider', inGamePlayerRotate);
}

function setInGamePlayerSize(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(2, Math.max(0.3, v)); inGamePlayerSize = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_player_size', String(v)); } catch (e) {}
    applyInGamePlayerTransform(); syncInGamePlayerEditor();
}

function setInGamePlayerRotate(vIn) {
    let v = parseFloat(vIn); if (isNaN(v)) return;
    v = Math.min(180, Math.max(-180, v)); inGamePlayerRotate = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pointerx_ingame_player_rotate', String(v)); } catch (e) {}
    applyInGamePlayerTransform(); syncInGamePlayerEditor();
}

function resetInGamePlayer() {
    setInGamePlayerSize(1); setInGamePlayerRotate(0);
}

function updateInGamePartProperty(partName, prop, valStr) {
    let v = parseFloat(valStr); if (isNaN(v)) return;
    lobbyCustomParts[partName][prop] = v;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(v)); } catch (e) {}
    applyCustomTransformsToParts(lobbySteveParts);
    Object.values(otherPlayers).forEach((pl) => { if (pl.parts) applyCustomTransformsToParts(pl.parts); });
    const valEl = document.getElementById(`ig-val-${partName}-${prop}`);
    if (valEl) valEl.textContent = v.toFixed(2);
}

function resetInGameParts() {
    partNames.forEach((partName) => {
        ['scale', 'rotX', 'rotY', 'rotZ', 'posX', 'posY', 'posZ'].forEach((prop) => {
            const baked = DEFAULT_LOOK_CUSTOM_PARTS[partName] && DEFAULT_LOOK_CUSTOM_PARTS[partName][prop] !== undefined
                ? DEFAULT_LOOK_CUSTOM_PARTS[partName][prop]
                : (prop === 'scale' ? 1 : 0);
            const def = baked;
            lobbyCustomParts[partName][prop] = def;
            try { if (typeof localStorage !== 'undefined') localStorage.setItem(`pointerx_custom_${partName}_${prop}`, String(def)); } catch (e) {}
        });
    });
    applyCustomTransformsToParts(lobbySteveParts);
    Object.values(otherPlayers).forEach((pl) => { if (pl.parts) applyCustomTransformsToParts(pl.parts); });
    syncInGamePartsEditor();
}

function syncInGamePartsEditor() {
    document.querySelectorAll('.ig-custom-part-input').forEach((input) => {
        const partName = input.dataset.part;
        const prop = input.dataset.prop;
        if (lobbyCustomParts[partName] && lobbyCustomParts[partName][prop] !== undefined) {
            input.value = String(lobbyCustomParts[partName][prop]);
            const valEl = document.getElementById(`ig-val-${partName}-${prop}`);
            if (valEl) valEl.textContent = lobbyCustomParts[partName][prop].toFixed(2);
        }
    });
}

function buildInGamePartsHtml() {
    const partLabels = { head: 'HEAD', body: 'BODY', leftArm: 'LEFT ARM', rightArm: 'RIGHT ARM', leftLeg: 'LEFT LEG', rightLeg: 'RIGHT LEG', leftElbow: 'LEFT ELBOW (BEND)', rightElbow: 'RIGHT ELBOW (BEND)', leftKnee: 'LEFT KNEE (BEND)', rightKnee: 'RIGHT KNEE (BEND)' };
    let html = '';
    partNames.forEach((pKey) => {
        const cfg = lobbyCustomParts[pKey];
        const isElbow = pKey === 'leftElbow' || pKey === 'rightElbow' || pKey === 'leftKnee' || pKey === 'rightKnee'; // joint: elbow ya knee, sirf RotX/RotY
        html += '<div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:6px; margin-top:8px;">';
        html += '<div style="font-size:12px; font-weight:bold; color:' + (isElbow ? '#ffaa00' : '#00ffcc') + '; margin-bottom:4px;">' + partLabels[pKey] + '</div>';
        if (!isElbow) {
            html += '<div style="font-size:10px; color:#aaa;">Scale: <span id="ig-val-' + pKey + '-scale">' + cfg.scale.toFixed(2) + '</span></div>';
            html += '<input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="scale" min="0.3" max="2.0" step="0.05" value="' + cfg.scale + '" style="width:100%; accent-color:#00ffcc;">';
        }
        html += '<div style="display:flex; gap:4px; margin-top:4px;">';
        html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot X: <span id="ig-val-' + pKey + '-rotX">' + cfg.rotX.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotX" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotX + '" style="width:100%; accent-color:#ffaa00;"></div>';
        html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot Y: <span id="ig-val-' + pKey + '-rotY">' + cfg.rotY.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotY" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotY + '" style="width:100%; accent-color:#ffaa00;"></div>';
        html += '</div>';
        if (!isElbow) {
            html += '<div style="display:flex; gap:4px; margin-top:4px;">';
            html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Rot Z: <span id="ig-val-' + pKey + '-rotZ">' + cfg.rotZ.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="rotZ" min="-3.14" max="3.14" step="0.1" value="' + cfg.rotZ + '" style="width:100%; accent-color:#ffaa00;"></div>';
            html += '<div style="flex:1;"><div style="font-size:9px; color:#aaa;">Pos Y: <span id="ig-val-' + pKey + '-posY">' + cfg.posY.toFixed(2) + '</span></div><input type="range" class="ig-custom-part-input" data-part="' + pKey + '" data-prop="posY" min="-1.0" max="1.0" step="0.05" value="' + cfg.posY + '" style="width:100%; accent-color:#ff3333;"></div>';
            html += '</div>';
        }
        html += '</div>';
    });
    return html;
}

function closeInGameGunEditor() {
    isInGameGunEditing = false;
    const panel = document.getElementById('ingame-gun-editor');
    if (panel) panel.style.display = 'none';
}

function openInGameGunEditor() {
    // 🔒 Game me editor (G) sirf tab khule jab is naam se login/guest ho.
    // Warna G dabane par kuch nahi hoga, goli normal chalegi.
    if (!isModName(playerName)) return;
    isInGameGunEditing = true;
    let panel = document.getElementById('ingame-gun-editor');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'ingame-gun-editor';
        panel.style.cssText = 'position:fixed;top:70px;right:20px;width:300px;max-width:92vw;max-height:80vh;overflow-y:auto;background:rgba(0,0,0,0.92);border:2px solid #00d2ff;border-radius:12px;padding:14px;z-index:99999;color:white;font-family:monospace;';
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="font-weight:900;font-size:14px;color:#00d2ff;">IN-GAME PLAYER + GUN EDITOR</div>
                <button id="ig-gun-close" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
            </div>
            <div style="font-size:11px;color:#aaa;line-height:1.5;margin-bottom:10px;">Doosre players (jo game me dikhte hain) ke liye hai — gun bhi, player size/rotate aur parts bhi, bilkul lobby jaisa. Har change foran dikhega aur refresh ke baad bhi save rahega. YE PANEL SIRF G SE KHULTA HAI — bande par fire karne se ye nahi khulega, fire hamesha goli hi chalegi. Aur ye sirf FPS-3D(123) naam se login hone par khulta hai. Band karne ke baad Click to Start se wapas khelo.</div>
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00d2ff; text-align:left; margin-bottom:4px;">PLAYER SIZE / ROTATE (LOBBY JAISA)</div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">PLAYER SIZE: <span id="ig-player-size-value">1.00</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-player-size-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ SMALLER</button>
                    <button id="ig-player-size-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">BIGGER ▶</button>
                </div>
                <input type="range" id="ig-player-size-slider" min="0.3" max="2" step="0.05" value="1" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">PLAYER ROTATE: <span id="ig-player-rotate-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-player-rotate-left" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">◀ LEFT</button>
                    <button id="ig-player-rotate-right" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">RIGHT ▶</button>
                    <button id="ig-player-flip" style="flex:1;padding:6px;font-weight:bold;background:#ffaa00;color:#111;border:none;border-radius:4px;cursor:pointer;font-size:11px;">FLIP</button>
                </div>
                <input type="range" id="ig-player-rotate-slider" min="-180" max="180" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#ffc400; text-align:left; margin-bottom:4px;">ADVANCED PARTS (LOBBY JAISA)</div>
            ${buildInGamePartsHtml()}
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">ROTATE X: <span id="ig-gun-rotX-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-rotX-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ -5°</button>
                    <button id="ig-gun-rotX-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">+5° ▶</button>
                </div>
                <input type="range" id="ig-gun-rotX-slider" min="-60" max="60" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">ROTATE Y: <span id="ig-gun-rotY-value">0°</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-rotY-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ -5°</button>
                    <button id="ig-gun-rotY-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">+5° ▶</button>
                </div>
                <input type="range" id="ig-gun-rotY-slider" min="-60" max="60" step="5" value="0" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION X: <span id="ig-gun-posX-value">-0.44</span> <span style="color:#aaa;">(- = left, + = right)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posX-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ LEFT</button>
                    <button id="ig-gun-posX-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">RIGHT ▶</button>
                </div>
                <input type="range" id="ig-gun-posX-slider" min="-1" max="1" step="0.05" value="-0.44" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION Z: <span id="ig-gun-posZ-value">0.15</span> <span style="color:#aaa;">(aage / peeche — side view me left / right)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posZ-minus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">◀ BACK</button>
                    <button id="ig-gun-posZ-plus" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">FORWARD ▶</button>
                </div>
                <input type="range" id="ig-gun-posZ-slider" min="-0.5" max="1" step="0.05" value="0.15" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <div style="text-align:left;margin-top:8px;">
                <div style="font-size:11px;color:#00ffcc;">POSITION Y: <span id="ig-gun-posY-value">1.55</span> <span style="color:#aaa;">(up / down)</span></div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button id="ig-gun-posY-up" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">▲ UP</button>
                    <button id="ig-gun-posY-down" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;">▼ DOWN</button>
                </div>
                <input type="range" id="ig-gun-posY-slider" min="0.6" max="2" step="0.05" value="1.55" style="width:100%;accent-color:#00ffcc;cursor:pointer;margin-top:4px;">
            </div>
            <button id="ig-gun-reset" style="width:100%;padding:8px;margin-top:10px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET GUN</button>
            <button id="ig-player-reset" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET PLAYER (SIZE + ROTATE)</button>
            <button id="ig-parts-reset" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET PARTS</button>
            <button id="ig-gun-done" style="width:100%;padding:10px;margin-top:6px;font-weight:bold;background:#ffc400;color:#111;border:none;border-radius:6px;cursor:pointer;font-size:14px;">DONE</button>
        `;
        document.body.appendChild(panel);
        const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        const bindSlider = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => fn(el.value)); };
        bind('ig-gun-rotX-minus', () => setInGameGunRotX(inGameGunRotX - 5));
        bind('ig-gun-rotX-plus', () => setInGameGunRotX(inGameGunRotX + 5));
        bind('ig-gun-rotY-minus', () => setInGameGunRotY(inGameGunRotY - 5));
        bind('ig-gun-rotY-plus', () => setInGameGunRotY(inGameGunRotY + 5));
        bind('ig-gun-posX-minus', () => setInGameGunPosX(inGameGunPosX - 0.05));
        bind('ig-gun-posX-plus', () => setInGameGunPosX(inGameGunPosX + 0.05));
        bind('ig-gun-posZ-minus', () => setInGameGunPosZ(inGameGunPosZ - 0.05));
        bind('ig-gun-posZ-plus', () => setInGameGunPosZ(inGameGunPosZ + 0.05));
        bindSlider('ig-gun-posZ-slider', (v) => setInGameGunPosZ(v));
        bind('ig-gun-posY-up', () => setInGameGunPosY(inGameGunPosY + 0.05));
        bind('ig-gun-posY-down', () => setInGameGunPosY(inGameGunPosY - 0.05));
        bindSlider('ig-gun-rotX-slider', (v) => setInGameGunRotX(v));
        bindSlider('ig-gun-rotY-slider', (v) => setInGameGunRotY(v));
        bindSlider('ig-gun-posX-slider', (v) => setInGameGunPosX(v));
        bindSlider('ig-gun-posY-slider', (v) => setInGameGunPosY(v));
        bind('ig-gun-reset', () => resetInGameGun());
        bind('ig-player-reset', () => resetInGamePlayer());
        bind('ig-parts-reset', () => resetInGameParts());
        bind('ig-player-size-minus', () => setInGamePlayerSize(inGamePlayerSize - 0.05));
        bind('ig-player-size-plus', () => setInGamePlayerSize(inGamePlayerSize + 0.05));
        bindSlider('ig-player-size-slider', (v) => setInGamePlayerSize(v));
        bind('ig-player-rotate-left', () => setInGamePlayerRotate(inGamePlayerRotate - 15));
        bind('ig-player-rotate-right', () => setInGamePlayerRotate(inGamePlayerRotate + 15));
        bind('ig-player-flip', () => setInGamePlayerRotate(inGamePlayerRotate === 180 ? 0 : 180));
        bindSlider('ig-player-rotate-slider', (v) => setInGamePlayerRotate(v));
        document.querySelectorAll('.ig-custom-part-input').forEach((input) => {
            input.addEventListener('input', (e) => { updateInGamePartProperty(e.target.dataset.part, e.target.dataset.prop, e.target.value); });
        });
        bind('ig-gun-close', () => closeInGameGunEditor());
        bind('ig-gun-done', () => closeInGameGunEditor());
    }
    syncInGameGunEditor();
    syncInGamePlayerEditor();
    syncInGamePartsEditor();
    panel.style.display = 'block';
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
}

function lobbyToast(msg) {
    const t = document.getElementById('lobby-toast');
    if (t) t.textContent = msg;
}

// 🔒 Modification options sirf is naam ke liye (login ho ya guest login):
// naam bilkul "FPS-3D(123)" hona chahiye, warna options chhupenge.
const MOD_ONLY_NAME = 'FPS-3D(123)';
function isModName(name) { return String(name || '').trim() === MOD_ONLY_NAME; }
function currentLobbyName() {
    const guestInput = document.getElementById('player-name-input');
    if (guestInput) return guestInput.value;
    const googleInput = document.getElementById('google-custom-name');
    if (googleInput) return googleInput.value;
    return (typeof playerName !== 'undefined') ? playerName : '';
}
function applyLobbyModVisibility() {
    const show = isModName(currentLobbyName());
    const wrap = document.getElementById('lobby-mod-sections');
    if (wrap) wrap.style.display = show ? 'block' : 'none';
    // SKINS har player ke liye hai (sirf FPS-3D(123) ke liye nahi) — button
    // hamesha dikhega, aur editor naam badalne par band nahi hoga.
    const skinsBtn = document.querySelector('.lobby-menu-btn[data-menu="SKINS"]');
    if (skinsBtn) skinsBtn.style.display = '';
}

function buildLobbyHTML(opts) {
    const name = opts.defaultName || 'ANYMAYS';
    const emailLine = opts.email ? `<div style="font-size:12px;color:#aaa;margin-bottom:10px;">Logged in as: ${opts.email}</div>` : '';
    const googleTop = opts.mode === 'guest'
        ? `<button id="google-login-btn" style="width:100%;padding:10px;font-size:14px;font-weight:bold;background:#4285F4;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:10px;">Continue with Google</button>`
        : `<button id="prompt-logout-btn" style="width:100%;padding:8px;font-size:12px;background:#ff3333;color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">LOG OUT</button>`;
    const nameInput = opts.mode === 'guest'
        ? `<input type="text" id="player-name-input" placeholder="Enter your name..." value="${name}" style="width:100%;box-sizing:border-box;padding:10px;font-size:14px;text-align:center;background:#111;color:white;border:1px solid #444;border-radius:6px;outline:none;">`
        : `<input type="text" id="google-custom-name" value="${name}" style="width:100%;box-sizing:border-box;padding:10px;font-size:14px;text-align:center;background:#111;color:white;border:1px solid #444;border-radius:6px;outline:none;">`;
    const playBtn = opts.mode === 'guest'
        ? `<button id="join-btn" style="width:100%;padding:14px;font-size:24px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 0 #b88600;margin-top:10px;">PLAY</button>`
        : `<button id="start-google-game" style="width:100%;padding:14px;font-size:24px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 0 #b88600;margin-top:10px;">PLAY</button>`;
    
    const menu = ['HUB','STORE','SERVERS','QUESTS','FRIENDS','INVENTORY','EDITOR','SKINS'].map((m) => {
        const active = m === 'HUB' ? 'background:#2a6cff;color:white;' : 'background:transparent;color:#cdd6ff;';
        return `<button class="lobby-menu-btn" data-menu="${m}" style="width:100%;padding:10px;text-align:left;font-weight:bold;border:none;border-radius:6px;cursor:pointer;${active}">${m}</button>`;
    }).join('');

    const partLabels = { 
        head: 'HEAD', 
        body: 'BODY', 
        leftArm: 'LEFT ARM', 
        rightArm: 'RIGHT ARM', 
        leftLeg: 'LEFT LEG', 
        rightLeg: 'RIGHT LEG',
        leftElbow: 'LEFT ELBOW (BEND)',
        rightElbow: 'RIGHT ELBOW (BEND)',
        leftKnee: 'LEFT KNEE (BEND)',
        rightKnee: 'RIGHT KNEE (BEND)'
    };
    
    let advancedPartsHtml = '';
    partNames.forEach(pKey => {
        const cfg = lobbyCustomParts[pKey];
        const isElbow = pKey === 'leftElbow' || pKey === 'rightElbow' || pKey === 'leftKnee' || pKey === 'rightKnee'; // joint: elbow ya knee, sirf RotX/RotY
        
        advancedPartsHtml += `
            <div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:6px; margin-top:8px;">
                <div style="font-size:12px; font-weight:bold; color:${isElbow ? '#ffaa00' : '#00ffcc'}; margin-bottom:4px;">${partLabels[pKey]}</div>
                
                ${!isElbow ? `
                <div style="font-size:10px; color:#aaa;">Scale: <span id="val-${pKey}-scale">${cfg.scale.toFixed(2)}</span></div>
                <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="scale" min="0.3" max="2.0" step="0.05" value="${cfg.scale}" style="width:100%; accent-color:#00ffcc;">
                ` : ''}

                <div style="display:flex; gap:4px; margin-top:4px;">
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot X: <span id="val-${pKey}-rotX">${cfg.rotX.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotX" min="-3.14" max="3.14" step="0.1" value="${cfg.rotX}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot Y: <span id="val-${pKey}-rotY">${cfg.rotY.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotY" min="-3.14" max="3.14" step="0.1" value="${cfg.rotY}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                </div>

                ${!isElbow ? `
                <div style="display:flex; gap:4px; margin-top:4px;">
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Rot Z: <span id="val-${pKey}-rotZ">${cfg.rotZ.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="rotZ" min="-3.14" max="3.14" step="0.1" value="${cfg.rotZ}" style="width:100%; accent-color:#ffaa00;">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:9px; color:#aaa;">Pos Y: <span id="val-${pKey}-posY">${cfg.posY.toFixed(2)}</span></div>
                        <input type="range" class="custom-part-input" data-part="${pKey}" data-prop="posY" min="-1.0" max="1.0" step="0.05" value="${cfg.posY}" style="width:100%; accent-color:#ff3333;">
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });

    return `
    <div style="position:absolute;top:18px;left:50%;transform:translateX(-50%);font-size:42px;font-weight:900;letter-spacing:2px;color:white;text-shadow:3px 3px #000;z-index:2;pointer-events:none;">POINTER <span style="color:#00ffcc;">X</span></div>
    
    <div style="position:absolute;left:0;top:0;bottom:0;width:170px;background:rgba(10,20,70,0.98);padding:16px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;z-index:3;">
        <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:8px;">
          <div style="font-size:18px;font-weight:bold;word-break:break-word;">${name}</div>
          <div style="font-size:12px;color:#00ffcc;">POINTER X PLAYER</div>
          ${emailLine}
        </div>
        ${menu}
        ${opts.mode === 'google' ? googleTop : ''}
    </div>

    <!-- 🌟 Draggable & Minimizable Anyways Panel -->
    <div id="lobby-card" style="position:absolute; left: calc(50% - 170px); bottom: 20px; background:rgba(0,0,0,0.92); border: 2px solid #222; border-radius:12px; width:340px; max-width:92vw; z-index:10; box-shadow: 0 10px 25px rgba(0,0,0,0.7);">
        
        <div id="lobby-header" style="padding: 12px 16px; background: #111; border-top-left-radius: 10px; border-top-right-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
            <div style="font-size: 18px; font-weight: 900; color: #fff; letter-spacing: 1px;">ANYMAYS</div>
            <button id="lobby-minimize-btn" style="background: #222; color: #fff; border: 1px solid #444; width: 28px; height: 28px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Minimize / Expand">-</button>
        </div>

        <div id="lobby-body" style="padding: 16px; max-height: calc(85vh - 55px); overflow-y: auto; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #00ffcc;">${name}</div>
            ${opts.mode === 'guest' ? googleTop : ''}
            ${nameInput}

            <div id="lobby-mod-sections">
            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00d2ff; text-align:left; margin-bottom:4px;">GUN EDITOR (LEFT / RIGHT / UP / DOWN / SIZE)</div>
            <div style="text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN LEFT / RIGHT: <span id="lobby-gun-x-value">${lobbyGunX.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(- = left, + = right)</span></div>
              <input type="range" id="lobby-gun-x-slider" min="-0.6" max="0.6" step="0.05" value="${lobbyGunX}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN UP / DOWN: <span id="lobby-gun-y-value">${lobbyGunY.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(kam = neeche, zyada = upar)</span></div>
              <input type="range" id="lobby-gun-y-slider" min="0.6" max="1.35" step="0.05" value="${lobbyGunY}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN Z POS: <span id="lobby-gun-z-value">${lobbyGunZ.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(kam = peeche, zyada = camera ki taraf)</span></div>
              <input type="range" id="lobby-gun-z-slider" min="0.3" max="1" step="0.05" value="${lobbyGunZ}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">GUN SIZE: <span id="lobby-gun-size-value">${lobbyGunScale.toFixed(2)}</span></div>
              <input type="range" id="lobby-gun-size-slider" min="0.5" max="2" step="0.05" value="${lobbyGunScale}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <button id="lobby-gun-reset" style="width:100%;padding:8px;margin-top:8px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET GUN</button>

            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#00ffcc; text-align:left; margin-bottom:4px;">CROUCH POSE (BETHNE KI POSITION)</div>
            <div style="font-size:11px;color:#aaa;text-align:left;margin-bottom:6px;">SIT PREVIEW dabao, phir sliders se bethne ki pose banao. Yehi pose game me Shift par lagegi.</div>
            <button id="lobby-crouch-preview-btn" style="width:100%;padding:8px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">${lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)'}</button>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">HIP BEND: <span id="lobby-crouch-hip-value">${crouchHip.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(thigh aage)</span></div>
              <input type="range" id="lobby-crouch-hip-slider" min="0" max="1.2" step="0.05" value="${crouchHip}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">KNEE BEND: <span id="lobby-crouch-knee-value">${crouchKnee.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(knee se neeche)</span></div>
              <input type="range" id="lobby-crouch-knee-slider" min="0" max="2" step="0.05" value="${crouchKnee}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <div style="margin-top:8px; text-align:left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">BODY DROP: <span id="lobby-crouch-drop-value">${crouchDrop.toFixed(2)}</span> &nbsp;<span style="color:#aaa;">(neeche kitna — zyada = pair andar, kam = pair hawa me)</span></div>
              <input type="range" id="lobby-crouch-drop-slider" min="0" max="0.3" step="0.01" value="${crouchDrop}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>
            <button id="lobby-crouch-reset" style="width:100%;padding:8px;margin-top:8px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">RESET CROUCH POSE</button>
            
            <div style="margin-top:10px; text-align: left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">PLAYER SIZE: <span id="lobby-size-value">${lobbyPlayerSize.toFixed(2)}</span></div>
              <input type="range" id="lobby-size-slider" min="0.3" max="1" step="0.05" value="${lobbyPlayerSize}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
            </div>

            <div style="margin-top:8px; text-align: left;">
              <div style="font-size:11px;color:#00ffcc; margin-bottom: 2px;">PLAYER ROTATE: <span id="lobby-rotate-value">${lobbyPlayerRotate.toFixed(0)}°</span></div>
              <input type="range" id="lobby-rotate-slider" min="-180" max="180" step="5" value="${lobbyPlayerRotate}" style="width:100%;accent-color:#00ffcc;cursor:pointer;">
              <div style="display:flex;gap:6px;margin-top:6px;">
                <button id="lobby-rotate-left" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">◀ LEFT</button>
                <button id="lobby-rotate-right" style="flex:1;padding:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">RIGHT ▶</button>
                <button id="lobby-flip" style="flex:1;padding:6px;font-weight:bold;background:#ffaa00;color:#111;border:none;border-radius:4px;cursor:pointer;font-size:11px;">FLIP</button>
              </div>
            </div>


            <hr style="border:0; border-top:1px solid #333; margin:12px 0;">
            <div style="font-size:12px; font-weight:bold; color:#ffc400; text-align:left; margin-bottom:4px;">ADVANCED PARTS EDITOR (SCALE / ROT / POS & ELBOWS)</div>
            ${advancedPartsHtml}
            </div>

            <div id="lobby-toast" style="min-height:16px;font-size:12px;color:#00ffcc;margin-top:6px;"></div>
            ${playBtn}
        </div>
    </div>

    <div id="lobby-right-panel" style="position:absolute;right:0;top:0;bottom:0;width:260px;background:rgba(10,20,70,0.98);padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;z-index:3;">
        <div style="background:rgba(255,255,255,0.08);padding:12px;border-radius:8px;font-size:13px;line-height:1.6;">
          <b>HOW TO PLAY</b><br>W A S D - Move<br>Space - Jump / Bhop<br>Shift - Crouch, release + Space - Long Jump<br>E - Dash<br>T - Chat<br>Right Click - Zoom Scope
        </div>
        <button class="lobby-side-btn" style="width:100%;padding:12px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;">PRIVATE</button>
        <button class="lobby-side-btn" style="width:100%;padding:12px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;">JOIN</button>
        <button class="lobby-side-btn" style="width:100%;padding:12px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;">PLAY SETTINGS</button>
    </div>`;
}

function setupLobbyMenus() {
    const card = document.getElementById('lobby-card');
    const header = document.getElementById('lobby-header');
    const minimizeBtn = document.getElementById('lobby-minimize-btn');
    const bodyContent = document.getElementById('lobby-body');

    // 🔒 Mod sections sirf FPS-3D(123) naam par dikhen — naam type karte
    // hi live update, aur lobby khulte hi pehli baar bhi apply ho.
    const _guestNameInput = document.getElementById('player-name-input');
    if (_guestNameInput) _guestNameInput.addEventListener('input', applyLobbyModVisibility);
    const _googleNameInput = document.getElementById('google-custom-name');
    if (_googleNameInput) _googleNameInput.addEventListener('input', applyLobbyModVisibility);
    applyLobbyModVisibility();

    document.querySelectorAll('.lobby-menu-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const m = btn.dataset.menu;
            if (m === 'SKINS') { openSkinEditor(); return; }
            if (m === 'INVENTORY') { openInventory(); return; }
            if (skinEditorOpen) closeSkinEditor();
            if (inventoryOpen) closeInventory();
            lobbyToast(m + ' — Coming soon');
        });
    });

    if (card && header) {
        let isDragging = false;
        let startX = 0, startY = 0;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - card.offsetLeft;
            startY = e.clientY - card.offsetTop;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = e.clientX - startX;
            let newY = e.clientY - startY;

            newX = Math.max(0, Math.min(window.innerWidth - card.offsetWidth, newX));
            newY = Math.max(0, Math.min(window.innerHeight - header.offsetHeight, newY));

            card.style.left = newX + 'px';
            card.style.top = newY + 'px';
            card.style.bottom = 'auto';
            card.style.transform = 'none';
        });

        window.addEventListener('mouseup', () => { isDragging = false; });

        header.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - card.offsetLeft;
            startY = touch.clientY - card.offsetTop;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            let newX = touch.clientX - startX;
            let newY = touch.clientY - startY;
            card.style.left = newX + 'px';
            card.style.top = newY + 'px';
            card.style.bottom = 'auto';
            card.style.transform = 'none';
        }, { passive: true });

        window.addEventListener('touchend', () => { isDragging = false; });
    }

    if (minimizeBtn && bodyContent) {
        let isMinimized = false;
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            if (isMinimized) {
                bodyContent.style.display = 'none';
                minimizeBtn.textContent = '+';
            } else {
                bodyContent.style.display = 'block';
                minimizeBtn.textContent = '-';
            }
        });
    }

    document.querySelectorAll('.custom-part-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const partName = e.target.dataset.part;
            const prop = e.target.dataset.prop;
            updatePartProperty(partName, prop, e.target.value);
        });
    });

    const slider = document.getElementById('lobby-size-slider');
    if (slider) {
        slider.value = String(lobbyPlayerSize);
        slider.addEventListener('input', () => { setLobbyPlayerSize(slider.value); });
    }
    const rotSlider = document.getElementById('lobby-rotate-slider');
    if (rotSlider) {
        rotSlider.value = String(lobbyPlayerRotate);
        rotSlider.addEventListener('input', () => { setLobbyPlayerRotate(rotSlider.value); });
    }
    const rotLeft = document.getElementById('lobby-rotate-left');
    if (rotLeft) rotLeft.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate - 15); });
    const rotRight = document.getElementById('lobby-rotate-right');
    if (rotRight) rotRight.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate + 15); });
    const flipBtn = document.getElementById('lobby-flip');
    if (flipBtn) flipBtn.addEventListener('click', () => { setLobbyPlayerRotate(lobbyPlayerRotate === 180 ? 0 : 180); });
    const gunXSlider = document.getElementById('lobby-gun-x-slider');
    if (gunXSlider) {
        gunXSlider.value = String(lobbyGunX);
        gunXSlider.addEventListener('input', () => { setLobbyGunX(gunXSlider.value); });
    }
    const gunYSlider = document.getElementById('lobby-gun-y-slider');
    if (gunYSlider) {
        gunYSlider.value = String(lobbyGunY);
        gunYSlider.addEventListener('input', () => { setLobbyGunY(gunYSlider.value); });
    }
    const gunZSlider = document.getElementById('lobby-gun-z-slider');
    if (gunZSlider) {
        gunZSlider.value = String(lobbyGunZ);
        gunZSlider.addEventListener('input', () => { setLobbyGunZ(gunZSlider.value); });
    }
    const gunSizeSlider = document.getElementById('lobby-gun-size-slider');
    if (gunSizeSlider) {
        gunSizeSlider.value = String(lobbyGunScale);
        gunSizeSlider.addEventListener('input', () => { setLobbyGunScale(gunSizeSlider.value); });
    }
    const gunResetBtn = document.getElementById('lobby-gun-reset');
    if (gunResetBtn) gunResetBtn.addEventListener('click', () => { resetLobbyGun(); });
    const crouchHipSlider = document.getElementById('lobby-crouch-hip-slider');
    if (crouchHipSlider) {
        crouchHipSlider.value = String(crouchHip);
        crouchHipSlider.addEventListener('input', () => { setCrouchHip(crouchHipSlider.value); });
    }
    const crouchKneeSlider = document.getElementById('lobby-crouch-knee-slider');
    if (crouchKneeSlider) {
        crouchKneeSlider.value = String(crouchKnee);
        crouchKneeSlider.addEventListener('input', () => { setCrouchKnee(crouchKneeSlider.value); });
    }
    const crouchDropSlider = document.getElementById('lobby-crouch-drop-slider');
    if (crouchDropSlider) {
        crouchDropSlider.value = String(crouchDrop);
        crouchDropSlider.addEventListener('input', () => { setCrouchDrop(crouchDropSlider.value); });
    }
    const crouchResetBtn = document.getElementById('lobby-crouch-reset');
    if (crouchResetBtn) crouchResetBtn.addEventListener('click', () => { resetCrouchPose(); });
    const crouchPreviewBtn = document.getElementById('lobby-crouch-preview-btn');
    if (crouchPreviewBtn) {
        crouchPreviewBtn.textContent = lobbyCrouchPreview ? 'STAND UP (PREVIEW BAND KARO)' : 'SIT PREVIEW (BETH KE DEKHO)';
        crouchPreviewBtn.addEventListener('click', () => { setLobbyCrouchPreview(!lobbyCrouchPreview); });
    }
    applyLobbyCrouchPose();
}

// 🎨 SKIN EDITOR UI — T-pose preview + direct paint + palette + publish/code.
const SKIN_PALETTE = ['#c68642', '#e8b88a', '#8d5524', '#3b2416', '#6b4423', '#00a8b5', '#1a9e8f', '#3b449b', '#222222', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#00ffcc', '#ffc400', '#888888', '#4a2511'];

function restoreLobbyPose() {
    if (!lobbySteveParts) return;
    try {
        applyCustomTransformsToParts(lobbySteveParts);
        lobbySteveParts.leftArmGroup.rotation.set(-0.9, 0, 0.3);
        lobbySteveParts.rightArmGroup.rotation.set(-0.9, 0, -0.3);
        lobbySteveParts.leftLeg.rotation.set(0, 0, -0.08);
        lobbySteveParts.rightLeg.rotation.set(0, 0, 0.08);
        if (lobbyGunGroup) lobbyGunGroup.visible = true;
        applyLobbyGunTransform();
        applyLobbyCrouchPose();
    } catch (e) {}
}

function setSkinTPose(on) {
    if (!lobbySteveParts || !lobbyCharacter) return;
    try {
        if (on) {
            // T-pose: dono haath seedhe side par, taange seedhi, gun chhupa do.
            lobbySteveParts.leftArmGroup.rotation.set(0, 0, -Math.PI / 2);
            lobbySteveParts.rightArmGroup.rotation.set(0, 0, Math.PI / 2);
            lobbySteveParts.leftElbowMesh.rotation.set(0, 0, 0);
            lobbySteveParts.rightElbowMesh.rotation.set(0, 0, 0);
            lobbySteveParts.leftLeg.rotation.set(0, 0, -0.08);
            lobbySteveParts.rightLeg.rotation.set(0, 0, 0.08);
            lobbySteveParts.leftKneeMesh.rotation.set(0, 0, 0);
            lobbySteveParts.rightKneeMesh.rotation.set(0, 0, 0);
            lobbyCharacter.position.y = 0;
            if (lobbyGunGroup) lobbyGunGroup.visible = false;
        } else {
            restoreLobbyPose();
        }
    } catch (e) {}
}

function updateSkinColorPreview() {
    const pv = document.getElementById('skin-color-preview');
    if (pv) {
        pv.style.background = skinEraser ? '#111' : skinEditorColor;
        pv.textContent = skinEraser ? 'E' : '';
        pv.style.color = '#fff'; pv.style.textAlign = 'center'; pv.style.fontSize = '12px'; pv.style.lineHeight = '22px';
    }
    const eb = document.getElementById('skin-eraser-btn');
    if (eb) eb.style.background = skinEraser ? '#ff8800' : '#334155';
}

// 2D grid hata diya — sirf 3D character par paint hota hai. Ye sirf batata hai
// ke aakhri dafa kis part/face par paint hua (panel me "Last painted" line).
function updateSkinPartLabel() {
    const nameEl = document.getElementById('skin-part-name');
    if (!nameEl || !draftSkin) return;
    const def = SKIN_PARTS[skinGridPart()];
    if (def) nameEl.textContent = def.label + '  (' + def.w + ' x ' + def.h + ')';
}

function skinPaintPixel(part, x, y) {
    if (!draftSkin) return false;
    const def = SKIN_PARTS[part];
    if (!def || x < 0 || x >= def.w || y < 0 || y >= def.h) return false;
    const idx = y * def.w + x;
    const col = skinEraser ? defaultSkin()[part][idx] : skinEditorColor;
    if (draftSkin[part][idx] === col) return false;
    draftSkin[part][idx] = col;
    return true;
}
function skinSaveDraft() {
    if (!draftSkin) return;
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (err) {}
}
// 🖱️ Direct paint — 3D character par click/drag se pixel rang do.
// Raycast se pata chalta hai kis mesh, kis face aur kis UV par click hua,
// phir UV se grid ka pixel nikalta hai (face ke crop ke hisaab se).
let skinRaycaster = null;
let skinPainting3D = false;
let skinDragStartX = 0, skinDragStartY = 0, skinDragLastX = 0, skinDragMoved = false;
function skinEditorMeshes() {
    if (!lobbySteveParts) return [];
    return [lobbySteveParts.head, lobbySteveParts.body, lobbySteveParts.leftArmUpper, lobbySteveParts.leftArmLower, lobbySteveParts.rightArmUpper, lobbySteveParts.rightArmLower, lobbySteveParts.leftThigh, lobbySteveParts.leftShin, lobbySteveParts.rightThigh, lobbySteveParts.rightShin].filter(Boolean);
}
function skinCellFromHit(hit) {
    const mesh = hit.object;
    const map = mesh.userData._skinMap;
    if (!map || !hit.uv || hit.faceIndex === undefined || hit.faceIndex === null) return null;
    const face = Math.floor(hit.faceIndex / 2); // 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
    const u = hit.uv.x, v = hit.uv.y;
    let part = map.part, fw, fh, ox, oy;
    if (face === 4) { fw = map.w; fh = map.h; ox = 0; oy = 0; } // front (+z)
    else if (face === 5) { part = map.backPart || map.part; fw = map.w; fh = map.h; ox = 0; oy = 0; } // back (-z) — alag grid
    else if (face === 0 || face === 1) { part = map.sidePart || map.part; fw = map.cw; fh = map.h; ox = 0; oy = 0; } // side (+x/-x) — alag grid
    else if (face === 2) { fw = map.w; fh = map.ch; ox = 0; oy = 0; }
    else { fw = map.w; fh = map.ch; ox = 0; oy = map.h - map.ch; }
    let cx = Math.floor(u * fw);
    let cy = Math.floor((1 - v) * fh);
    cx = Math.max(0, Math.min(fw - 1, cx));
    cy = Math.max(0, Math.min(fh - 1, cy));
    return { part, x: ox + cx, y: map.y0 + oy + cy };
}
function skinRaycastPaint(e) {
    if (!skinEditorOpen || !draftSkin || !lobbySteveParts || !lobbyCamera) return false;
    if (!skinRaycaster) skinRaycaster = new THREE.Raycaster();
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    skinRaycaster.setFromCamera({ x: nx, y: ny }, lobbyCamera);
    const hits = skinRaycaster.intersectObjects(skinEditorMeshes(), false);
    if (!hits.length) return false;
    const cell = skinCellFromHit(hits[0]);
    if (!cell) return false;
    const changed = skinPaintPixel(cell.part, cell.x, cell.y);
    // Last painted part/face yaad rakho taake panel me dikh sake.
    skinEditorPart = skinFrontPart(cell.part);
    skinEditorSide = cell.part.endsWith('B') ? 'back' : (cell.part.endsWith('S') ? 'side' : 'front');
    updateSkinPartLabel();
    if (changed) {
        if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
        skinSaveDraft();
    }
    return true;
}
function skinOverlayMouseDown(e) {
    const overlay = document.getElementById('name-overlay');
    if (!skinEditorOpen || e.target !== overlay) return;
    skinPainting3D = true;
    skinDragStartX = e.clientX; skinDragStartY = e.clientY; skinDragLastX = e.clientX;
    skinDragMoved = false;
    // Abhi paint nahi karte — pehle pata chale click hai ya drag.
}
function skinOverlayMouseMove(e) {
    if (!skinPainting3D) return;
    if (e.buttons === 0) { skinPainting3D = false; skinDragMoved = false; return; }
    const totalDx = e.clientX - skinDragStartX;
    const totalDy = e.clientY - skinDragStartY;
    if (!skinDragMoved && Math.abs(totalDx) < 6 && Math.abs(totalDy) < 6) return; // abhi click jaisa hai
    skinDragMoved = true;
    const dx = e.clientX - skinDragLastX;
    skinDragLastX = e.clientX;
    // Drag right = player ka front right ki taraf ghume, peeche dikhne lage (0.5° per pixel).
    let v = lobbyPlayerRotate + dx * 0.5;
    v = ((v + 180) % 360 + 360) % 360 - 180; // wrap -180..180 taake poora ghoom sake
    setLobbyPlayerRotate(v);
}
function skinOverlayMouseUp(e) {
    // Click tha — paint usi jagah karo jahan click kiya tha (mousedown point), mouseup wali jagah nahi.
    if (skinPainting3D && !skinDragMoved) skinRaycastPaint({ clientX: skinDragStartX, clientY: skinDragStartY });
    skinPainting3D = false;
    skinDragMoved = false;
}

function publishSkin() {
    if (!draftSkin) return;
    currentSkin = cloneSkin(draftSkin);
    try { localStorage.setItem(skinCodeKey(), encodeSkinCode(currentSkin)); } catch (e) {}
    applySkinToAll();
    // Apni nayi skin server ko bhejo taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    // Editor khula hai to preview par boxes wapas lagao (publish ke baad bhi).
    if (skinEditorOpen && lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    const code = encodeSkinCode(currentSkin);
    const wrap = document.getElementById('skin-code-wrap');
    const ta = document.getElementById('skin-code-text');
    if (wrap) wrap.style.display = 'block';
    if (ta) ta.value = code;
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Published! Skin player par lag gayi. Code neeche hai — mujhe bhejo.';
}

function resetSkinEditor() {
    draftSkin = defaultSkin();
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (e) {}
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Skin reset — wapas original look par hai.';
}

function removePublishedSkin() {
    currentSkin = null;
    // Apni account ki key + purani shared key dono hatao, taake dobara
    // login par purani skin wapas migrate na ho.
    try { localStorage.removeItem(skinCodeKey()); } catch (e) {}
    try { localStorage.removeItem(SKIN_CODE_KEY); } catch (e) {}
    draftSkin = defaultSkin();
    applySkinToAll();
    // Skin hat gayi — server ko bhi batao taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    const st = document.getElementById('skin-status');
    if (st) st.textContent = 'Skin hata di — player wapas original look par hai.';
}

function copySkinCode() {
    const ta = document.getElementById('skin-code-text');
    if (!ta || !ta.value) return;
    const st = document.getElementById('skin-status');
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => { if (st) st.textContent = 'Code copy ho gaya!'; }).catch(() => { ta.select(); document.execCommand('copy'); if (st) st.textContent = 'Code copy ho gaya!'; });
        else { ta.select(); document.execCommand('copy'); if (st) st.textContent = 'Code copy ho gaya!'; }
    } catch (e) {}
}

function loadSkinCode() {
    const inp = document.getElementById('skin-load-code');
    const code = inp ? inp.value.trim() : '';
    const skin = decodeSkinCode(code);
    const st = document.getElementById('skin-status');
    if (!skin) { if (st) st.textContent = 'Code ghalat hai — dobara check karo.'; return; }
    draftSkin = cloneSkin(skin);
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    try { localStorage.setItem(skinDraftKey(), encodeSkinCode(draftSkin)); } catch (e) {}
    if (st) st.textContent = 'Skin load ho gayi! PUBLISH dabao taake lag jaye.';
}

// 📤 Texture upload — 64x64 Minecraft skin PNG se skin banao (Alex jaisi).
// Image ko 64x64 canvas par draw karke pixels parho, phir wahi layout
// (head/body/arms/legs, front/back/side, overlay, 12->10 resample) lagao.
function skinFromTextureImage(img) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    function px(x, y) { const i = (y * 64 + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; }
    function hex(rgb) { return '#' + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1); }
    function extract(x0, y0, w, h, ox0, oy0, tw, th) {
        const out = [];
        for (let ty = 0; ty < th; ty++) {
            const sy = Math.floor(ty * h / th);
            for (let tx = 0; tx < tw; tx++) {
                const sx = Math.floor(tx * w / tw);
                let p = px(x0 + sx, y0 + sy);
                if (ox0 !== null && ox0 !== undefined) {
                    const o = px(ox0 + sx, oy0 + sy);
                    if (o[3] > 0) p = o;
                }
                if (p[3] === 0) p = [198, 134, 66, 255];
                out.push(hex(p));
            }
        }
        return out;
    }
    const REGIONS = {
        head: [8, 8, 8, 8, 40, 8, 8, 8],
        headB: [24, 8, 8, 8, 56, 8, 8, 8],
        headS: [0, 8, 8, 8, 32, 8, 8, 8],
        body: [20, 20, 8, 12, 20, 36, 8, 10],
        bodyB: [32, 20, 8, 12, 32, 36, 8, 10],
        bodyS: [16, 20, 4, 12, 16, 36, 4, 10],
        armR: [44, 20, 4, 12, 44, 36, 4, 10],
        armRB: [52, 20, 4, 12, 52, 36, 4, 10],
        armRS: [40, 20, 4, 12, 40, 36, 4, 10],
        armL: [36, 52, 4, 12, 52, 52, 4, 10],
        armLB: [44, 52, 4, 12, 60, 52, 4, 10],
        armLS: [32, 52, 4, 12, 48, 52, 4, 10],
        legR: [4, 20, 4, 12, 4, 36, 4, 10],
        legRB: [12, 20, 4, 12, 12, 36, 4, 10],
        legRS: [0, 20, 4, 12, 0, 36, 4, 10],
        legL: [20, 52, 4, 12, 4, 52, 4, 10],
        legLB: [28, 52, 4, 12, 12, 52, 4, 10],
        legLS: [16, 52, 4, 12, 0, 52, 4, 10],
    };
    const skin = {};
    Object.keys(REGIONS).forEach((part) => {
        const r = REGIONS[part];
        skin[part] = extract(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]);
    });
    // Safai: baalon ka orange sirf head par — arms/legs/body se hatao.
    const HAIR = { '#e58d3f': 1, '#f3a858': 1, '#eb983f': 1, '#de812e': 1 };
    Object.keys(skin).forEach((part) => {
        if (part === 'head' || part === 'headB' || part === 'headS') return;
        const def = SKIN_PARTS[part];
        const w = def.w, h = def.h;
        const grid = skin[part];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (HAIR[grid[i]]) {
                let repl = x > 0 ? grid[i - 1] : grid[i + 1];
                if (HAIR[repl]) repl = y < 5 ? '#8cbe8a' : '#efdabf';
                grid[i] = repl;
            }
        }
    });
    const ok = Object.keys(SKIN_PARTS).every((p) => skin[p] && skin[p].length === SKIN_PARTS[p].w * SKIN_PARTS[p].h);
    return ok ? skin : null;
}

function handleSkinTextureUpload(e) {
    const file = e.target && e.target.files && e.target.files[0];
    const st = document.getElementById('skin-status');
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
        if (st) st.textContent = 'Sirf image file (PNG) upload karo.';
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        const img = new Image();
        img.onload = function () {
            try {
                const skin = skinFromTextureImage(img);
                if (!skin) { if (st) st.textContent = 'Texture samajh nahi aayi — 64x64 Minecraft skin PNG use karo.'; return; }
                draftSkin = skin;
                if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
                skinSaveDraft();
                updateSkinPartLabel();
                if (st) st.textContent = 'Texture load ho gayi! PUBLISH dabao taake lag jaye.';
            } catch (err) {
                if (st) st.textContent = 'Texture load nahi hui — dobara try karo.';
            }
        };
        img.onerror = function () { if (st) st.textContent = 'Image khul nahi rahi — PNG file use karo.'; };
        img.src = reader.result;
    };
    reader.onerror = function () { if (st) st.textContent = 'File parhi nahi gayi.'; };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function openSkinEditor() {
    const overlay = document.getElementById('name-overlay');
    if (!overlay || document.getElementById('skin-editor-panel')) return;
    if (inventoryOpen) closeInventory();
    if (!lobbySteveParts) { try { createLobbyCharacter(); } catch (e) {} }
    if (!lobbySteveParts) return;
    try {
        const dRaw = localStorage.getItem(skinDraftKey());
        draftSkin = (dRaw ? decodeSkinCode(dRaw) : null) || (currentSkin ? cloneSkin(currentSkin) : defaultSkin());
    } catch (e) { draftSkin = currentSkin ? cloneSkin(currentSkin) : defaultSkin(); }
    skinEditorPart = 'head';
    skinEditorSide = 'front';
    skinEraser = false;

    const palette = SKIN_PALETTE.map((c) => `<button class="skin-color-btn" data-color="${c}" style="width:22px;height:22px;background:${c};border:2px solid #555;border-radius:4px;cursor:pointer;padding:0;" title="${c}"></button>`).join('');

    const panel = document.createElement('div');
    panel.id = 'skin-editor-panel';
    panel.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:300px;background:rgba(8,16,60,0.98);padding:14px;overflow-y:auto;z-index:20;color:white;font-family:monospace;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:900;color:#00ffcc;">SKIN EDITOR</div>
            <button id="skin-close-btn" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;line-height:1.5;">Player T-pose me khada hai aur us par chhote chhote pixel boxes bane hain. Seedha character par click karke paint karo — jis pixel par click karo ge, rang sirf usi pixel me ayega. Drag karke player ko ghumao (peeche aur side se paint karne ke liye). Front, back aur side alag hain, front ka rang peeche nahi jayega.</div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;">Last painted: <span id="skin-part-name" style="color:#00ffcc;"></span></div>
        <div style="font-size:12px;font-weight:bold;color:#00ffcc;margin-top:10px;">COLOR</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${palette}</div>
        <div style="display:flex;gap:6px;margin-top:8px;align-items:center;">
            <input type="color" id="skin-custom-color" value="${skinEditorColor}" style="width:36px;height:28px;padding:0;border:1px solid #444;background:#111;cursor:pointer;">
            <button id="skin-eraser-btn" style="padding:6px 10px;font-size:11px;font-weight:bold;background:#334155;color:white;border:none;border-radius:4px;cursor:pointer;">ERASER</button>
            <span id="skin-color-preview" style="display:inline-block;width:22px;height:22px;border:2px solid #555;border-radius:4px;background:${skinEditorColor};vertical-align:middle;"></span>
        </div>
        <button id="skin-publish-btn" style="width:100%;padding:12px;margin-top:12px;font-size:14px;font-weight:900;background:#ffc400;color:#111;border:none;border-radius:8px;cursor:pointer;">PUBLISH SKIN</button>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button id="skin-reset-btn" style="flex:1;padding:8px;font-size:12px;font-weight:bold;background:#334155;color:white;border:none;border-radius:6px;cursor:pointer;">RESET SKIN</button>
            <button id="skin-remove-btn" style="flex:1;padding:8px;font-size:12px;font-weight:bold;background:#7f1d1d;color:white;border:none;border-radius:6px;cursor:pointer;">REMOVE SKIN</button>
        </div>
        <div id="skin-status" style="min-height:16px;font-size:12px;color:#00ffcc;margin-top:8px;"></div>
        <div id="skin-code-wrap" style="display:none;margin-top:10px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">SKIN CODE — mujhe bhejo, main default kar dunga</div>
            <textarea id="skin-code-text" readonly style="width:100%;height:64px;box-sizing:border-box;margin-top:4px;background:#111;color:#00ffcc;border:1px solid #444;border-radius:6px;font-size:11px;padding:6px;"></textarea>
            <button id="skin-copy-code-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">COPY CODE</button>
        </div>
        <div style="margin-top:12px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">LOAD CODE</div>
            <input id="skin-load-code" placeholder="Code yahan paste karo" style="width:100%;box-sizing:border-box;margin-top:4px;padding:8px;background:#111;color:white;border:1px solid #444;border-radius:6px;font-size:11px;">
            <button id="skin-load-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">LOAD SKIN</button>
        </div>
        <div style="margin-top:12px;">
            <div style="font-size:12px;font-weight:bold;color:#00ffcc;">UPLOAD TEXTURE</div>
            <div style="font-size:11px;color:#aaa;margin-top:4px;">Minecraft skin wali 64x64 texture (PNG) upload karo — skin khud hi load ho jayegi.</div>
            <input type="file" id="skin-upload-input" accept="image/*" style="display:none;">
            <button id="skin-upload-btn" style="width:100%;padding:8px;margin-top:6px;font-weight:bold;background:#2a6cff;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">UPLOAD TEXTURE</button>
        </div>`;
    overlay.appendChild(panel);

    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = 'none';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = 'none';

    setSkinTPose(true);
    if (lobbySteveParts) applySkinToCharacter(lobbySteveParts, draftSkin, true);
    skinEditorOpen = true;
    updateSkinColorPreview();

    document.getElementById('skin-close-btn').addEventListener('click', closeSkinEditor);
    panel.querySelectorAll('.skin-color-btn').forEach((b) => {
        b.addEventListener('click', () => { skinEditorColor = b.dataset.color; skinEraser = false; updateSkinColorPreview(); });
    });
    const customColor = document.getElementById('skin-custom-color');
    if (customColor) customColor.addEventListener('input', () => { skinEditorColor = customColor.value; skinEraser = false; updateSkinColorPreview(); });
    const eraserBtn = document.getElementById('skin-eraser-btn');
    if (eraserBtn) eraserBtn.addEventListener('click', () => { skinEraser = !skinEraser; updateSkinColorPreview(); });
    document.getElementById('skin-publish-btn').addEventListener('click', publishSkin);
    document.getElementById('skin-reset-btn').addEventListener('click', resetSkinEditor);
    document.getElementById('skin-remove-btn').addEventListener('click', removePublishedSkin);
    document.getElementById('skin-copy-code-btn').addEventListener('click', copySkinCode);
    document.getElementById('skin-load-btn').addEventListener('click', loadSkinCode);
    document.getElementById('skin-upload-btn').addEventListener('click', () => { const inp = document.getElementById('skin-upload-input'); if (inp) inp.click(); });
    document.getElementById('skin-upload-input').addEventListener('change', handleSkinTextureUpload);
    // Direct paint: character par click/drag (overlay ki khaali jagah par).
    if (overlay) overlay.addEventListener('mousedown', skinOverlayMouseDown);
    window.addEventListener('mousemove', skinOverlayMouseMove);
    window.addEventListener('mouseup', skinOverlayMouseUp);
}

function closeSkinEditor() {
    const panel = document.getElementById('skin-editor-panel');
    if (!skinEditorOpen && !panel) return;
    if (panel) panel.remove();
    const _ov = document.getElementById('name-overlay');
    if (_ov) _ov.removeEventListener('mousedown', skinOverlayMouseDown);
    window.removeEventListener('mousemove', skinOverlayMouseMove);
    window.removeEventListener('mouseup', skinOverlayMouseUp);
    skinPainting3D = false;
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = '';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = '';
    skinEditorOpen = false;
    draftSkin = null;
    setSkinTPose(false);
    applySkinToAll();
}

// 🎒 INVENTORY — built-in skins ki list, click karke equip karo.
// Equip per-account hai (skinCodeKey wali key me save hota hai), is liye
// ek account par equip karne se doosre account par nahi lagta.
let inventoryOpen = false;
function skinPreviewDataURL(skin) {
    // Front view ka chhota preview: head, body, arms, legs.
    try {
        const c = document.createElement('canvas');
        const S = 8;
        c.width = 16 * S; c.height = 28 * S;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0a1a4a'; ctx.fillRect(0, 0, c.width, c.height);
        const draw = (part, ox, oy) => {
            const g = skin && skin[part];
            if (!g) return;
            const w = (SKIN_PARTS[part] || {}).w || 0;
            const h = (SKIN_PARTS[part] || {}).h || 0;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                ctx.fillStyle = g[y * w + x] || '#000000';
                ctx.fillRect((ox + x) * S, (oy + y) * S, S, S);
            }
        };
        draw('head', 4, 0);
        draw('armL', 0, 8); draw('body', 4, 8); draw('armR', 12, 8);
        draw('legL', 4, 18); draw('legR', 8, 18);
        return c.toDataURL();
    } catch (e) { return ''; }
}
function inventoryEquippedId() {
    if (!currentSkin) return 'original';
    try {
        const cur = encodeSkinCode(currentSkin);
        const hit = INVENTORY_SKINS.find((s) => s.code && s.code === cur);
        return hit ? hit.id : '';
    } catch (e) { return ''; }
}
function equipInventorySkin(id) {
    const item = INVENTORY_SKINS.find((s) => s.id === id);
    if (!item) return;
    if (item.code) {
        const skin = decodeSkinCode(item.code);
        if (!skin) { try { lobbyToast('Skin equip nahi hui — code kharab hai.'); } catch (e) {} return; }
        currentSkin = cloneSkin(skin);
        try { localStorage.setItem(skinCodeKey(), encodeSkinCode(currentSkin)); } catch (e) {}
    } else {
        // ORIGINAL — koi skin nahi, wapas plain Steve.
        currentSkin = null;
        try { localStorage.removeItem(skinCodeKey()); } catch (e) {}
        try { localStorage.removeItem(SKIN_CODE_KEY); } catch (e) {}
    }
    draftSkin = null;
    // Apply fail ho bhi jaye to equip rukni nahi chahiye — panel refresh
    // aur server ko skin bhejna phir bhi hona chahiye.
    try { applySkinToAll(); } catch (e) {}
    try { renderInventoryPanel(); } catch (e) {}
    // Apni nayi skin server ko bhejo taake doosre players ko dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    try { lobbyToast('Skin equip ho gayi: ' + item.name + (item.code ? '' : ' (Original)')); } catch (e) {}
}
function openInventory() {
    const overlay = document.getElementById('name-overlay');
    if (!overlay || document.getElementById('inventory-panel')) return;
    if (skinEditorOpen) closeSkinEditor();
    if (!lobbySteveParts) { try { createLobbyCharacter(); } catch (e) {} }
    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    panel.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:300px;background:rgba(8,16,60,0.98);padding:14px;overflow-y:auto;z-index:20;color:white;font-family:monospace;';
    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:900;color:#00ffcc;">INVENTORY</div>
            <button id="inventory-close-btn" style="background:#222;color:#fff;border:1px solid #444;width:28px;height:28px;border-radius:4px;font-weight:bold;cursor:pointer;">✕</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;line-height:1.5;">Skin par click karke equip karo. Equip sirf tumhare account par lagta hai — doosre Google account par nahi.</div>
        <div id="inventory-list" style="display:flex;flex-direction:column;gap:10px;margin-top:12px;"></div>
    `;
    overlay.appendChild(panel);
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = 'none';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = 'none';
    inventoryOpen = true;
    renderInventoryPanel();
    document.getElementById('inventory-close-btn').addEventListener('click', closeInventory);
}
function renderInventoryPanel() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    const eq = inventoryEquippedId();
    list.innerHTML = INVENTORY_SKINS.map((item) => {
        const skin = item.code ? decodeSkinCode(item.code) : defaultSkin();
        const img = skinPreviewDataURL(skin);
        const isEq = eq === item.id;
        return `<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);padding:10px;border-radius:8px;border:1px solid ${isEq ? '#00ffcc' : '#333'};">
            <img src="${img}" alt="${item.name}" style="width:48px;height:84px;image-rendering:pixelated;background:#0a1a4a;border-radius:4px;">
            <div style="flex:1;">
                <div style="font-size:14px;font-weight:900;">${item.name}</div>
                <div style="font-size:11px;color:#aaa;">${item.desc}</div>
            </div>
            <button class="inventory-equip-btn" data-id="${item.id}" ${isEq ? 'disabled' : ''} style="padding:8px 12px;font-size:11px;font-weight:bold;background:${isEq ? '#00ffcc' : '#2a6cff'};color:${isEq ? '#111' : 'white'};border:none;border-radius:4px;cursor:${isEq ? 'default' : 'pointer'};">${isEq ? 'EQUIPPED' : 'EQUIP'}</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.inventory-equip-btn').forEach((b) => {
        b.addEventListener('click', () => equipInventorySkin(b.dataset.id));
    });
}
function closeInventory() {
    const panel = document.getElementById('inventory-panel');
    if (!inventoryOpen && !panel) return;
    if (panel) panel.remove();
    const right = document.getElementById('lobby-right-panel');
    if (right) right.style.display = '';
    const card = document.getElementById('lobby-card');
    if (card) card.style.display = '';
    inventoryOpen = false;
}

function hideLobbyExtras() {
    ['crosshair','hud','score-dots','match-timer','chat-container'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}
function showGameExtras() {
    ['crosshair','hud','score-dots','match-timer','chat-container'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });
}

function showGoogleNamePrompt(user) {
    const oldOverlay = document.getElementById('name-overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = 'name-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'monospace';
    overlay.style.color = 'white';
    const defaultName = localStorage.getItem(`pointerx_user_${user.uid}`) || user.displayName || "GoogleUser";
    overlay.innerHTML = buildLobbyHTML({ mode: 'google', defaultName, email: user.email });
    document.body.appendChild(overlay);
    hideLobbyExtras();
    // Is Google account ki skin load karo (har account ki apni skin).
    try { setSkinAccount('g_' + user.uid); } catch (e) {}
    try { createLobbyCharacter(); } catch (e) {}
    setupLobbyMenus();
    const startBtn = document.getElementById('start-google-game');
    if (startBtn) startBtn.addEventListener('click', () => {
        const input = document.getElementById('google-custom-name');
        let finalName = input ? input.value.trim() : "GoogleUser";
        if (finalName === "") finalName = "GoogleUser";
        localStorage.setItem(`pointerx_user_${user.uid}`, finalName);
        startGameWithPlayer(finalName);
    });
    const logoutBtn = document.getElementById('prompt-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (window.firebaseAuth && window.signOut) {
            window.signOut(window.firebaseAuth).then(() => { location.reload(); });
        }
    });
}

function initNamePrompt() {
    const oldOverlay = document.getElementById('name-overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = 'name-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '999999';
    overlay.style.fontFamily = 'monospace';
    overlay.style.color = 'white';
    const defaultGuestName = localStorage.getItem('pointerx_guest_name') || `Player_${Math.floor(Math.random()*1000)}`;
    overlay.innerHTML = buildLobbyHTML({ mode: 'guest', defaultName: defaultGuestName });
    document.body.appendChild(overlay);
    hideLobbyExtras();
    // Is guest naam ki skin load karo (har naam ki apni skin).
    try { setSkinAccount('guest_' + String(defaultGuestName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')); } catch (e) {}
    try { createLobbyCharacter(); } catch (e) {}
    setupLobbyMenus();
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            const auth = window.firebaseAuth;
            const provider = window.googleProvider;
            if (auth && provider) {
                if (window.signInWithPopup) {
                    window.signInWithPopup(auth, provider)
                        .then((result) => { showGoogleNamePrompt(result.user); })
                        .catch((error) => {
                            if (error.code === 'auth/popup-blocked' && window.signInWithRedirect) {
                                window.signInWithRedirect(auth, provider);
                            } else {
                                alert("Google Login Failed: " + (error.message || "Try again."));
                            }
                        });
                } else if (window.signInWithRedirect) {
                    window.signInWithRedirect(auth, provider);
                }
            } else {
                alert("Firebase Auth is still initializing. Please wait a second!");
            }
        });
    }
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const input = document.getElementById('player-name-input');
            let pName = input ? input.value.trim() : "Player";
            if (pName === "") pName = "Player";
            localStorage.setItem('pointerx_guest_name', pName);
            startGameWithPlayer(pName);
        });
    }
}

function startGameWithPlayer(name) {
    playerName = name;
    try { closeSkinEditor(); } catch (e) {}
    try { removeLobbyCharacter(); } catch (e) {}
    if (gun) gun.visible = true;
    try { showGameExtras(); } catch (e) {}
    const overlay = document.getElementById('name-overlay');
    if (overlay) overlay.remove();

    setupExitButton();
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = 'block';
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.style.display = 'block';

    if (socket && typeof socket.connect === 'function' && socket.disconnected) {
        try { socket.connect(); } catch (e) {}
    }

    gameStarted = true;
    // Pehle apni skin bhejo, phir naam — taake newPlayer broadcast me
    // skin pehle se aa jaye aur doosre players ko sahi skin dikhe.
    try { sendMySkinToServer(); } catch (e) {}
    socket.emit('setPlayerName', playerName);
    updateHUD();

    if (isMobile) {
        setupMobileControls();
        isLocked = true;
    } else {
        const blocker = document.getElementById('blocker');
        if (blocker) { blocker.style.display = 'none'; }
        document.body.requestPointerLock();
    }
}

function triggerHitMarker(isHeadshot = false) {
    let crosshair = document.getElementById('crosshair');
    if (!crosshair) return;

    crosshair.style.backgroundColor = '#ff0000';
    crosshair.style.transform = 'translate(-50%, -50%) rotate(45deg) scale(1.6)';
    crosshair.style.boxShadow = isHeadshot ? '0 0 10px #ff0000, 0 0 20px #ff0000' : '0 0 8px #ff3300';

    setTimeout(() => {
        crosshair.style.backgroundColor = '#00ff00';
        crosshair.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
        crosshair.style.boxShadow = 'none';
    }, 100);

    const popup = document.createElement('div');
    popup.innerText = isHeadshot ? "🎯 HEADSHOT!" : "💥 HIT";
    popup.style.position = 'fixed';
    popup.style.top = '46%';
    popup.style.left = '52%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.color = isHeadshot ? '#ff0000' : '#ffcc00';
    popup.style.fontSize = isHeadshot ? '20px' : '14px';
    popup.style.fontWeight = 'bold';
    popup.style.fontFamily = 'monospace';
    popup.style.pointerEvents = 'none';
    popup.style.zIndex = '999';
    popup.style.textShadow = '1px 1px 2px #000';
    document.body.appendChild(popup);

    setTimeout(() => { popup.remove(); }, 350);
}

function init() {
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('night-sky.png', 
        (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            scene.background = texture;
        }, 
        undefined, 
        () => {}
    );

    scene.fog = new THREE.Fog(0x0a0a1a, 50, 250);

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, playerHeight, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createMap();
    createGun();

    if (!isMobile) { setupPointerLock(); }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    window.addEventListener('mousedown', (e) => {
        if (!isLocked || isDeadLocal || !gameStarted) return;
        if (e.button === 0) { shoot(e); } 
        else if (e.button === 2) { 
            isAiming = true; 
            camera.fov = aimedFOV;
            camera.updateProjectionMatrix();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2) { 
            isAiming = false; 
            camera.fov = normalFOV;
            camera.updateProjectionMatrix();
        }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    socket.on('currentPlayers', (serverPlayers) => {
        Object.keys(serverPlayers).forEach((id) => {
            if (id === socket.id) return;
            createOtherPlayerMesh(id, serverPlayers[id]);
        });
    });

    socket.on('newPlayer', (data) => {
        createOtherPlayerMesh(data.id, data.player);
    });

    // 🎨 Kisi doosre player ne skin badli — uski apni skin us par lagao.
    socket.on('playerSkinChanged', (data) => {
        const p = otherPlayers[data.id];
        if (p) applyPlayerSkin(p, data.skin);
    });

    // 🎨 Socket connect/reconnect hote hi apni skin dobara bhejo.
    // EXIT ke baad socket disconnect hota hai; PLAY par connect async
    // hota hai, is liye join par bheji hui skin kabhi kabhi nahi
    // pahunchti. Connect handler se skin hamesha server tak jati hai.
    socket.on('connect', () => {
        try { sendMySkinToServer(); } catch (e) {}
    });

    socket.on('chatMessage', (data) => {
        if (data.id) {
            if (shownChatIds.has(data.id)) return;
            shownChatIds.add(data.id);
            if (shownChatIds.size > 200) shownChatIds.clear();
        }
        const _now = Date.now();
        if (data.name === playerName && data.message === lastLocalChatText && _now - lastLocalChatTime < 5000) return;
        const _key = data.name + '\0' + data.message;
        if (_key === lastServerChatKey && _now - lastServerChatTime < 2000) return;
        lastServerChatKey = _key;
        lastServerChatTime = _now;
        appendChatMessage(data.name, data.message, 'white');
    });

    socket.on('playerJoinedNotif', (name) => {
        appendChatMessage('', `${name} Joined the game`, '#00ff00');
    });

    socket.on('playerLeftNotif', (name) => {
        appendChatMessage('', `${name} Left the game`, '#ff3333');
    });

    socket.on('gameNotification', (msg) => { showGameNotification(msg); });

    socket.on('timerUpdate', (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        matchTimerString = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        updateHUD();
    });

    socket.on('playerStatsUpdate', (data) => {
        if (data.targetId === socket.id) { myDeaths = data.targetDeaths; }
        if (data.attackerId === socket.id) { myKills = data.attackerKills; }
        updateHUD();
    });

    socket.on('playerMoved', (data) => {
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            if (p.isDead) return;
            // 🎨 Skin bhi yahin se sync karo — server har playerMoved me
            // poora player object (skin samet) bhejta hai. Agar skin
            // join par miss ho gayi ho (ya badal gayi ho) to yahan se
            // theek ho jati hai; is se skin kabhi purani nahi rehti.
            try {
                if (typeof data.player.skin === 'string' && data.player.skin && data.player.skin !== p.skinCode) {
                    applyPlayerSkin(p, data.player.skin);
                } else if (data.player.skin === '' && p.skinCode !== '') {
                    applyPlayerSkin(p, '');
                }
            } catch (e) {}
            
            // ZAMEEN PAR PAIR — asal bug ye tha: crouch me camera 1.0 tak
            // girti hai aur server wahi camera Y bhejta hai, to
            // eyeY - 1.62 seedha use karne se banda 0.62 zameen me ghus
            // jata tha. Is liye mesh ki floor hai: mesh kabhi is se
            // neeche nahi jati — bent legs pair ko upar uthate hain, utna
            // hi drop, bas. Drop/hip/knee ab lobby CROUCH POSE se aate
            // hain (Jimmy khud banata hai), hardcode nahi. Jump/crouch
            // hawa me bhi sahi rehta hai kyunki max() upar wali value
            // (hawa me) ko chhoone nahi deta.
            const crouchDropNow = crouchDrop * inGamePlayerSize * PLAYER_HEIGHT_RATIO * (p.crouchAmount || 0);
            const targetY = Math.max(data.player.y - 1.62, -crouchDropNow);
            // Body ka yaw = total look yaw - head ka offset. Naya server
            // headYaw bhejta hai (body alag, head alag); purana server
            // headYaw nahi bhejta (to body look ki taraf hi rehta hai).
            const bodyYaw = data.player.yaw - (data.player.headYaw || 0);
            p.mesh.position.set(data.player.x, targetY, data.player.z);
            p.lastYaw = bodyYaw;
            p.mesh.rotation.y = bodyYaw + Math.PI + inGamePlayerRotate * Math.PI / 180;
            p.isMoving = !!data.player.isMoving;
            p.isCrouching = !!data.player.isCrouching;
            p.lastPitch = data.player.pitch || 0;
            p.lastHeadYaw = data.player.headYaw || 0;

            if (p.nameTag) {
                p.nameTag.position.set(data.player.x, targetY + 2.2, data.player.z);
            }

            if (data.player.isDashing) {
                spawnGhostShade(data.player.x, targetY, data.player.z, bodyYaw);
            }
        }
    });

    socket.on('spawnBlood', (pos) => { spawnBloodSplatter(pos); });

    socket.on('playerDied', (data) => {
        if (data.id === socket.id) {
            isDeadLocal = true;
            myHealth = 0;
            camera.position.y = 0.4;
            playSound('death');
            showRespawnScreen(3);
        }
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            p.isDead = true;
        }
    });

    socket.on('playerRespawned', (data) => {
        if (data.id === socket.id) {
            isDeadLocal = false;
            myHealth = 100;
            bhopBonus = 0;
            bhopChain = 0;
            hideRespawnScreen();
            camera.position.set(data.player.x, playerHeight, data.player.z);
        }
        if (otherPlayers[data.id]) {
            const p = otherPlayers[data.id];
            p.isDead = false;
            p.lastYaw = (data.player.yaw || 0);
            p.mesh.rotation.set(0, (data.player.yaw || 0) + Math.PI + inGamePlayerRotate * Math.PI / 180, 0);
            setPlayerScale(p.mesh, inGamePlayerSize);
            p.mesh.position.set(data.player.x, data.player.y - 1.62, data.player.z);
            if (p.lastPos) p.lastPos.copy(p.mesh.position); else p.lastPos = p.mesh.position.clone();
            p.walkPhase = 0; p.walkAmount = 0;
            
            p.mesh.traverse((child) => {
                if (child.userData && child.userData.isGunHitBox) return;
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.opacity = 1.0);
                    } else {
                        child.material.opacity = 1.0;
                    }
                }
            });
            if (p.nameTag && p.nameTag.material) {
                p.nameTag.material.opacity = 1.0;
                p.nameTag.visible = true;
                // Tag respawn point par wapas aaye — warna wo marne wali
                // jagah par hi reh jata hai jab tak player hile na.
                p.nameTag.position.set(data.player.x, (data.player.y - 1.62) + 2.2, data.player.z);
            }
        }
    });

    socket.on('playerHealthUpdate', (data) => {
        if (data.id === socket.id) {
            myHealth = data.health;
            updateHUD();
        }
    });

    socket.on('playerDisconnect', (id) => {
        if (otherPlayers[id]) {
            if (otherPlayers[id].gunGroup) inGameGunGroups = inGameGunGroups.filter((g) => g !== otherPlayers[id].gunGroup);
            const mesh = otherPlayers[id].mesh;
            scene.remove(mesh);
            if (otherPlayers[id].nameTag) { scene.remove(otherPlayers[id].nameTag); }
            const meshParts = [];
            mesh.traverse(child => { if (child.isMesh) meshParts.push(child); });
            targets = targets.filter(t => !meshParts.includes(t));
            delete otherPlayers[id];
        }
    });
}

function updateHUD() {
    let hud = document.getElementById('hud');
    const kdRatio = myDeaths === 0 ? myKills.toFixed(2) : (myKills / myDeaths).toFixed(2);

    if (hud) {
        hud.innerHTML = `PLAYER: ${playerName}<br>` +
                        `HEALTH: ${myHealth} | AMMO: 30 / 30`;
    }

    let dots = document.getElementById('score-dots');
    if (!dots) {
        dots = document.createElement('div');
        dots.id = 'score-dots';
        dots.style.position = 'absolute';
        dots.style.top = '20px';
        dots.style.left = '20px';
        dots.style.display = 'flex';
        dots.style.flexDirection = 'column';
        dots.style.gap = '4px';
        dots.style.fontFamily = 'monospace';
        dots.style.fontSize = '16px';
        dots.style.fontWeight = 'bold';
        dots.style.textShadow = '2px 2px black';
        dots.style.zIndex = '100';
        dots.style.pointerEvents = 'none';
        document.body.appendChild(dots);
    }
    
    let timerEl = document.getElementById('match-timer');
    if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'match-timer';
        timerEl.style.position = 'absolute';
        timerEl.style.top = '20px';
        timerEl.style.left = '50%';
        timerEl.style.transform = 'translateX(-50%)';
        timerEl.style.background = '#000';
        timerEl.style.color = '#fff';
        timerEl.style.padding = '8px 28px';
        timerEl.style.fontFamily = 'monospace';
        timerEl.style.fontSize = '28px';
        timerEl.style.fontWeight = 'bold';
        timerEl.style.zIndex = '100';
        timerEl.style.pointerEvents = 'none';
        document.body.appendChild(timerEl);
    }
    timerEl.textContent = matchTimerString;

    const dotStyle = 'display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: middle;';
    dots.innerHTML =
        `<div style="color: #ff3333;"><span style="${dotStyle} background: #ff3333;"></span>${myDeaths}</div>` +
        `<div style="color: #00ff00;"><span style="${dotStyle} background: #00ff00;"></span>${myKills}</div>` +
        `<div style="color: #ffcc00;"><span style="${dotStyle} background: #ffcc00;"></span>${kdRatio}</div>`;
}

function showGameNotification(message) {
    let notif = document.getElementById('game-notif');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'game-notif';
        notif.style.position = 'absolute';
        notif.style.top = '80px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.background = 'rgba(0, 0, 0, 0.6)';
        notif.style.color = '#00ffcc';
        notif.style.padding = '8px 16px';
        notif.style.borderRadius = '5px';
        notif.style.fontFamily = 'monospace';
        notif.style.fontSize = '14px';
        notif.style.fontWeight = 'bold';
        notif.style.zIndex = '100';
        document.body.appendChild(notif);
    }
    notif.innerText = message;
    notif.style.opacity = '1';
    setTimeout(() => { notif.style.opacity = '0'; }, 3500);
}

function createNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    // Canvas 256x64 hai (4:1), is liye sprite ka scale bhi 4:1 rakha hai.
    // Bina scale ke sprite 1x1 square hota hai aur naam khinch kar
    // stretched dikhta hai — ye scale purane working version wala hai.
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
}

function showRespawnScreen(secondsLeft) {
    let respawnDiv = document.getElementById('respawn-screen');
    if (!respawnDiv) {
        respawnDiv = document.createElement('div');
        respawnDiv.id = 'respawn-screen';
        respawnDiv.style.position = 'absolute';
        respawnDiv.style.top = '50%';
        respawnDiv.style.left = '50%';
        respawnDiv.style.transform = 'translate(-50%, -50%)';
        respawnDiv.style.color = 'red';
        respawnDiv.style.fontFamily = 'monospace';
        respawnDiv.style.fontSize = '36px';
        respawnDiv.style.fontWeight = 'bold';
        respawnDiv.style.textShadow = '2px 2px black';
        respawnDiv.style.zIndex = '1000';
        respawnDiv.style.transition = 'opacity 0.5s ease';
        respawnDiv.style.opacity = '1';
        document.body.appendChild(respawnDiv);
    }

    if (secondsLeft <= 0) {
        hideRespawnScreen();
        return;
    }

    respawnDiv.innerText = `YOU DIED! Respawning in ${secondsLeft}s...`;
    setTimeout(() => { showRespawnScreen(secondsLeft - 1); }, 1000);
}

function hideRespawnScreen() {
    const respawnDiv = document.getElementById('respawn-screen');
    if (respawnDiv) {
        respawnDiv.style.opacity = '0';
        setTimeout(() => { respawnDiv.remove(); }, 500);
    }
    updateHUD();
}

function spawnBloodSplatter(pos) {
    if (!pos) return;
    const particleCount = 14;
    const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(pos.x, pos.y, pos.z);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 5, 
            Math.random() * 4 + 1.5, 
            (Math.random() - 0.5) * 5
        );
        scene.add(particle);
        bloodParticles.push({ mesh: particle, velocity: vel, life: 0.5 });
    }
}

function spawnGhostShade(x, y, z, rotY) {
    const ghostGroup = new THREE.Group();
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), ghostMat);
    body.position.y = 1.125;
    ghostGroup.add(body);
    ghostGroup.position.set(x, y, z);
    ghostGroup.rotation.y = rotY;
    scene.add(ghostGroup);

    let fadeLife = 0.3;
    const fadeInterval = setInterval(() => {
        fadeLife -= 0.05;
        ghostMat.opacity = fadeLife;
        if (fadeLife <= 0) {
            clearInterval(fadeInterval);
            scene.remove(ghostGroup);
        }
    }, 30);
}

function createMap() {
    const arenaSize = 500;
    const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('ground-texture.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    });

    const floorMat = new THREE.MeshStandardMaterial({ map: groundTexture, color: 0x555555 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallHeight = 10;
    const wallThickness = 2;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness), wallMat);
    wallN.position.set(0, wallHeight / 2, -arenaSize / 2);
    scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(arenaSize, wallHeight, wallThickness), wallMat);
    wallS.position.set(0, wallHeight / 2, arenaSize / 2);
    scene.add(wallS);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
    wallE.position.set(arenaSize / 2, wallHeight / 2, 0);
    scene.add(wallE);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
    wallW.position.set(-arenaSize / 2, wallHeight / 2, 0);
    scene.add(wallW);

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    for (let i = 0; i < 40; i++) {
        const crate = new THREE.Mesh(boxGeo, boxMat);
        crate.position.set((Math.random() - 0.5) * (arenaSize - 40), 1, (Math.random() - 0.5) * (arenaSize - 40));
        scene.add(crate);
    }
}

function createGun() {
    const gunGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.3 }));
    body.position.set(0.25, -0.25, -0.5);
    gunGroup.add(body);

    const topPart = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x2e2e2e }));
    topPart.position.set(0.25, -0.13, -0.5);
    gunGroup.add(topPart);

    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.01, 0.3), neonMat);
    stripe1.position.set(0.25, -0.09, -0.5);
    gunGroup.add(stripe1);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.25, -0.22, -0.95);
    gunGroup.add(barrel);

    muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.06), neonMat);
    muzzleFlash.position.set(0.25, -0.22, -1.15);
    muzzleFlash.visible = false;
    gunGroup.add(muzzleFlash);

    gun = gunGroup;
    camera.add(gun);
    scene.add(camera);
}

function createSteveHeadMaterials() {
    const hairColor = '#3b2416';
    const skinColor = '#c68642';
    const eyeWhite = '#ffffff';
    const eyeBlue = '#3b3b9b';
    const mouthColor = '#4a2511';

    function makeFaceCanvas(drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = hairColor;
        ctx.fillRect(0, 0, 64, 64);
        drawFn(ctx);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return new THREE.MeshStandardMaterial({ map: texture, transparent: true });
    }

    const matRight = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
    });
    const matLeft = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
    });
    const matTop = makeFaceCanvas((ctx) => { ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 64); });
    const matBottom = makeFaceCanvas((ctx) => { ctx.fillStyle = '#ad6f32'; ctx.fillRect(0, 0, 64, 64); });
    const matFront = makeFaceCanvas((ctx) => {
        ctx.fillStyle = skinColor; ctx.fillRect(0, 24, 64, 40);
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 24);
        ctx.fillStyle = eyeWhite; ctx.fillRect(8, 32, 16, 8); ctx.fillRect(40, 32, 16, 8);
        ctx.fillStyle = eyeBlue; ctx.fillRect(16, 32, 8, 8); ctx.fillRect(40, 32, 8, 8);
        ctx.fillStyle = mouthColor; ctx.fillRect(24, 44, 16, 12);
    });
    const matBack = makeFaceCanvas((ctx) => {
        ctx.fillStyle = hairColor; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = skinColor; ctx.fillRect(16, 48, 32, 16);
    });

    return [matRight, matLeft, matTop, matBottom, matFront, matBack];
}

function createSteveCharacter(playerId, applyCustoms = true) {
    const steveGroup = new THREE.Group();
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00a8b5, transparent: true });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b449b, transparent: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, transparent: true });

    // 🌟 Legs with Knee Joints, bilkul elbow wali structure:
    // hip group (y 0.75) -> thigh (0.375) -> knee group (thigh ke neeche)
    // -> shin (0.375, knee se neeche wala hissa). Total height pehle
    // jaisi 0.75 hi hai, pair zameen par hi rehte hain.
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.125, 0.75, 0);
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    leftThigh.position.set(0, -0.187, 0);
    leftThigh.userData = { id: playerId, bodyPart: 'leg' };
    leftLeg.add(leftThigh);
    const leftKneeMesh = new THREE.Group();
    leftKneeMesh.position.set(0, -0.375, 0);
    const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    leftShin.position.set(0, -0.187, 0);
    leftShin.userData = { id: playerId, bodyPart: 'leg' };
    leftKneeMesh.add(leftShin);
    leftLeg.add(leftKneeMesh);
    steveGroup.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.125, 0.75, 0);
    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    rightThigh.position.set(0, -0.187, 0);
    rightThigh.userData = { id: playerId, bodyPart: 'leg' };
    rightLeg.add(rightThigh);
    const rightKneeMesh = new THREE.Group();
    rightKneeMesh.position.set(0, -0.375, 0);
    const rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), pantsMat);
    rightShin.position.set(0, -0.187, 0);
    rightShin.userData = { id: playerId, bodyPart: 'leg' };
    rightKneeMesh.add(rightShin);
    rightLeg.add(rightKneeMesh);
    steveGroup.add(rightLeg);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    body.position.y = 1.125;
    body.userData = { id: playerId, bodyPart: 'body' };
    steveGroup.add(body);

    // 🌟 Arms with Elbow Sub-groups/Meshes
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.375, 1.4, 0);
    const leftArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    leftArmUpper.position.set(0, -0.187, 0);
    leftArmGroup.add(leftArmUpper);
    
    const leftElbowMesh = new THREE.Group();
    leftElbowMesh.position.set(0, -0.375, 0);
    const leftArmLower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    leftArmLower.position.set(0, -0.187, 0);
    leftArmLower.userData = { id: playerId, bodyPart: 'hand' };
    leftElbowMesh.add(leftArmLower);
    leftArmGroup.add(leftElbowMesh);
    steveGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.375, 1.4, 0);
    const rightArmUpper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    rightArmUpper.position.set(0, -0.187, 0);
    rightArmGroup.add(rightArmUpper);

    const rightElbowMesh = new THREE.Group();
    rightElbowMesh.position.set(0, -0.375, 0);
    const rightArmLower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.375, 0.25), skinMat);
    rightArmLower.position.set(0, -0.187, 0);
    rightArmLower.userData = { id: playerId, bodyPart: 'hand' };
    rightElbowMesh.add(rightArmLower);
    rightArmGroup.add(rightElbowMesh);
    steveGroup.add(rightArmGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), createSteveHeadMaterials());
    head.position.y = 1.75;
    head.userData = { id: playerId, bodyPart: 'head' };
    steveGroup.add(head);

    if (applyCustoms && typeof lobbyCustomParts !== 'undefined') {
        const mapping = { head, body, leftArm: leftArmGroup, rightArm: rightArmGroup, leftLeg, rightLeg, leftElbow: leftElbowMesh, rightElbow: rightElbowMesh, leftKnee: leftKneeMesh, rightKnee: rightKneeMesh };
        partNames.forEach(name => {
            const part = mapping[name];
            const cfg = lobbyCustomParts[name];
            if (part && cfg) {
                if (name !== 'leftElbow' && name !== 'rightElbow' && name !== 'leftKnee' && name !== 'rightKnee') {
                    // Head 0.5 cube — group ki Y scale (0.9) se compensate karo.
                    if (name === 'head') part.scale.set(cfg.scale, cfg.scale / PLAYER_HEIGHT_RATIO, cfg.scale);
                    else part.scale.set(cfg.scale, cfg.scale, cfg.scale);
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                    if (name === 'head') part.position.set(0, 1.75 + cfg.posY, cfg.posZ);
                    else if (name === 'body') part.position.set(0, 1.125 + cfg.posY, cfg.posZ);
                    else if (name === 'leftArm') part.position.set(-0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'rightArm') part.position.set(0.375 + cfg.posX, 1.4 + cfg.posY, cfg.posZ);
                    else if (name === 'leftLeg') part.position.set(-0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                    else if (name === 'rightLeg') part.position.set(0.125 + cfg.posX, 0.75 + cfg.posY, cfg.posZ);
                } else {
                    part.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
                }
            }
        });
    }

    const out = { group: steveGroup, leftLeg, rightLeg, leftArmGroup, rightArmGroup, leftElbowMesh, rightElbowMesh, leftKneeMesh, rightKneeMesh, body, head, leftThigh, rightThigh, leftShin, rightShin, leftArmUpper, rightArmUpper, leftArmLower, rightArmLower };
    if (currentSkin) { try { applySkinToCharacter(out, currentSkin); } catch (e) {} }
    return out;
}

function createOtherPlayerMesh(id, playerData) {
    if (otherPlayers[id]) return;

    const steveChar = createSteveCharacter(id, true);
    // 🎨 Har player ki APNI skin — server se aayi hui skin lagao, apni
    // (currentSkin) nahi. createSteveCharacter ne currentSkin laga di hai,
    // is liye yahan uski apni skin se override karo.
    let _pSkin, _pSkinCode;
    if (typeof playerData.skin === 'string' && playerData.skin) {
        const _s = decodeSkinCode(playerData.skin);
        if (_s) { _pSkin = _s; _pSkinCode = playerData.skin; applySkinToCharacter(steveChar, _s); }
    } else if (playerData.skin === '') {
        _pSkin = null; _pSkinCode = '';
        restoreSkinToCharacter(steveChar);
    } else {
        // playerData.skin undefined hai (purana server, skin nahi aayi).
        // Apni skin mat lagao — warna doosre player par TUMHARI skin
        // dikhegi (Flash ki skin Tech par, Tech ki Flash par — cross).
        // Baked default (Alex) lagao taake cross na ho.
        const _baked = (typeof DEFAULT_SKIN_CODE === 'string' && DEFAULT_SKIN_CODE) ? decodeSkinCode(DEFAULT_SKIN_CODE) : null;
        if (_baked) { _pSkin = _baked; _pSkinCode = DEFAULT_SKIN_CODE; applySkinToCharacter(steveChar, _baked); }
        // (agar baked bhi nahi hai to currentSkin hi rehne do.)
    }
    const playerMesh = steveChar.group;

    const playerGunGroup = new THREE.Group();
    // Game ke ander doosre player ki gun: saved in-game editor pose lagti hai
    // (default: pichla shift -0.44, 1.55, 0.15). Lobby/first-person gun alag hain.
    playerGunGroup.position.set(inGameGunPosX, inGameGunPosY, inGameGunPosZ);
    playerGunGroup.rotation.set(inGameGunRotX * Math.PI / 180, inGameGunRotY * Math.PI / 180, 0);
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }));
    gunBody.position.set(0, -0.3, 0.3);
    playerGunGroup.add(gunBody);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -0.3, 0.6);
    playerGunGroup.add(barrel);

    // Registry sirf is liye hai taake panel se gun ki live position/
    // rotation badli ja sake. Click se editor khulna band hai, isliye
    // koi click/hit box nahi hai — fire hamesha goli hi chalegi.
    inGameGunGroups.push(playerGunGroup);

    playerMesh.add(playerGunGroup);
    // Body ka yaw = total look yaw - head ka offset (naya server headYaw
    // bhejta hai; purana nahi bhejta to body look ki taraf hi rehta hai).
    const bodyYaw0 = (playerData.yaw || 0) - (playerData.headYaw || 0);
    playerMesh.rotation.y = bodyYaw0 + Math.PI + inGamePlayerRotate * Math.PI / 180;
    setPlayerScale(playerMesh, inGamePlayerSize);
    playerMesh.position.set(playerData.x, playerData.y - 1.62, playerData.z);
    scene.add(playerMesh);

    // 🔫 Gun ko right hand (arm) se PIN karo — haath ke saath upar/neeche
    // jayegi. attach() world pose barkarar rakhte hue parent badalta hai,
    // is liye gun wahi rehti hai jahan editor ne rakhi thi, bas ab woh
    // haath ki child hai.
    playerGunGroup.userData.armGroup = steveChar.rightArmGroup;
    playerGunGroup.userData.playerMesh = playerMesh;
    steveChar.rightArmGroup.attach(playerGunGroup);

    const nameTag = createNameTag(playerData.name || "Player");
    nameTag.position.set(playerData.x, playerData.y + 0.58, playerData.z);
    scene.add(nameTag);

    playerMesh.traverse((child) => {
        if (child.isMesh && child.userData && child.userData.bodyPart) { targets.push(child); }
    });

    otherPlayers[id] = { mesh: playerMesh, nameTag: nameTag, isDead: false, gunGroup: playerGunGroup, parts: steveChar, skin: _pSkin, skinCode: _pSkinCode, lastYaw: (playerData.yaw || 0), lastPos: null, walkPhase: 0, walkAmount: 0, isMoving: false, isCrouching: false };
}

function setupPointerLock() {
    const blocker = document.getElementById('blocker');
    renderer.domElement.addEventListener('click', () => {
        if (gameStarted && !isLocked && !isDeadLocal) { document.body.requestPointerLock(); }
    });
    if (blocker) {
        blocker.addEventListener('click', () => {
            if (gameStarted && !isDeadLocal) { document.body.requestPointerLock(); }
        });
    }
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            isLocked = true;
            if (typeof closeInGameGunEditor === 'function') closeInGameGunEditor();
            if (blocker) blocker.style.display = 'none';
        } else {
            isLocked = false;
            if (gameStarted && !isDeadLocal && blocker) { blocker.style.display = 'flex'; }
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isLocked || !gameStarted) return;
        const mouseSensitivity = 0.002;
        pitch -= e.movementY * mouseSensitivity;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
        headYaw -= e.movementX * mouseSensitivity;
        // HEAD YAW (left/right): head sirf +/-90° tak ghoomta hai — us se
        // zyada ho to poora banda (body) ghoomta hai, taake head zyada na mude.
        const HEAD_YAW_LIMIT = Math.PI / 2;
        if (headYaw > HEAD_YAW_LIMIT) {
            yaw += headYaw - HEAD_YAW_LIMIT;
            headYaw = HEAD_YAW_LIMIT;
        } else if (headYaw < -HEAD_YAW_LIMIT) {
            yaw += headYaw + HEAD_YAW_LIMIT;
            headYaw = -HEAD_YAW_LIMIT;
        }
    });
}

function setupMobileControls() {
    if (!isMobile) return;
    const oldUI = document.getElementById('mobile-controls-ui');
    if (oldUI) oldUI.remove();
    const ui = document.createElement('div');
    ui.id = 'mobile-controls-ui';
    ui.style.position = 'fixed';
    ui.style.top = '0'; ui.style.left = '0'; ui.style.width = '100vw'; ui.style.height = '100vh';
    ui.style.pointerEvents = 'none'; ui.style.zIndex = '99999';
    ui.innerHTML = `
        <div id="joystick-zone" style="position: absolute; bottom: 20px; left: 20px; width: 140px; height: 140px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; pointer-events: auto; touch-action: none;">
            <div id="joystick-thumb" style="position: absolute; top: 45px; left: 45px; width: 50px; height: 50px; background: rgba(0,255,204,0.7); border-radius: 50%; pointer-events: none;"></div>
        </div>
    `;
    document.body.appendChild(ui);
}

function performJump() {
    if (!canJump || isCrouching || isDeadLocal || !gameStarted) return false;
    velocity.y = 8.5;
    canJump = false;
    playSound('jump');
    return true;
}

function onKeyDown(e) {
    if (!gameStarted) return;
    const _chatInput = document.getElementById('chat-input');
    if (_chatInput && document.activeElement === _chatInput) return;

    if (e.code === 'KeyT') {
        const chatInputWrapper = document.getElementById('chat-input-wrapper');
        const chatInput = document.getElementById('chat-input');
        if (chatInputWrapper && chatInput && document.activeElement !== chatInput) {
            e.preventDefault();
            chatInputWrapper.style.display = 'flex';
            chatInput.focus();
            document.exitPointerLock();
            return;
        }
    }

    if (e.code === 'KeyG' && gameStarted && !isDeadLocal) {
        if (isInGameGunEditing) closeInGameGunEditor(); else openInGameGunEditor();
        return;
    }

    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': isCrouching = true; break;
        case 'Space': performJump(); break;
    }
}

function onKeyUp(e) {
    if (!gameStarted) return;
    const _chatInput = document.getElementById('chat-input');
    if (_chatInput && document.activeElement === _chatInput) return;
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': isCrouching = false; break;
    }
}

function shoot(e) {
    if (!isLocked || e.button !== 0 || isDeadLocal || !gameStarted) return;
    if (isInGameGunEditing) return;
    // EDITOR SIRF G SE: bande par fire karne se editor KABHI nahi khulega.
    // Click hamesha goli hi hai — gun click wala rasta poora hata diya
    // hai, kyunki wo fire karte waqt panel khol deta tha aur banda
    // marta hi nahi tha. Panel kholne ke liye sirf G dabao.
    playSound('shoot');
    muzzleFlash.visible = true;
    setTimeout(() => { muzzleFlash.visible = false; }, 60);

    scene.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        if (hitMesh.userData && hitMesh.userData.id) {
            const targetId = hitMesh.userData.id;
            const part = hitMesh.userData.bodyPart;
            let damage = part === 'head' ? 100 : 50;
            triggerHitMarker(part === 'head');
            playSound('hit');
            spawnBloodSplatter(intersects[0].point);
            socket.emit('playerHit', { targetId, damage, x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z });
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) {
        try {
            if (clock) clock.getDelta();
            if (gun) gun.visible = false;
            if (!lobbyCharacter) { try { createLobbyCharacter(); } catch (e) {} }
            if (lobbyScene && lobbyCamera && renderer) {
                lobbyCamera.aspect = window.innerWidth / window.innerHeight;
                lobbyCamera.updateProjectionMatrix();
                lobbyCamera.position.set(0, 1.4, 3.4);
                lobbyCamera.lookAt(0, lobbyPlayerSize * PLAYER_HEIGHT_RATIO, 0);
                renderer.render(lobbyScene, lobbyCamera);
            }
        } catch (e) {}
        return;
    }

    const delta = clock.getDelta();
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw + headYaw;
    camera.rotation.x = pitch;

    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const p = bloodParticles[i];
        p.life -= delta;
        p.velocity.y -= 15 * delta;
        p.mesh.position.addScaledVector(p.velocity, delta);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            bloodParticles.splice(i, 1);
        }
    }

    Object.keys(otherPlayers).forEach(id => {
        const p = otherPlayers[id];
        if (p.isDead) {
            p.mesh.rotation.order = 'YXZ';
            p.mesh.rotation.x = THREE.MathUtils.lerp(p.mesh.rotation.x, -Math.PI / 2, delta * 8);
            p.mesh.rotation.z = THREE.MathUtils.lerp(p.mesh.rotation.z, -0.5, delta * 8);
            p.mesh.position.y = THREE.MathUtils.lerp(p.mesh.position.y, 0.2, delta * 8);

            p.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            m.transparent = true;
                            m.opacity = Math.max(0, m.opacity - delta * 0.35);
                        });
                    } else {
                        child.material.transparent = true;
                        child.material.opacity = Math.max(0, child.material.opacity - delta * 0.35);
                    }
                }
            });

            if (p.nameTag && p.nameTag.material) {
                p.nameTag.material.opacity = Math.max(0, p.nameTag.material.opacity - delta * 0.35);
                if (p.nameTag.material.opacity <= 0.05) {
                    p.nameTag.visible = false;
                }
            }
        } else if (p.parts && p.parts.leftLeg && p.parts.leftKneeMesh && p.parts.rightLeg && p.parts.rightKneeMesh) {
            // 🚶 WALK ANIMATION (knee joint se neeche wala hissa):
            // Server isMoving bhejta hai, aur position change bhi check
            // hoti hai, taake packet miss bhi ho to walk na ruke.
            // Local +Z = chalne ki direction (mesh +PI rotate ke baad):
            // thigh aage jhule to rotation.x negative, aur us waqt knee
            // bend positive hota hai taake shin (knee se neeche) peeche
            // ki taraf mude — bilkul insan ke ghutne ki tarah. Rukne par
            // walkAmount dheere dheere 0 ho jata hai, taake pair jhatke
            // se seedhe na hon, smoothly apni base pose par aa jayen.
            let speed = 0;
            if (p.lastPos) {
                const dx = p.mesh.position.x - p.lastPos.x;
                const dz = p.mesh.position.z - p.lastPos.z;
                speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
            }
            p.lastPos = p.mesh.position.clone();
            const moving = p.isMoving || speed > 0.8;
            p.walkAmount = THREE.MathUtils.lerp(p.walkAmount || 0, moving ? 1 : 0, delta * 8);
            if (moving) p.walkPhase = (p.walkPhase || 0) + delta * (6 + Math.min(speed, 14) * 0.55);
            const ph = p.walkPhase || 0;
            const amt = p.walkAmount || 0;
            const baseLegL = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftLeg) ? lobbyCustomParts.leftLeg.rotX : 0;
            const baseLegR = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightLeg) ? lobbyCustomParts.rightLeg.rotX : 0;
            const baseKneeL = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftKnee) ? lobbyCustomParts.leftKnee.rotX : 0;
            const baseKneeR = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightKnee) ? lobbyCustomParts.rightKnee.rotX : 0;
            const swingL = Math.sin(ph) * 0.55;
            const swingR = Math.sin(ph + Math.PI) * 0.55;
            const kneeL = Math.max(0, Math.sin(ph - 0.5)) * 0.95;
            const kneeR = Math.max(0, Math.sin(ph + Math.PI - 0.5)) * 0.95;
            // CROUCH POSE (Shift): halki bend — thigh aage -0.6, knee
            // +1.1, taake pair zameen par rahen aur banda zameen me na
            // ghuse. crouchAmount smooth in/out hota hai, aur walk ke
            // saath bhi chalta hai (crouch-walk).
            p.crouchAmount = THREE.MathUtils.lerp(p.crouchAmount || 0, p.isCrouching ? 1 : 0, delta * 8);
            const cr = p.crouchAmount || 0;
            p.parts.leftLeg.rotation.x = baseLegL - swingL * amt - crouchHip * cr;
            p.parts.rightLeg.rotation.x = baseLegR - swingR * amt - crouchHip * cr;
            applyKneeBend(p.parts.leftKneeMesh, p.parts.leftLeg.rotation, lobbyCustomParts.leftKnee, kneeL * amt + crouchKnee * cr);
            applyKneeBend(p.parts.rightKneeMesh, p.parts.rightLeg.rotation, lobbyCustomParts.rightKnee, kneeR * amt + crouchKnee * cr);
            // HEAD + HANDS PITCH (mouse up/down): jab player upar/neeche
            // dekhe to head aur haath (arms) halka sa jhukein, taake doosre
            // players ko pata chale. Torso nahi jhukta. Pitch server se
            // aata hai (playerMovement -> playerMoved). Upar dekhne par
            // pitch positive hota hai, to head/haath peeche (upar) jhukte hain.
            p.smoothPitch = THREE.MathUtils.lerp(p.smoothPitch || 0, p.lastPitch || 0, delta * 8);
            const baseHeadRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.head) ? lobbyCustomParts.head.rotX : 0;
            const baseHeadRotY = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.head) ? lobbyCustomParts.head.rotY : 0;
            const baseArmLRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.leftArm) ? lobbyCustomParts.leftArm.rotX : 0;
            const baseArmRRotX = (typeof lobbyCustomParts !== 'undefined' && lobbyCustomParts.rightArm) ? lobbyCustomParts.rightArm.rotX : 0;
            if (p.parts.head) p.parts.head.rotation.x = baseHeadRotX - (p.smoothPitch || 0) * 0.4;
            // HEAD YAW (left/right): head body se +/-90° tak ghoomta hai.
            p.smoothHeadYaw = THREE.MathUtils.lerp(p.smoothHeadYaw || 0, p.lastHeadYaw || 0, delta * 8);
            if (p.parts.head) p.parts.head.rotation.y = baseHeadRotY + (p.smoothHeadYaw || 0);
            if (p.parts.leftArmGroup) p.parts.leftArmGroup.rotation.x = baseArmLRotX - (p.smoothPitch || 0) * 0.4;
            if (p.parts.rightArmGroup) p.parts.rightArmGroup.rotation.x = baseArmRRotX - (p.smoothPitch || 0) * 0.4;
            // Gun haath se pinned hai (rightArmGroup ki child), is liye woh
            // khud hi haath ke saath upar/neeche jati hai — yahan alag se
            // pitch lagane ki zaroorat nahi.
        }
    });

    if ((isLocked || isMobile) && !isDeadLocal) {
        targetPlayerHeight = isCrouching ? 1.0 : 1.62;
        playerHeight += (targetPlayerHeight - playerHeight) * 15.0 * delta;
        let moveSpeed = isCrouching ? 4.0 : 8.0;

        let inputX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
        let inputZ = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0);
        const isMoving = (inputX !== 0 || inputZ !== 0);

        const moveVector = new THREE.Vector3();
        if (isMoving) {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + headYaw);
            const side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + headYaw);
            moveVector.addScaledVector(forward, inputZ);
            moveVector.addScaledVector(side, inputX);
            moveVector.normalize();
        }

        camera.position.addScaledVector(moveVector, moveSpeed * delta);
        velocity.y -= 32.0 * delta; 
        camera.position.y += velocity.y * delta;

        if (camera.position.y <= playerHeight) {
            velocity.y = 0;
            canJump = true;
            camera.position.y = playerHeight;
        }

        socket.emit('playerMovement', {
            x: camera.position.x, y: camera.position.y, z: camera.position.z,
            // yaw = TOTAL look direction (body + head), headYaw = head ka
            // offset. Purana server sirf yaw bhejta hai (to body look ki
            // taraf hi rehta hai, face sahi rehta hai); naya server
            // headYaw bhi bhejta hai (to head alag ghoomta hai).
            yaw: yaw + headYaw, headYaw: headYaw, pitch: pitch, isMoving: isMoving, isCrouching: isCrouching
        });
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}