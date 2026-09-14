// อัปเดตเป็นลิงก์ล่าสุดของคุณ
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuDHBtDE18IMgJaaXCPWbNz88IpSCfaQGjjfiDZKSRSglBNuYYPwfawG9Q0vxHPHb7/exec"; 

let currentSortMode = 'general';
let mockLeaderboardData = []; 
let currentHistoryFilter = null; 

const splash = document.getElementById('splash-screen');
const bgMusic = document.getElementById('bg-music');
const musicToggleBtn = document.getElementById('music-toggle');

// เปิดหน้าจอ
splash.addEventListener('click', () => {
    splash.style.animation = 'fadeOut 0.8s forwards';
    bgMusic.volume = 0.5; 
    bgMusic.play().catch(e => console.log("Audio play blocked by browser:", e));
    musicToggleBtn.classList.remove('hidden');

    bgMusic.onended = function() {
        const icon = musicToggleBtn.querySelector('i');
        icon.className = 'fas fa-volume-mute';
        musicToggleBtn.classList.add('opacity-50', 'bg-gray-100');
    };

    setTimeout(() => {
        splash.style.display = 'none';
        checkNoticePopup(); 
    }, 800);
});

function toggleMusic() {
    const icon = musicToggleBtn.querySelector('i');
    if (bgMusic.paused) {
        if (bgMusic.currentTime >= bgMusic.duration) bgMusic.currentTime = 0;
        bgMusic.play();
        icon.className = 'fas fa-music';
        musicToggleBtn.classList.remove('opacity-50', 'bg-gray-100');
    } else {
        bgMusic.pause();
        icon.className = 'fas fa-volume-mute';
        musicToggleBtn.classList.add('opacity-50', 'bg-gray-100');
    }
}

// ระบบประกาศแจ้งเตือน
function checkNoticePopup() {
    const hideNotice = localStorage.getItem('rp_hideNotice');
    if (!hideNotice) openNotice();
}

function openNotice() {
    const modal = document.getElementById('notice-modal');
    const content = document.getElementById('notice-content');
    modal.classList.remove('hidden');
    content.style.animation = 'none';
    void content.offsetWidth;
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    content.style.animation = 'popupOpen 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
}

function closeNotice(neverShowAgain) {
    if (neverShowAgain) localStorage.setItem('rp_hideNotice', 'true');
    const modal = document.getElementById('notice-modal');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

// เตรียมข้อมูลประวัติให้มี ID
function patchHistoryData() {
    let history = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');
    let needsUpdate = false;
    history = history.map(item => {
        if (!item.id) {
            item.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            needsUpdate = true;
        }
        return item;
    });
    if (needsUpdate) localStorage.setItem('rp_ScoreHistory', JSON.stringify(history));
}

document.addEventListener('DOMContentLoaded', () => {
    patchHistoryData();
    document.getElementById('charName').value = localStorage.getItem('rp_savedCharName') || '';
    document.getElementById('role').value = localStorage.getItem('rp_savedRole') || '';
    document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
    
    renderRecentChars(); 
    loadHistory();
});

// เปลี่ยนแท็บเมนู
function switchTab(tabName) {
    ['form', 'history', 'leaderboard'].forEach(t => {
        document.getElementById(`sec-${t}`).classList.add('hidden-section');
        document.getElementById(`btn-${t}`).classList.remove('tab-active', 'text-red-900');
        document.getElementById(`btn-${t}`).classList.add('text-gray-400');
    });
    
    document.getElementById(`sec-${tabName}`).classList.remove('hidden-section');
    const activeBtn = document.getElementById(`btn-${tabName}`);
    activeBtn.classList.add('tab-active', 'text-red-900');
    activeBtn.classList.remove('text-gray-400');

    if (tabName === 'history') loadHistory();
    if (tabName === 'leaderboard') loadLeaderboard(); 
    if (tabName === 'form') renderRecentChars();
}

// สร้างปุ่มกรอกชื่ออัตโนมัติ
function renderRecentChars() {
    const history = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');
    const charMap = {};
    history.forEach(item => {
        if(!charMap[item.charName]) charMap[item.charName] = item.role;
    });

    const charNames = Object.keys(charMap);
    const container = document.getElementById('recent-chars-container');
    container.innerHTML = '';

    if(charNames.length > 0) {
        container.classList.remove('hidden');
        
        const label = document.createElement('span');
        label.className = "text-[10px] text-gray-400 py-1 flex-shrink-0 flex items-center";
        label.innerHTML = '<i class="fas fa-history mr-1"></i> เคยใช้:';
        container.appendChild(label);

        charNames.forEach(name => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = "text-[11px] font-bold bg-white text-gray-600 border border-gray-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors flex-shrink-0 shadow-sm";
            btn.innerText = name;
            btn.onclick = () => {
                document.getElementById('charName').value = name;
                document.getElementById('role').value = charMap[name];
            };
            container.appendChild(btn);
        });
    } else {
        container.classList.add('hidden');
    }
}

// ฟังก์ชันกดส่งข้อมูล
document.getElementById('scoreForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> กำลังบันทึก...';
    btn.disabled = true;

    const charName = document.getElementById('charName').value.trim();
    const role = document.getElementById('role').value.trim();
    const genScore = parseInt(document.getElementById('genScore').value) || 0;
    const bonusScore = parseInt(document.getElementById('bonusScore').value) || 0;
    const date = document.getElementById('recordDate').value;
    
    localStorage.setItem('rp_savedCharName', charName);
    localStorage.setItem('rp_savedRole', role);

    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const formData = {
        id: Date.now().toString(),
        charName: charName,
        role: role,
        genScore: genScore,
        bonusScore: bonusScore,
        date: date,
        time: timeString
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(formData),
        mode: 'no-cors'
    })
    .then(() => {
        saveHistoryToLocal(formData); 
        alert("📝 บันทึกข้อมูลเข้าคลังสำเร็จ!");
        
        document.getElementById('genScore').value = '';
        document.getElementById('bonusScore').value = '';
        
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        renderRecentChars(); 
        
        currentHistoryFilter = charName;
    })
    .catch(err => {
        console.error(err);
        alert("⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    });
});

function saveHistoryToLocal(data) {
    let history = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');
    history.unshift(data);
    localStorage.setItem('rp_ScoreHistory', JSON.stringify(history));
    loadHistory();
}

function setHistoryFilter(filterValue) {
    currentHistoryFilter = filterValue;
    loadHistory();
}

// ฟังก์ชันโหลดข้อมูลประวัติ
function loadHistory() {
    const list = document.getElementById('history-list');
    const genBalanceDisplay = document.getElementById('local-gen-balance');
    const bonusBalanceDisplay = document.getElementById('local-bonus-balance');
    const filterContainer = document.getElementById('char-filter-container');
    const filterNameDisplay = document.getElementById('display-filter-name');
    
    list.innerHTML = "";
    filterContainer.innerHTML = "";
    const data = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');

    const uniqueChars = [...new Set(data.map(item => item.charName))];

    if (uniqueChars.length > 0) {
        if (!currentHistoryFilter || !uniqueChars.includes(currentHistoryFilter)) {
            currentHistoryFilter = uniqueChars[0]; 
        }
    } else {
        currentHistoryFilter = null;
    }

    if (uniqueChars.length > 1) {
        filterContainer.classList.remove('hidden');
        
        uniqueChars.forEach(char => {
            const btn = document.createElement('button');
            const isActive = currentHistoryFilter === char;
            btn.className = `px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 shadow-sm border ${isActive ? 'bg-red-800 text-white border-red-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50'}`;
            btn.innerText = char;
            btn.onclick = () => setHistoryFilter(char);
            filterContainer.appendChild(btn);
        });
    } else {
        filterContainer.classList.add('hidden');
    }

    let filteredData = [];
    if (currentHistoryFilter) {
        filteredData = data.filter(item => item.charName === currentHistoryFilter);
        filterNameDisplay.innerText = `(${currentHistoryFilter})`;
    } else {
        filterNameDisplay.innerText = '';
    }

    let totalGenPoints = 0;
    let totalBonusPoints = 0;

    if(filteredData.length === 0) {
        list.innerHTML = `
            <div class="text-center py-10 text-gray-400">
                <i class="fas fa-box-open text-3xl mb-2"></i>
                <p class="text-sm">ยังไม่มีประวัติการบันทึก</p>
            </div>`;
        genBalanceDisplay.innerHTML = `0`;
        bonusBalanceDisplay.innerHTML = `0`;
        return;
    }

    filteredData.forEach(item => {
        totalGenPoints += (parseInt(item.genScore) || 0);
        totalBonusPoints += (parseInt(item.bonusScore) || 0);
    });
    
    genBalanceDisplay.innerHTML = `${totalGenPoints.toLocaleString()}`;
    bonusBalanceDisplay.innerHTML = `${totalBonusPoints.toLocaleString()}`;

    filteredData.forEach((item) => {
        const dateObj = new Date(item.date);
        const displayDate = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });

        const div = document.createElement('div');
        div.className = "card-rp p-4 flex flex-col gap-2 animate-fade-in border-l-4 border-l-red-800 relative group";
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold text-gray-800 text-sm">${item.charName} <span class="text-xs text-gray-500 font-normal">(${item.role})</span></div>
                    <div class="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                        <i class="far fa-calendar-alt"></i> ${displayDate} | <i class="far fa-clock"></i> ${item.time || '-'}
                    </div>
                </div>
                <button onclick="deleteHistoryItem('${item.id}')" class="text-gray-300 hover:text-red-500 transition-colors p-1">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
            <div class="flex justify-between items-center mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <div class="text-xs text-gray-600">
                    ทั่วไป: <span class="text-blue-700 font-bold">+${item.genScore}</span><br>
                    โบนัส: <span class="text-green-700 font-bold">+${item.bonusScore}</span>
                </div>
                <div class="text-right">
                    <span class="text-sm font-bold text-red-800">${(parseInt(item.genScore) + parseInt(item.bonusScore)).toLocaleString()}</span>
                    <span class="text-[10px] text-gray-500 block">รวมรอบนี้</span>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function deleteHistoryItem(id) {
    if(!confirm("ต้องการลบประวัติรายการนี้ใช่หรือไม่?")) return;
    let history = JSON.parse(localStorage.getItem('rp_ScoreHistory') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('rp_ScoreHistory', JSON.stringify(history)); 
    loadHistory(); 
    renderRecentChars(); 
}

function clearAllHistory() {
    if(confirm("คำเตือน: คุณต้องการล้างประวัติส่วนตัวในเครื่องทั้งหมดหรือไม่? ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้")) {
        localStorage.removeItem('rp_ScoreHistory');
        currentHistoryFilter = null;
        loadHistory();
        renderRecentChars();
    }
}

// หน้าลีดเดอร์บอร์ด
function setSortMode(mode) {
    currentSortMode = mode;
    
    const btnGen = document.getElementById('btn-sort-gen');
    const btnBonus = document.getElementById('btn-sort-bonus');
    
    if(mode === 'general') {
        btnGen.className = "flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white text-red-800 shadow-sm border border-gray-200";
        btnBonus.className = "flex-1 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700";
    } else {
        btnBonus.className = "flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-white text-red-800 shadow-sm border border-gray-200";
        btnGen.className = "flex-1 py-2 text-sm font-bold rounded-lg transition-all text-gray-500 hover:text-gray-700";
    }
    
    renderLeaderboardList();
}

function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    const loader = document.getElementById('leaderboard-loader');
    
    list.innerHTML = "";
    loader.style.display = 'flex';
    
    setTimeout(() => {
        loader.classList.remove('opacity-0');
        loader.classList.add('opacity-100');
    }, 10);
    
    // 🔥 เพิ่มส่วนป้องกันการ Cache ข้อมูลเก่า (Cache-busting)
    const fetchUrl = SCRIPT_URL + "?t=" + new Date().getTime();
    
    const fetchData = fetch(fetchUrl).then(response => response.json());
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
    
    Promise.all([fetchData, minLoadTime])
        .then(([data]) => {
            mockLeaderboardData = data; 
            
            loader.classList.remove('opacity-100');
            loader.classList.add('opacity-0');
            
            setTimeout(() => {
                loader.style.display = 'none';
                renderLeaderboardList(); 
            }, 500);
        })
        .catch(error => {
            console.error("Error fetching leaderboard:", error);
            
            loader.classList.remove('opacity-100');
            loader.classList.add('opacity-0');
            
            setTimeout(() => {
                loader.style.display = 'none';
                list.innerHTML = `<div class="text-center text-red-600 py-10">⚠️ จวนเกิดความวุ่นวาย ไม่สามารถเชื่อมต่อคลังข้อมูลได้</div>`;
            }, 500);
        });
}

function renderLeaderboardList() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = "";

    if (mockLeaderboardData.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-500 py-10">ยังไม่มีข้อมูลอันดับในยุทธภพ</div>`;
        return;
    }

    let sortedData = [...mockLeaderboardData].sort((a, b) => {
        if (currentSortMode === 'general') {
            return b.genScore - a.genScore;
        } else {
            return b.bonusScore - a.bonusScore;
        }
    });

    sortedData.forEach((item, index) => {
        let rankStyle = "bg-white border-gray-100 text-gray-700";
        let rankIcon = `<span class="text-gray-500 font-bold text-lg">${index+1}</span>`;
        let containerClass = "animate-fade-in"; 
        
        if(index === 0) { 
            rankStyle = "bg-red-50 border-red-300 shadow-md";
            rankIcon = `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-xl shadow-lg ring-2 ring-red-200"><i class="fas fa-crown"></i></div>`;
            containerClass += " my-3 z-10 border-2 border-red-300 shadow-[0_4px_20px_rgba(153,27,27,0.15)]";
        } 
        else if(index === 1) { 
            rankStyle = "bg-amber-50 border-amber-300 shadow-sm";
            rankIcon = `<div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold border border-amber-200 shadow-sm">2</div>`;
            containerClass += " my-2 border-2 border-amber-200";
        }
        else if(index === 2) { 
            rankStyle = "bg-purple-50 border-purple-300 shadow-sm";
            rankIcon = `<div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-bold border border-purple-200 shadow-sm">3</div>`;
            containerClass += " my-2 border-2 border-purple-200";
        }
        else if(index === 3) { 
            rankStyle = "bg-blue-50 border-blue-300 shadow-sm";
            rankIcon = `<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold border border-blue-200 shadow-sm">4</div>`;
            containerClass += " my-2 border-2 border-blue-200";
        }
        else if(index === 4) { 
            rankStyle = "bg-emerald-50 border-emerald-300 shadow-sm";
            rankIcon = `<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold border border-emerald-200 shadow-sm">5</div>`;
            containerClass += " my-2 border-2 border-emerald-200";
        }
        else {
            rankIcon = `<div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">${index+1}</div>`;
        }

        const card = document.createElement('div');
        card.className = `relative flex items-center p-3 sm:p-4 rounded-2xl border ${rankStyle} ${containerClass}`;
        card.style.animationDelay = `${index * 0.1}s`;

        const displayScore = currentSortMode === 'general' ? item.genScore : item.bonusScore;
        const scoreLabel = currentSortMode === 'general' ? 'ทั่วไป' : 'โบนัส';
        const scoreColor = currentSortMode === 'general' ? 'text-blue-700' : 'text-green-700';

        card.innerHTML = `
            <div class="w-10 sm:w-12 flex-shrink-0 flex justify-center items-center mr-1">${rankIcon}</div>
            
            <div class="flex-1 min-w-0 px-2 flex flex-col justify-center">
                <div class="font-bold text-gray-800 text-base break-words">
                    ${item.name}
                </div>
                <div class="text-[11px] text-gray-500">${item.role}</div>
            </div>

            <div class="flex flex-col items-end gap-1 flex-shrink-0 pl-1">
                <div class="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 min-w-[90px] justify-end">
                    <span class="text-sm font-bold ${scoreColor}">${displayScore.toLocaleString()}</span>
                </div>
                <span class="text-[10px] text-gray-400">คะแนน${scoreLabel}</span>
            </div>`;
        list.appendChild(card);
    });
}