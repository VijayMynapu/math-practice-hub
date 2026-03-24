// --- APP STATE & STORAGE ---
let appData = JSON.parse(localStorage.getItem('mathHubData')) || {};
let lifetimeAvg = 0, todayAvg = 0;

// --- INIT ---
function getTodayStr() { return new Date().toLocaleDateString('en-GB'); } // DD/MM/YYYY

function calculateMetrics() {
    let totalDailyAverages = 0;
    let daysCount = 0;
    let todayStr = getTodayStr();
    todayAvg = 0;
    
    let lifetimeOpStats = {};

    for (const [date, data] of Object.entries(appData)) {
        if (data.exams && data.exams.length > 0) {
            let dayTotalPerf = 0, dayOpCount = 0;
            data.exams.forEach(exam => {
                for (const op in exam) {
                    dayTotalPerf += (exam[op].totalPerf / exam[op].count);
                    dayOpCount++;

                    if (!lifetimeOpStats[op]) {
                        lifetimeOpStats[op] = { totalPerf: 0, count: 0 };
                    }
                    lifetimeOpStats[op].totalPerf += exam[op].totalPerf;
                    lifetimeOpStats[op].count += exam[op].count;
                }
            });
            let dayAvg = dayOpCount > 0 ? (dayTotalPerf / dayOpCount) : 0;
            data.dailyScore = Math.round(dayAvg);
            
            totalDailyAverages += data.dailyScore;
            daysCount++;

            if (date === todayStr) todayAvg = data.dailyScore;
        }
    }
    lifetimeAvg = daysCount > 0 ? Math.round(totalDailyAverages / daysCount) : 0;
    
    document.getElementById('hdrLifetimePerf').innerText = lifetimeAvg;
    document.getElementById('popLifetime').innerText = lifetimeAvg + "%";
    document.getElementById('popToday').innerText = todayAvg + "%";

    let opsHtml = '';
    for (const op in lifetimeOpStats) {
        let opAvg = Math.round(lifetimeOpStats[op].totalPerf / lifetimeOpStats[op].count);
        opsHtml += `<div class="op-row"><span>- ${op}:</span> <span style="font-weight: bold;">${opAvg}%</span></div>`;
    }
    if (opsHtml === '') opsHtml = `<div style="font-size: 11px; text-align: center; color: #888;">No exam data yet.</div>`;
    document.getElementById('popLifetimeOps').innerHTML = opsHtml;
    
    renderSidebar();
}

function renderSidebar() {
    const list = document.getElementById('sessionList');
    list.innerHTML = '';
    let todayStr = getTodayStr();

    let tScore = appData[todayStr] ? (appData[todayStr].dailyScore || 0) : 0;
    list.innerHTML += `<li class="session-item today"><span>Today (${todayStr})</span><span class="session-score">${tScore}%</span></li>`;

    let pastDates = Object.keys(appData).filter(d => d !== todayStr).sort((a,b) => {
        let pA = a.split('/'), pB = b.split('/');
        return new Date(pB[2], pB[1]-1, pB[0]) - new Date(pA[2], pA[1]-1, pA[0]);
    });

    pastDates.forEach(date => {
        let score = appData[date].dailyScore || 0;
        list.innerHTML += `<li class="session-item"><span>${date}</span><span class="session-score">${score}%</span></li>`;
    });
}

// --- UI TOGGLES ---
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }
function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').style.display = document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
}
function togglePerfPopup() { 
    let p = document.getElementById('perfPopup');
    p.style.display = p.style.display === 'block' ? 'none' : 'block';
}

// --- UTILS ---
const isNear = (a, b) => Math.abs(parseFloat(a) - parseFloat(b)) < 0.000002;
function getGCD(a, b) { return b ? getGCD(b, a % b) : a; }
function toMixed(n, d) { let v=(n*100)/d, w=Math.floor(v), r=(n*100)%d; if(r===0) return w.toString(); let c=getGCD(r, d); return `${w} ${r/c}/${d/c}`; }
function getRand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getByDig(d) { if(d<=1) return getRand(1,9); return getRand(Math.pow(10, d-1), Math.pow(10, d)-1); }

// --- FORM LOGIC ---
function handleModeChange() {
    const mode = document.getElementById('practiceMode').value, sub = document.getElementById('pctSubMode').value;
    const isArith = ['addition','subtraction','multiplication'].includes(mode), isDiv = mode==='division', isPct = mode==='percentage', dMode = document.getElementById('digitModeToggle').checked;
    document.getElementById('pctOptions').style.display = isPct ? 'block' : 'none';
    document.getElementById('controlsArith').style.display = isArith ? 'flex' : 'none';
    document.getElementById('grpRange').style.display = (isArith && !dMode) ? 'block' : 'none';
    document.getElementById('controlsDiv').style.display = (isDiv && !dMode) ? 'flex' : 'none';
    document.getElementById('controlsPower').style.display = (!isArith && !isDiv && !isPct) ? 'flex' : 'none';

    const dBox = document.getElementById('controlsDigits');
    if(dMode && (isArith || isDiv)) {
        dBox.style.display='flex'; dBox.innerHTML=''; let n = isDiv ? 2 : parseInt(document.getElementById('arithN').value);
        for(let i=1; i<=n; i++) dBox.innerHTML += `<div class="control-group"><label>${isDiv?(i==1?'Num':'Den'):'N'+i} Dig:</label><input type="number" id="d${i}" value="${i==1?2:1}"></div>`;
    } else dBox.style.display='none';

    document.getElementById('w2').style.display = (isPct && (sub=='1'||sub=='2')) ? 'block' : 'none';
    generateQuestion();
}

// --- MATH GENERATOR ---
function buildQuestionData(opCode) {
    const dMode = document.getElementById('digitModeToggle').checked;
    let q="", a1="", a2="", opName = opCode;
    let mode = opCode, sub = null;
    
    if(opCode.startsWith('pct_')) { mode = 'percentage'; sub = opCode.split('_')[1]; }

    if(mode === 'percentage') {
        let n, d;
        if(sub==='1') { d=getRand(2,25); n = document.getElementById('chkNum').checked ? getRand(1, d-1) : 1; opName = "Pct (Std Frac)"; }
        else if(sub==='2') { n=getRand(1,50); d=getRand(1,50); opName = "Pct (Rand Frac)"; }

        if(sub==='1' || sub==='2') {
            let fStr=`${n}/${d}`, mStr=toMixed(n,d), dec=((n*100)/d).toFixed(6);
            if(document.getElementById('chkJuggle').checked && !document.getElementById('examOverlay').style.display) {
                let t=getRand(0,2);
                if(t==0){ q=`${fStr} = ?`; a1=mStr; a2=dec; } else if(t==1){ q=`${mStr}% = ?`; a1=fStr; a2=dec; } else { q=`${parseFloat(dec)}% = ?`; a1=fStr; a2=mStr; }
            } else { q=`${fStr} = ? %`; a1=mStr; a2=dec; }
        }
        else if(sub==='3'){ let x=getRand(1,99), y=getRand(1,500); q=`${x}% of ${y}`; a1=((x*y)/100).toFixed(6); opName = "Pct (X% of Y)"; }
        else if(sub==='4'){ let y=getRand(10,200), x=getRand(1,y); q=`${x} is what % of ${y}`; a1=((x*100)/y).toFixed(6); opName = "Pct (X is % Y)"; }
        else if(sub==='5'){ let y=getRand(10,100), x=getRand(1,200); q=`${x} is what % ${x>y?'MORE':'LESS'} than ${y}`; a1=(Math.abs(x-y)*100/y).toFixed(6); opName = "Pct (More/Less)"; }
    }
    else if(['addition','subtraction','multiplication'].includes(mode)) {
        let n = parseInt(document.getElementById('arithN').value) || 2, nums = [];
        for(let i=1; i<=n; i++) nums.push(dMode ? getByDig(parseInt(document.getElementById('d'+i).value)||1) : getRand(1, parseInt(document.getElementById('arithRange').value)||50));
        let sym = mode==='addition'?'+':mode==='subtraction'?'-':'×';
        q = nums.join(` ${sym} `);
        a1 = mode==='addition'?nums.reduce((a,b)=>a+b) : mode==='subtraction'?nums.reduce((a,b)=>a-b) : nums.reduce((a,b)=>a*b);
        opName = mode.charAt(0).toUpperCase() + mode.slice(1);
    }
    else if(mode === 'division') {
        let num, den;
        if(dMode) { num=getByDig(parseInt(document.getElementById('d1').value)||2); den=getByDig(parseInt(document.getElementById('d2').value)||1); }
        else { num=getRand(1, parseInt(document.getElementById('divNum').value)||100); den=getRand(2, parseInt(document.getElementById('divDen').value)||10); }
        if(Math.random()<0.5 && !dMode){ let m=Math.floor((parseInt(document.getElementById('divNum').value)||100)/den); num=den*getRand(1, m||1); }
        q = `${num} ÷ ${den}`; a1 = (num/den).toFixed(6);
        opName = "Division";
    }
    else {
        let b = getRand(1, parseInt(document.getElementById('baseMax').value)||20);
        if(mode==='square'){ q=`${b}²`; a1=b*b; opName = "Square"; }
        if(mode==='cube'){ q=`${b}³`; a1=b*b*b; opName = "Cube"; }
        if(mode==='sqrt'){ q=`√${b*b}`; a1=b; opName = "Sq Root"; }
        if(mode==='cbrt'){ q=`∛${b*b*b}`; a1=b; opName = "Cb Root"; }
    }
    return { op: opName, q: q, a1: a1.toString(), a2: a2.toString() };
}

// --- SOLO LOGIC ---
let curA1="", curA2="", curQText="";
function generateQuestion() {
    let mode = document.getElementById('practiceMode').value;
    if(mode==='percentage') mode = 'pct_' + document.getElementById('pctSubMode').value;
    let data = buildQuestionData(mode);
    curQText = data.q; curA1 = data.a1; curA2 = data.a2;
    document.getElementById('eq').innerText = curQText + " = ?";
    document.getElementById('ans1').value=""; document.getElementById('ans2').value=""; document.getElementById('feedback').innerText="";
    setTimeout(() => document.getElementById('ans1').focus(), 10);
}
function checkAnswer() {
    let v1 = document.getElementById('ans1').value.trim(), v2 = document.getElementById('ans2').value.trim();
    if(!v1) return;
    let correct = false;
    if(curA2) {
        let c1 = isNaN(parseFloat(v1)) ? (v1.replace(/\s+/g, ' ') == curA1) : isNear(v1, curA1);
        correct = c1 && isNear(v2, curA2);
    } else { correct = isNear(v1, curA1); }

    const f = document.getElementById('feedback');
    f.innerText = correct ? "✅ Correct!" : "❌ Wrong. Ans: " + curA1 + (curA2?" | "+curA2:"");
    f.className = "feedback " + (correct?"correct":"incorrect");
    setTimeout(generateQuestion, 1500);
}
function handleKey(e) { if(e.key === 'Enter') checkAnswer(); }

// --- EXAM ENGINE & PERFORMANCE METRICS ---
let examQCount = 10, examQs = [], examTInt = null, examTime = 0, isExamStrict = true;
let lastExamActionTime = 0;

function adjExamQ(val) { examQCount = Math.max(10, examQCount + val); document.getElementById('examQCount').innerText = examQCount; }

function calculateQPerf(isCorrect, timeTakenSecs) {
    if (!isCorrect) return 0;
    if (timeTakenSecs <= 6) return 100;
    if (timeTakenSecs >= 16) return 0; 
    return Math.max(0, 100 - (timeTakenSecs - 6) * 10);
}

function startExam() {
    const ops = Array.from(document.querySelectorAll('.ex-op:checked')).map(cb => cb.value);
    if(ops.length === 0) return alert("Select at least one operation!");

    examQs = [];
    let html = '';
    for(let i=0; i<examQCount; i++) {
        let randOp = ops[Math.floor(Math.random() * ops.length)];
        let data = buildQuestionData(randOp);
        examQs.push({ id: i, op: data.op, q: data.q, a1: data.a1, a2: data.a2, userAns: null, locked: false, isCorrect: false, timeTaken: null });
        
        html += `
        <div class="exam-q-row" id="exRow_${i}">
            <div class="exam-q-top">
                <div class="exam-q-text">${i+1}. &nbsp; ${data.q} = ?</div>
                <div class="exam-input-group">
                    <input type="text" id="exAns_${i}" placeholder="..." inputmode="decimal">
                    <button id="exLock_${i}" onclick="lockExamAns(${i})">Lock</button>
                </div>
            </div>
            <div class="exam-ans-reveal" id="exRev_${i}"></div>
        </div>`;
    }
    document.getElementById('examQuestionsList').innerHTML = html;
    document.getElementById('exPerfReport').style.display = 'none';

    isExamStrict = document.querySelector('input[name="examTimer"]:checked').value === 'strict';
    examTime = isExamStrict ? (examQCount * 15) : 0; 
    updateTimerDisp();
    
    document.getElementById('mainDashboard').style.display = 'none';
    document.getElementById('examOverlay').style.display = 'block';
    document.getElementById('exScoreDisp').style.display = 'none';
    
    let sbBtn = document.getElementById('exSubmitBtn');
    sbBtn.innerText = "Submit Paper"; sbBtn.onclick = submitExam; sbBtn.style.display = 'block';
    
    lastExamActionTime = Date.now();
    examTInt = setInterval(() => {
        isExamStrict ? examTime-- : examTime++;
        updateTimerDisp();
        if(isExamStrict && examTime <= 0) submitExam();
    }, 1000);
}

function updateTimerDisp() {
    let m = Math.floor(examTime / 60).toString().padStart(2, '0');
    let s = (examTime % 60).toString().padStart(2, '0');
    document.getElementById('exTimerDisp').innerText = `Time: ${m}:${s}`;
}

function lockExamAns(i) {
    let q = examQs[i];
    if(q.locked) return;
    
    q.timeTaken = (Date.now() - lastExamActionTime) / 1000;
    lastExamActionTime = Date.now(); 

    let input = document.getElementById(`exAns_${i}`);
    let btn = document.getElementById(`exLock_${i}`);
    
    q.userAns = input.value.trim();
    q.locked = true;
    input.disabled = true;
    btn.innerText = "Locked";
    btn.style.background = "#7f8c8d";
}

function submitExam() {
    clearInterval(examTInt);
    let score = 0;
    let opStats = {};

    for(let i=0; i<examQCount; i++) {
        let q = examQs[i];
        let input = document.getElementById(`exAns_${i}`);
        let btn = document.getElementById(`exLock_${i}`);
        let rev = document.getElementById(`exRev_${i}`);
        
        if(!q.locked) { 
            q.userAns = input.value.trim(); q.timeTaken = 15; q.locked = true; 
            input.disabled = true; btn.innerText = "Locked"; btn.style.background = "#7f8c8d"; 
        }

        let correct = false;
        let uAns = q.userAns;
        if(!uAns) { correct = false; }
        else if(q.a2) {
            let c1 = isNaN(parseFloat(uAns)) ? (uAns.replace(/\s+/g, ' ') == q.a1) : isNear(uAns, q.a1);
            let c2 = isNear(uAns, q.a2);
            correct = c1 || c2;
        } else { correct = isNear(uAns, q.a1); }

        q.isCorrect = correct;
        if(correct) score++;

        let perfScore = calculateQPerf(correct, q.timeTaken);
        if(!opStats[q.op]) opStats[q.op] = { totalPerf: 0, count: 0 };
        opStats[q.op].totalPerf += perfScore;
        opStats[q.op].count++;

        rev.style.display = 'block';
        if(correct) {
            rev.style.color = 'var(--correct)'; rev.innerText = `✅ Correct! (${q.timeTaken.toFixed(1)}s)`;
        } else {
            rev.style.color = 'var(--incorrect)'; rev.innerText = `❌ Wrong. Correct Answer: ${q.a1} ${q.a2 ? ' or ' + q.a2 : ''}`;
        }
    }

    let pct = ((score/examQCount)*100).toFixed(1);
    let sDisp = document.getElementById('exScoreDisp');
    sDisp.innerText = `Score: ${score} / ${examQCount} (${pct}%)`;
    sDisp.style.display = 'block';

    let repHTML = '';
    for (const op in opStats) {
        let avgPerf = Math.round(opStats[op].totalPerf / opStats[op].count);
        repHTML += `<div><strong>${op}:</strong> ${avgPerf}%</div>`;
    }
    document.getElementById('perfGridData').innerHTML = repHTML;
    document.getElementById('exPerfReport').style.display = 'block';

    let todayStr = getTodayStr();
    if(!appData[todayStr]) appData[todayStr] = { exams: [], dailyScore: 0 };
    appData[todayStr].exams.push(opStats);
    localStorage.setItem('mathHubData', JSON.stringify(appData));
    
    calculateMetrics();

    let sbBtn = document.getElementById('exSubmitBtn');
    sbBtn.innerText = "Close Exam";
    sbBtn.onclick = closeExam;
}

function closeExam() {
    document.getElementById('examOverlay').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
    document.getElementById('exTimerDisp').innerText = "00:00";
}

window.onload = () => {
    calculateMetrics();
    handleModeChange();
};