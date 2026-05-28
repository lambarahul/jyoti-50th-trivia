const http = require('http');
const WebSocket = require('ws');

// --- 🎮 MULTIPLAYER JYOTI-THEMED TRIVIA DATA ---
const triviaQuestions = [
    {
        round: 1,
        type: "photo trivia",
        question: "Festive fireworks! What major milestone or holiday was Jyoti celebrating in her childhood photo with her parents?",
        options: ["A) Her 5th Birthday", "B) Diwali", "C) New Year's Eve", "D) Her first day of school"],
        correct: 1 // B) Diwali
    },
    {
        round: 1,
        type: "photo trivia",
        question: "Look at that focus! Exactly how old was Jyoti when she was caught showing off her snooker skills with Rahul in August 2016?",
        options: ["A) 38 years old", "B) 40 years old", "C) 42 years old", "D) 45 years old"],
        correct: 1 // B) 40 years old
    },
    {
        round: 1,
        type: "photo trivia",
        question: "Jyoti took on the snowy slopes of Mount Baw Baw in 2018. How old was our resident stuntwoman in this photo?",
        options: ["A) 39 years old", "B) 41 years old", "C) 42 years old", "D) 44 years old"],
        correct: 2 // C) 42 years old
    },
    {
        round: 2,
        type: "emoji challenge",
        question: "Decode the Bollywood Movie: 🚂 🏃‍♀️ 💼 💍",
        hint: "Year: 1995 | Language: Hindi",
        options: ["A) Kuch Kuch Hota Hai", "B) Dilwale Dulhania Le Jayenge", "C) Kabhi Khushi Kabhie Gham", "D) Pardes"],
        correct: 1 // B
    },
    {
        round: 2,
        type: "emoji challenge",
        question: "Decode the Hollywood Movie: 🚢 🏔️ 🥶 🎻",
        hint: "Year: 1997 | Language: English",
        options: ["A) Pearl Harbor", "B) The Perfect Storm", "C) Titanic", "D) Cast Away"],
        correct: 2 // C
    }
];

// --- 💻 CORE NETWORK MANAGEMENT ---
let players = {}; 
let currentQuestionIndex = 0;
let showAnswersState = false;
let showHintState = false;

const server = http.createServer((req, res) => {
    // Deliver the Kahoot Projector Dashboard screen
    if (req.url === '/' || req.url === '/projector') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getProjectorHTML());
    } 
    // Deliver the Game Controller interface to guest smartphones
    else if (req.url === '/play') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getPlayerHTML());
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    let playerId = Math.random().toString(36).substring(2, 7);
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'join') {
            players[playerId] = { name: data.name, score: 0, lastAnswer: null, ws: ws };
            broadcastState();
        }
        else if (data.type === 'submit_answer') {
            if (players[playerId] && !showAnswersState && players[playerId].lastAnswer === null) {
                players[playerId].lastAnswer = data.answer;
                broadcastState();
            }
        }
        else if (data.type === 'host_action') {
            handleHostAction(data.action);
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        broadcastState();
    });
});

function handleHostAction(action) {
    const q = triviaQuestions[currentQuestionIndex];
    if (action === 'next') {
        if (currentQuestionIndex < triviaQuestions.length - 1) {
            currentQuestionIndex++;
            showAnswersState = false;
            showHintState = false;
            resetPlayerAnswers();
        }
    } else if (action === 'back') {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showAnswersState = false;
            showHintState = false;
            resetPlayerAnswers();
        }
    } else if (action === 'reveal') {
        if (!showAnswersState) {
            showAnswersState = true;
            Object.keys(players).forEach(id => {
                if (players[id].lastAnswer === q.correct) {
                    players[id].score += 100; // Reward points for right answers
                }
            });
        }
    } else if (action === 'hint') {
        showHintState = true;
    }
    broadcastState();
}

function resetPlayerAnswers() {
    Object.keys(players).forEach(id => { players[id].lastAnswer = null; });
}

function broadcastState() {
    const state = JSON.stringify({
        currentQuestionIndex,
        showAnswersState,
        showHintState,
        question: triviaQuestions[currentQuestionIndex],
        players: Object.keys(players).map(id => ({ 
            name: players[id].name, 
            score: players[id].score, 
            hasAnswered: players[id].lastAnswer !== null 
        }))
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(state);
    });
}

// --- 🖥️ PART A: KAHOOT STYLE PROJECTOR DASHBOARD VIEW ---
function getProjectorHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Jyoti's 50th Live Trivia Engine</title>
        <style>
            body { background: #111; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
            .header-bar { background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 3px solid #D4AF37; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; height: 12vh; box-sizing: border-box; }
            h1 { color: #D4AF37; margin: 0; font-size: 1.8em; text-transform: uppercase; letter-spacing: 2px; }
            .round-title { color: #aaa; font-style: italic; font-size: 1em; margin: 2px 0 0 0; }
            .main-arena { flex-grow: 1; display: flex; align-items: center; justify-content: center; padding: 20px; height: 74vh; box-sizing: border-box; position: relative; }
            .game-card { background: #1a1a1a; border: 2px solid #222; border-radius: 15px; padding: 35px; width: 100%; max-width: 900px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box; margin-right: 260px; }
            .question-text { font-size: 2em; font-weight: bold; line-height: 1.4em; }
            .hint-box { background: rgba(212, 175, 55, 0.12); border: 2px dashed #D4AF37; padding: 12px; margin: 20px auto; border-radius: 8px; font-size: 1.3em; max-width: 550px; display: none; }
            .options-matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; }
            .opt-box { padding: 20px; font-size: 1.4em; font-weight: bold; border-radius: 8px; text-align: left; background: #222; border: 2px solid #444; }
            .opt-box.correct { background: #2e7d32 !important; border-color: #4caf50 !important; }
            .leaderboard-dock { position: absolute; right: 20px; top: 20px; bottom: 20px; background: #161616; border: 1px solid #D4AF37; padding: 20px; border-radius: 12px; width: 230px; box-sizing: border-box; overflow-y: auto; }
            .lb-title { font-weight: bold; color: #D4AF37; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px;}
            .player-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1em; }
            .status-dot { color: #4caf50; font-size: 0.9em; margin-right: 5px; }
            .control-dock { background: #0a0a0a; border-top: 1px solid #222; padding: 12px 40px; display: flex; justify-content: flex-end; gap: 15px; height: 14vh; box-sizing: border-box; align-items: center;}
            .btn { background: #D4AF37; color: #111; border: none; padding: 12px 28px; font-size: 1em; font-weight: bold; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #fff; }
        </style>
    </head>
    <body>
        <div class="header-bar">
            <div>
                <h1 id="game-title">The Golden Evolution</h1>
                <p id="round-subtitle" class="round-title">Loading Challenge...</p>
            </div>
        </div>

        <div class="main-arena">
            <div class="game-card">
                <div id="question-text" class="question-text">Syncing with backend...</div>
                <div id="hint-box" class="hint-box"></div>
                <div class="options-matrix" id="options-matrix"></div>
            </div>

            <div class="leaderboard-dock">
                <div class="lb-title">🏆 Scoreboard</div>
                <div id="player-list"></div>
            </div>
        </div>

        <div class="control-dock">
            <button class="btn" onclick="sendAction('back')">⏮️ Back</button>
            <button class="btn" onclick="sendAction('hint')" style="background:#8a6d1c; color:white;">💡 Hint</button>
            <button class="btn" onclick="sendAction('reveal')" style="background:#2e7d32; color:white;">✅ Reveal Answer</button>
            <button class="btn" onclick="sendAction('next')">Next ⏭️</button>
        </div>

        <script>
            const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            const ws = new WebSocket(protocol + window.location.host);
            function sendAction(action) {
                ws.send(JSON.stringify({ type: 'host_action', action: action }));
            }

            ws.onmessage = (event) => {
                const state = JSON.parse(event.data);
                document.getElementById('round-subtitle').innerText = "ROUND " + state.question.round + " • " + state.question.type.toUpperCase();
                document.getElementById('question-text').innerText = state.question.question;
                
                // Hints Engine
                const hintBox = document.getElementById('hint-box');
                if (state.question.hint && state.showHintState) {
                    hintBox.style.display = 'block';
                    hintBox.innerText = "Hint: " + state.question.hint;
                } else {
                    hintBox.style.display = 'none';
                }

                // Render Multi-choice Layout Matrix
                const matrix = document.getElementById('options-matrix');
                matrix.innerHTML = '';
                state.question.options.forEach((opt, idx) => {
                    const box = document.createElement('div');
                    box.className = 'opt-box';
                    box.innerText = opt;
                    if (state.showAnswersState && idx === state.question.correct) {
                        box.className += ' correct';
                    }
                    matrix.appendChild(box);
                });

                // Update Active Leaderboard
                const list = document.getElementById('player-list');
                list.innerHTML = '';
                state.players.sort((a,b) => b.score - a.score).forEach(p => {
                    list.innerHTML += '<div class="player-item"><span>' + (p.hasAnswered ? '<span class="status-dot">✓</span>' : '') + p.name + '</span><span>' + p.score + '</span></div>';
                });
            };
        </script>
    </body>
    </html>
    `;
}

// --- 📱 PART B: MULTIPLAYER PLAYER CONTROLLER VIEW ---
function getPlayerHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jyoti's Game Pad</title>
        <style>
            body { background: #111; color: #fff; font-family: sans-serif; text-align: center; margin: 0; padding: 20px; box-sizing: border-box; height: 100vh; display: flex; flex-direction: column; justify-content: center; }
            .login-card { max-width: 320px; margin: 0 auto; width: 100%; }
            input { padding: 15px; font-size: 1.2em; border-radius: 8px; border: none; width: 100%; box-sizing: border-box; margin-bottom: 15px; text-align: center;}
            .btn-join { background: #D4AF37; color: #111; border: none; padding: 15px; font-size: 1.2em; font-weight: bold; border-radius: 8px; width: 100%; cursor: pointer;}
            .pad-layout { display: none; width: 100%; height: 100%; flex-direction: column; }
            .status-banner { font-size: 1.2em; color: #D4AF37; margin-bottom: 15px; font-weight: bold; height: 40px; }
            .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; flex-grow: 1; min-height: 60vh;}
            .pad-trigger { font-size: 2.5em; font-weight: bold; color: white; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .btn-a { background: #e21b3c; } .btn-b { background: #1368ce; }
            .btn-c { background: #d89e00; } .btn-d { background: #26890c; }
            .pad-trigger:disabled { opacity: 0.2; cursor: not-allowed; }
        </style>
    </head>
    <body>
        <div id="login-card" class="login-card">
            <h2 style="color:#D4AF37; margin-bottom: 5px;">JYOTI'S 50TH</h2>
            <p style="color:#888; margin-top:0; margin-bottom:25px;">Wireless Buzz-In System</p>
            <input type="text" id="player-nickname" placeholder="Your Name..." maxlength="12"><br>
            <button class="btn-join" onclick="initiateConnection()">JOIN GAME</button>
        </div>

        <div id="pad-layout" class="pad-layout">
            <div id="status-banner" class="status-banner">Syncing...</div>
            <div class="grid-inputs">
                <button class="pad-trigger btn-a" onclick="submitChoice(0)">A</button>
                <button class="pad-trigger btn-b" onclick="submitChoice(1)">B</button>
                <button class="pad-trigger btn-c" onclick="submitChoice(2)">C</button>
                <button class="pad-trigger btn-d" onclick="submitChoice(3)">D</button>
            </div>
        </div>

        <script>
            let socket;
            function initiateConnection() {
                const name = document.getElementById('player-nickname').value.trim();
                if(!name) return alert('Enter a nickname first!');
                
                socket = new WebSocket('ws://' + window.location.host);
                
                socket.onopen = () => {
                    socket.send(JSON.stringify({ type: 'join', name: name }));
                    document.getElementById('login-card').style.display = 'none';
                    document.getElementById('pad-layout').style.display = 'flex';
                };

                socket.onmessage = (event) => {
                    const state = JSON.parse(event.data);
                    const targets = document.querySelectorAll('.grid-inputs button');
                    const userState = state.players.find(p => p.name === name);
                    
                    if (state.showAnswersState) {
                        document.getElementById('status-banner').innerText = "Round over! See the big screen.";
                        targets.forEach(b => b.disabled = true);
                    } else if (userState && userState.hasAnswered) {
                        document.getElementById('status-banner').innerText = "Answer locked in. Waiting...";
                        targets.forEach(b => b.disabled = true);
                    } else {
                        document.getElementById('status-banner').innerText = "Tap your answer now!";
                        targets.forEach(b => b.disabled = false);
                    }
                };
            }

            function submitChoice(num) {
                socket.send(JSON.stringify({ type: 'submit_answer', answer: num }));
            }
        </script>
    </body>
    </html>
    `;
}

// --- 🚀 START CLOUD INFRASTRUCTURE ENGINE ---
// This safely reads the public network port provided by the internet host
const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎉 JYOTI'S MULTIPLAYER CLOUD ENGINE IS LIVE ONLINE!`);
    console.log(`======================================================`);
    console.log(`🖥️  Host Projector URL: /projector`);
    console.log(`📱 Guest Controller URL: /play\n`);
});
