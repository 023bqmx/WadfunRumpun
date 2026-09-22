const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minigameOverlay = document.getElementById('minigame-overlay');

const charModal = document.getElementById('minigame-char-modal');
const charBox = document.getElementById('minigame-char-box');
const charList = document.getElementById('minigame-char-list');

const questionModal = document.getElementById('question-modal');
const questionBox = document.getElementById('question-box');
const questionText = document.getElementById('question-text');
const choiceContainer = document.getElementById('choice-container');

// ตัวแปรเก็บตัวละครที่เลือกสำหรับรับรางวัล
let selectedMiniGameChar = "";
let selectedMiniGameRole = "";

// ปรับขนาด Canvas ให้พอดีจอ
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let gameLoopId;
let gameActive = false;

// ข้อมูลผู้เล่นในเกม
const player = {
    x: 50, y: 100, width: 40, height: 40,
    vx: 0, vy: 0, speed: 5, jumpPower: -12,
    grounded: false, color: '#e52521' // สีแดงมาริโอ้
};

let blocks = [];
const keys = { left: false, right: false, jump: false };

// ฐานข้อมูลคำถาม
const questions = [
    { q: "1 + 1 = ?", choices: ["2", "8", "10"], ans: "2" },
    { q: "10 x 5 = ?", choices: ["15", "50", "105"], ans: "50" },
    { q: "50 + 50 = ?", choices: ["90", "100", "200"], ans: "100" },
    { q: "100 - 45 = ?", choices: ["45", "55", "65"], ans: "55" },
    { q: "12 x 12 = ?", choices: ["124", "144", "164"], ans: "144" }
];

// --- 1. ระบบเลือกตัวละครก่อนเริ่มเกม ---
function prepareMiniGame() {
    const history = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');
    const charMap = {};
    history.forEach(item => {
        if(!charMap[item.charName]) charMap[item.charName] = item.role;
    });
    
    const uniqueChars = Object.keys(charMap);
    
    // ถ้าไม่เคยมีประวัติตัวละครเลย ให้ข้ามเกมไปเลย เพราะไม่รู้จะบวกคะแนนให้ใคร
    if (uniqueChars.length === 0) {
        checkNoticePopup();
        return;
    }

    // แสดงหน้าจอ Overlay ของเกม
    minigameOverlay.style.display = 'flex';
    minigameOverlay.style.animation = 'popupOpen 0.5s ease forwards';
    
    // สร้างปุ่มเลือกตัวละคร
    charList.innerHTML = '';
    uniqueChars.forEach(char => {
        const btn = document.createElement('button');
        btn.className = "w-full py-3 bg-blue-50 border-2 border-blue-200 rounded-xl font-bold text-blue-800 hover:bg-blue-100 active:scale-95 transition-all";
        btn.innerHTML = `${char} <br><span class="text-[10px] text-blue-500 font-normal">(${charMap[char]})</span>`;
        btn.onclick = () => {
            selectedMiniGameChar = char;
            selectedMiniGameRole = charMap[char];
            
            // ปิด Modal เลือกตัวละคร แล้วเริ่มเกม
            charModal.classList.add('opacity-0');
            setTimeout(() => {
                charModal.style.display = 'none';
                startMiniGameEngine(); // เข้าสู่เกมเพลย์
            }, 300);
        };
        charList.appendChild(btn);
    });
    
    // โชว์ Modal
    charModal.style.display = 'flex';
    setTimeout(() => {
        charModal.classList.remove('opacity-0');
        charBox.classList.remove('scale-90');
    }, 10);
}

function skipMiniGame() {
    charModal.classList.add('opacity-0');
    minigameOverlay.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => {
        charModal.style.display = 'none';
        minigameOverlay.style.display = 'none';
        checkNoticePopup(); // กลับไปหน้าปกติ
    }, 500);
}

// --- 2. ระบบเกมเพลย์ (Platformer) ---
function initGame() {
    player.x = 50;
    player.y = canvas.height - 100;
    player.vx = 0;
    player.vy = 0;
    
    blocks = [
        { x: canvas.width / 2 - 25, y: canvas.height - 220, w: 50, h: 50, color: '#facc15', type: 'lucky', hit: false }
    ];
}

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');

btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; });
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; });
btnJump.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    if(player.grounded) { player.vy = player.jumpPower; player.grounded = false; }
});

function update() {
    if(!gameActive) return;

    if (keys.left) player.vx = -player.speed;
    else if (keys.right) player.vx = player.speed;
    else player.vx = 0;

    player.vy += 0.6; // Gravity
    player.x += player.vx;
    player.y += player.vy;
    player.grounded = false;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    const groundY = canvas.height - 50;
    if (player.y + player.height >= groundY) {
        player.y = groundY - player.height;
        player.vy = 0;
        player.grounded = true;
    }

    // เช็คชนกล่อง Lucky Block
    blocks.forEach(block => {
        if (player.x < block.x + block.w && player.x + player.width > block.x &&
            player.y < block.y + block.h && player.y + player.height > block.y) {
            
            // โหม่งใต้กล่อง
            if (player.vy < 0 && player.y > block.y + block.h - 15) {
                player.y = block.y + block.h;
                player.vy = 0; 
                
                if(!block.hit) {
                    block.hit = true;
                    block.color = '#854d0e'; // เปลี่ยนสีเป็นกล่องพัง
                    triggerQuestion();
                }
            } 
            // เหยียบกล่อง
            else if (player.vy > 0 && player.y + player.height < block.y + 15) {
                player.y = block.y - player.height;
                player.vy = 0;
                player.grounded = true;
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#65a30d'; // พื้นหญ้า
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = '#854d0e'; // พื้นดิน
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    blocks.forEach(block => {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(block.x, block.y, block.w, block.h);
        
        if(!block.hit) {
            ctx.fillStyle = '#fff';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', block.x + block.w/2, block.y + block.h/2);
        }
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#fff'; // ลูกตาตัวละคร
    ctx.fillRect(player.x + (keys.left ? 5 : 25), player.y + 5, 10, 10);
}

function loop() {
    if(gameActive) {
        update();
        draw();
        gameLoopId = requestAnimationFrame(loop);
    }
}

function startMiniGameEngine() {
    initGame();
    gameActive = true;
    loop();
}

// --- 3. ระบบคำถาม และ จบเกม ---
function triggerQuestion() {
    gameActive = false; // หยุดเกมชั่วคราว
    
    const qData = questions[Math.floor(Math.random() * questions.length)];
    questionText.innerText = qData.q;
    choiceContainer.innerHTML = '';
    
    qData.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = "w-full py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-yellow-50 hover:border-yellow-400 active:scale-95 transition-all";
        btn.innerText = choice;
        btn.onclick = () => checkAnswer(choice, qData.ans);
        choiceContainer.appendChild(btn);
    });

    questionModal.style.display = 'flex';
    setTimeout(() => {
        questionModal.classList.remove('opacity-0');
        questionBox.classList.remove('scale-90');
    }, 10);
}

function checkAnswer(selected, correct) {
    if (selected === correct) {
        alert(`🎉 ถูกต้อง! ระบบกำลังเพิ่มโบนัส 100 คะแนนให้กับ [${selectedMiniGameChar}]`);
        
        // กรอกข้อมูลลงฟอร์มในหน้าแรกให้อัตโนมัติ
        document.getElementById('charName').value = selectedMiniGameChar;
        document.getElementById('role').value = selectedMiniGameRole;
        document.getElementById('genScore').value = 100;
        document.getElementById('bonusScore').value = 0;
        document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
        
        exitMiniGame(true);
    } else {
        alert('❌ ผิดจ้า! พลาดคะแนนไปอย่างน่าเสียดาย');
        exitMiniGame(false);
    }
}

function exitMiniGame(isWin) {
    questionModal.classList.add('opacity-0');
    minigameOverlay.style.animation = 'fadeOut 0.5s ease forwards';
    
    setTimeout(() => {
        questionModal.style.display = 'none';
        minigameOverlay.style.display = 'none';
        cancelAnimationFrame(gameLoopId);
        
        if(isWin) {
            // ถ้าชนะ ให้สลับไปหน้าฟอร์ม และสั่งกดปุ่ม Submit ส่งข้อมูลเข้า Sheet อัตโนมัติเลย
            switchTab('form');
            document.getElementById('scoreForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
        
        // เรียก Popup แจ้งเตือนปกติ
        checkNoticePopup();
    }, 500);
}