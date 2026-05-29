const http = require("http");
const WebSocket = require("ws");
const url = require("url");

// Centralized game configuration
const games = {
    "generation-gap": {
        title: "Generation Gap (2 Teams)",
        questions: [
            {
                round: "Round 1",
                type: "photo trivia",
                question: "Festive fireworks! What major milestone or holiday was Jyoti celebrating in her childhood photo with her parents?",
                imageUrl: "https://i.ibb.co/JyotiPhoto1.jpg",
                options: ["A) Her 5th Birthday", "B) Diwali", "C) New Year's Eve", "D) Her first day of school"],
                correct: 1
            },
            {
                round: "Round 1",
                type: "photo trivia",
                question: "Look at that focus! Exactly how old was Jyoti when she was caught showing off her snooker skills with Rahul in August 2016?",
                imageUrl: "https://i.ibb.co/JyotiPhoto2.jpg",
                options: ["A) 38 years old", "B) 40 years old", "C) 42 years old", "D) 45 years old"],
                correct: 1
            },
            {
                round: "Round 1",
                type: "photo trivia",
                question: "Jyoti took on the snowy slopes of Mount Baw Baw in 2018. How old was our resident stuntwoman in this photo?",
                imageUrl: "https://i.ibb.co/JyotiPhoto3.jpg",
                options: ["A) 39 years old", "B) 41 years old", "C) 42 years old", "D) 44 years old"],
                correct: 2
            },
            {
                round: "Round 2",
                type: "emoji challenge",
                question: "Decode the Bollywood Movie: 🚂 🏃‍♀️ 💼 💍",
                options: ["A) Kuch Kuch Hota Hai", "B) Dilwale Dulhania Le Jacob", "C) Dilwale Dulhania Le Jayenge", "D) Pardes"],
                correct: 2
            },
            {
                round: "Round 2",
                type: "emoji challenge",
                question: "Decode the Hollywood Movie: 🚢 🏔️ 🥶 🎻",
                options: ["A) Pearl Harbor", "B) The Perfect Storm", "C) Titanic", "D) Cast Away"],
                correct: 2
            }
        ],
        players: {},
        currentQuestionIndex: 0,
        showAnswersState: false,
        // Manual team score tracker for Round 1
        team1Score: 0,
        team2Score: 0
    },
    "jyoti-trivia": {
        title: "Jyoti Trivia Multiplayer",
        questions: [
            {
                round: "Round 1",
                type: "multiple choice",
                question: "Where did Jyoti complete her graduation?",
                options: ["A) Delhi", "B) Mumbai", "C) Melbourne", "D) London"],
                correct: 0
            },
            {
                round: "Round 1",
                type: "multiple choice",
                question: "Which of these is Jyoti's absolute favorite leisure activity?",
                options: ["A) Cooking", "B) Gardening", "C) Travelling & Hiking", "D) Reading"],
                correct: 2
            },
            {
                round: "Round 1",
                type: "multiple choice",
                question: "Which milestone birthday is Jyoti celebrating today?",
                options: ["A) 40th", "B) 45th", "C) 50th", "D) 60th"],
                correct: 2
            }
        ],
        players: {},
        currentQuestionIndex: 0,
        showAnswersState: false
    }
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Landing Page
    if (path === "/" || path === "/home") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getLandingPageHTML());
    } 
    // Projector dashboard screen for specific games
    else if (path === "/projector/generation-gap" || path === "/projector/jyoti-trivia") {
        const gameId = path.split("/")[2];
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getProjectorHTML(gameId));
    } 
    // Controller gamepad for players joining specific games
    else if (path === "/play/generation-gap" || path === "/play/jyoti-trivia") {
        const gameId = path.split("/")[2];
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getPlayerHTML(gameId));
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
    }
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
    const parsedUrl = url.parse(req.url, true);
    const gameId = parsedUrl.query.gameId;
    ws.gameId = gameId;

    let playerId = Math.random().toString(36).substring(2, 7);

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        const activeGameId = ws.gameId || data.gameId;

        if (!games[activeGameId]) return;
        const game = games[activeGameId];

        if (data.type === "join") {
            if (data.name !== "Projector") {
                game.players[playerId] = { name: data.name, score: 0, lastAnswer: null, ws: ws };
            }
            broadcastState(activeGameId);
        } else if (data.type === "submit_answer") {
            if (game.players[playerId] && !game.showAnswersState && game.players[playerId].lastAnswer === null) {
                game.players[playerId].lastAnswer = data.answer;
                broadcastState(activeGameId);
            }
        } else if (data.type === "host_action") {
            handleHostAction(activeGameId, data.action, data.val);
        }
    });

    ws.on("close", () => {
        if (gameId && games[gameId] && games[gameId].players[playerId]) {
            delete games[gameId].players[playerId];
            broadcastState(gameId);
        }
    });
});

function handleHostAction(gameId, action, val) {
    const game = games[gameId];
    if (!game) return;

    const q = game.questions[game.currentQuestionIndex];
    if (action === "next") {
        if (game.currentQuestionIndex < game.questions.length - 1) {
            game.currentQuestionIndex++;
            game.showAnswersState = false;
            resetPlayerAnswers(gameId);
        }
    } else if (action === "back") {
        if (game.currentQuestionIndex > 0) {
            game.currentQuestionIndex--;
            game.showAnswersState = false;
            resetPlayerAnswers(gameId);
        }
    } else if (action === "reveal") {
        if (!game.showAnswersState) {
            game.showAnswersState = true;
            Object.keys(game.players).forEach(id => {
                if (game.players[id].lastAnswer === q.correct) {
                    game.players[id].score += 100;
                }
            });
        }
    } else if (action === "update-team-score-1") {
        if (gameId === "generation-gap") {
            game.team1Score = parseInt(val) || 0;
        }
    } else if (action === "update-team-score-2") {
        if (gameId === "generation-gap") {
            game.team2Score = parseInt(val) || 0;
        }
    }
    broadcastState(gameId);
}

function resetPlayerAnswers(gameId) {
    const game = games[gameId];
    if (!game) return;
    Object.keys(game.players).forEach(id => {
        game.players[id].lastAnswer = null;
    });
}

function broadcastState(gameId) {
    const game = games[gameId];
    if (!game) return;

    const state = JSON.stringify({
        currentQuestionIndex: game.currentQuestionIndex,
        showAnswersState: game.showAnswersState,
        question: game.questions[game.currentQuestionIndex],
        team1Score: game.team1Score || 0,
        team2Score: game.team2Score || 0,
        players: Object.keys(game.players).map(id => ({
            name: game.players[id].name,
            score: game.players[id].score,
            hasAnswered: game.players[id].lastAnswer !== null
        }))
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.gameId === gameId) {
            client.send(state);
        }
    });
}

// --- 🖥️ LANDING PAGE ---
function getLandingPageHTML() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jyoti's 50th Birthday Arena</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; background: linear-gradient(135deg, #111, #222); color: white; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .container { background: rgba(26, 26, 26, 0.9); border: 2px solid #D4AF37; padding: 40px 60px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 85%; max-width: 650px; }
            h1 { font-size: 2.8em; margin-bottom: 5px; color: #D4AF37; text-shadow: 2px 2px #000; text-transform: uppercase; letter-spacing: 2px; }
            .subtitle { font-size: 1.2em; color: #aaa; margin-bottom: 30px; font-style: italic; }
            .game-section { background: #222; border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #444; }
            .game-section h2 { color: #fff; margin-top: 0; font-size: 1.5em; text-align: left; border-bottom: 2px solid #D4AF37; padding-bottom: 5px; }
            .btn-group { display: flex; justify-content: space-between; gap: 15px; margin-top: 15px; }
            .btn { background: #D4AF37; color: #111; border: none; padding: 12px 24px; font-size: 1em; font-weight: bold; border-radius: 5px; cursor: pointer; flex: 1; transition: background 0.3s; text-transform: uppercase; text-decoration: none; display: inline-block; text-align: center; }
            .btn:hover { background: #fff; }
            .btn-player { background: #1368ce; color: #fff; }
            .btn-player:hover { background: #2196f3; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Jyoti's 50th Birthday Game Arena</h1>
            <p class="subtitle">Select your game mode to begin wireless play & projection!</p>
            
            <div class="game-section">
                <h2>Game 1: Generation Gap (2-Round Team Play)</h2>
                <div class="btn-group">
                    <a class="btn" href="/projector/generation-gap">Launch Projector</a>
                    <a class="btn btn-player" href="/play/generation-gap">Join Game Pad</a>
                </div>
            </div>

            <div class="game-section">
                <h2>Game 2: Jyoti Trivia (100-Player Multiplayer)</h2>
                <div class="btn-group">
                    <a class="btn" href="/projector/jyoti-trivia">Launch Projector</a>
                    <a class="btn btn-player" href="/play/jyoti-trivia">Join Game Pad</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// --- 🖥️ PART A: PROJECTOR BOARD VIEW ---
function getProjectorHTML(gameId) {
    let title = games[gameId].title;
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${title} - Projector Board</title>
        <style>
            body { background: #111; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
            .header-bar { background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 3px solid #D4AF37; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; height: 12vh; box-sizing: border-box; }
            h1 { color: #D4AF37; margin: 0; font-size: 1.8em; text-transform: uppercase; letter-spacing: 2px; }
            .round-title { color: #aaa; font-style: italic; font-size: 1em; margin: 2px 0 0 0; }
            .main-arena { flex-grow: 1; display: flex; align-items: center; justify-content: center; padding: 20px; height: 74vh; box-sizing: border-box; position: relative; }
            .game-card { background: #1a1a1a; border: 2px solid #222; border-radius: 15px; padding: 35px; width: 100%; max-width: 900px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box; margin-right: 260px; }
            .question-image { max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; margin: 15px auto; display: block; }
            .question-text { font-size: 2em; font-weight: bold; line-height: 1.4em; }
            .options-matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; }
            .opt-box { padding: 20px; font-size: 1.4em; font-weight: bold; border-radius: 8px; text-align: left; background: #222; border: 2px solid #444; }
            .opt-box.correct { background: #2e7d32 !important; border-color: #4caf50 !important; }
            .leaderboard-dock { position: absolute; right: 20px; top: 20px; bottom: 20px; background: #161616; border: 1px solid #D4AF37; padding: 20px; border-radius: 12px; width: 230px; box-sizing: border-box; overflow-y: auto; }
            .lb-title { font-weight: bold; color: #D4AF37; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px;}
            .player-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1em; }
            .status-dot { color: #4caf50; font-size: 0.9em; margin-right: 5px; }
            .control-dock { background: #0a0a0a; border-top: 1px solid #222; padding: 12px 40px; display: flex; justify-content: space-between; height: 14vh; box-sizing: border-box; align-items: center;}
            .btn { background: #D4AF37; color: #111; border: none; padding: 12px 28px; font-size: 1em; font-weight: bold; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #fff; }
            .team-score-display { font-size: 1.5em; font-weight: bold; color: #D4AF37; margin: 10px 0; }
            .team-controls { margin-top: 20px; padding-top: 15px; border-top: 1px solid #333; display: ${gameId === "generation-gap" ? "flex" : "none"}; justify-content: space-around; align-items: center; }
            .team-score-input { background: #333; color: white; border: 1px solid #D4AF37; font-size: 1.4em; padding: 5px; width: 80px; text-align: center; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="header-bar">
            <div>
                <h1 id="game-title">${title}</h1>
                <p id="round-subtitle" class="round-title">Loading Challenge...</p>
            </div>
        </div>

        <div class="main-arena">
            <div class="game-card">
                <div id="question-text" class="question-text">Syncing with backend...</div>
                <img id="question-image" class="question-image" style="display:none;" alt="Question Image">
                <div class="options-matrix" id="options-matrix"></div>

                <div class="team-controls">
                    <div>
                        <div class="team-score-display">Team 1 Score</div>
                        <input type="number" id="team1-score-val" class="team-score-input" value="0" onchange="updateTeamScore(1, this.value)">
                    </div>
                    <div>
                        <div class="team-score-display">Team 2 Score</div>
                        <input type="number" id="team2-score-val" class="team-score-input" value="0" onchange="updateTeamScore(2, this.value)">
                    </div>
                </div>
            </div>

            <div class="leaderboard-dock">
                <div class="lb-title">🏆 Scoreboard</div>
                <div id="player-list"></div>
            </div>
        </div>

        <div class="control-dock">
            <button class="btn" style="background:#555; color:white;" onclick="location.href='/'">🏠 Exit to Home</button>
            <div>
                <button class="btn" onclick="sendAction('back')">⏮️ Back</button>
                <button class="btn" onclick="sendAction('reveal')" style="background:#2e7d32; color:white;">✅ Reveal Answer</button>
                <button class="btn" onclick="sendAction('next')">Next ⏭️</button>
            </div>
        </div>

        <script>
            const gameId = "${gameId}";
            const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            const ws = new WebSocket(protocol + window.location.host + '?gameId=' + gameId);
            
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'join', name: 'Projector', gameId: gameId }));
            };

            function sendAction(action) {
                ws.send(JSON.stringify({ type: 'host_action', action: action, gameId: gameId }));
            }

            function updateTeamScore(teamNo, value) {
                ws.send(JSON.stringify({ type: 'host_action', action: 'update-team-score-' + teamNo, val: value, gameId: gameId }));
            }

            ws.onmessage = (event) => {
                const state = JSON.parse(event.data);
                document.getElementById('round-subtitle').innerText = state.question.round + " • " + state.question.type.toUpperCase();
                document.getElementById('question-text').innerText = state.question.question;
                
                const questionImage = document.getElementById('question-image');
                if (state.question.imageUrl) {
                    questionImage.src = state.question.imageUrl;
                    questionImage.style.display = 'block';
                } else {
                    questionImage.style.display = 'none';
                }

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

                const list = document.getElementById('player-list');
                list.innerHTML = '';
                // Render players
                state.players.sort((a,b) => b.score - a.score).forEach(p => {
                    list.innerHTML += '<div class="player-item"><span>' + (p.hasAnswered ? '<span class="status-dot">✓</span>' : '') + p.name + '</span><span>' + p.score + '</span></div>';
                });

                // Update Team Scoreboard displays
                if (gameId === 'generation-gap') {
                    document.getElementById('team1-score-val').value = state.team1Score;
                    document.getElementById('team2-score-val').value = state.team2Score;
                }
            };
        </script>
    </body>
    </html>
    `;
}

// --- 📱 PART B: MULTIPLAYER PLAYER CONTROLLER gamepad VIEW ---
function getPlayerHTML(gameId) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jyoti's Game Pad</title>
        <style>
            body { background: #111; color: #fff; font-family: sans-serif; text-align: center; margin: 0; padding: 20px; box-sizing: border-box; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
            .question-display { font-size: 1.5em; font-weight: bold; color: #D4AF37; margin-bottom: 20px; min-height: 3em; display: flex; align-items: center; justify-content: center; text-align: center; }
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
            .btn-exit { background: #555; color: #fff; border: none; padding: 10px; font-weight: bold; border-radius: 5px; cursor: pointer; text-decoration: none; margin-top: 15px; display: inline-block; width: 100%; max-width: 320px; }
        </style>
    </head>
    <body>
        <div id="login-card" class="login-card">
            <h2 style="color:#D4AF37; margin-bottom: 5px;">JYOTI'S 50TH</h2>
            <p style="color:#888; margin-top:0; margin-bottom:25px;">Wireless Quiz System</p>
            <input type="text" id="player-nickname" placeholder="Your Name..." maxlength="12"><br>
            <button class="btn-join" onclick="initiateConnection()">JOIN GAME</button>
            <a class="btn-exit" href="/">Exit to Home</a>
        </div>

        <div id="pad-layout" class="pad-layout">
            <div id="question-display" class="question-display">Loading Question...</div>
            <div id="status-banner" class="status-banner">Syncing...</div>
            <div class="grid-inputs">
                <button class="pad-trigger btn-a" onclick="submitChoice(0)">A</button>
                <button class="pad-trigger btn-b" onclick="submitChoice(1)">B</button>
                <button class="pad-trigger btn-c" onclick="submitChoice(2)">C</button>
                <button class="pad-trigger btn-d" onclick="submitChoice(3)">D</button>
            </div>
            <a class="btn-exit" href="/" style="align-self: center;">Exit to Home</a>
        </div>

        <script>
            const gameId = "${gameId}";
            let socket;
            let nickname = "";

            function initiateConnection() {
                nickname = document.getElementById('player-nickname').value.trim();
                if(!nickname) return alert('Enter a nickname first!');
                
                const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                socket = new WebSocket(protocol + window.location.host + "?gameId=" + gameId);
                
                socket.onopen = () => {
                    socket.send(JSON.stringify({ type: 'join', name: nickname, gameId: gameId }));
                    document.getElementById('login-card').style.display = 'none';
                    document.getElementById('pad-layout').style.display = 'flex';
                };

                socket.onmessage = (event) => {
                    const state = JSON.parse(event.data);
                    document.getElementById('question-display').innerText = state.question.question;
                    const targets = document.querySelectorAll('.grid-inputs button');
                    const userState = state.players.find(p => p.name === nickname);
                    
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
                socket.send(JSON.stringify({ type: 'submit_answer', answer: num, gameId: gameId }));
            }
        </script>
    </body>
    </html>
    `;
}

const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎉 JYOTI'S MULTIPLAYER ENGINE IS LIVE ONLINE!`);
    console.log(`======================================================`);
    console.log(`🖥️  Landing Page: /home or /`);
    console.log(`🖥️  Host Projector URL (Generation Gap): /projector/generation-gap`);
    console.log(`📱 Guest Controller URL (Generation Gap): /play/generation-gap\n`);
    console.log(`🖥️  Host Projector URL (Jyoti Trivia): /projector/jyoti-trivia`);
    console.log(`📱 Guest Controller URL (Jyoti Trivia): /play/jyoti-trivia\n`);
});
