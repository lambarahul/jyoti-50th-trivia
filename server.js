const http = require("http");
const WebSocket = require("ws");
const url = require("url");

// Centralized game state and questions
const games = {
    "generation-gap": {
        questions: [
            {
                round: 1,
                type: "photo trivia",
                question: "Festive fireworks! What major milestone or holiday was Jyoti celebrating in her childhood photo with her parents?",
                imageUrl: "https://i.ibb.co/JyotiPhoto1.jpg",
                options: ["A) Her 5th Birthday", "B) Diwali", "C) New Year\"s Eve", "D) Her first day of school"],
                correct: 1
            },
            {
                round: 1,
                type: "photo trivia",
                question: "Look at that focus! Exactly how old was Jyoti when she was caught showing off her snooker skills with Rahul in August 2016?",
                imageUrl: "https://i.ibb.co/JyotiPhoto2.jpg",
                options: ["A) 38 years old", "B) 40 years old", "C) 42 years old", "D) 45 years old"],
                correct: 1
            },
            {
                round: 1,
                type: "photo trivia",
                question: "Jyoti took on the snowy slopes of Mount Baw Baw in 2018. How old was our resident stuntwoman in this photo?",
                imageUrl: "https://i.ibb.co/JyotiPhoto3.jpg",
                options: ["A) 39 years old", "B) 41 years old", "C) 42 years old", "D) 44 years old"],
                correct: 2
            },
            {
                round: 2,
                type: "emoji challenge",
                question: "Decode the Bollywood Movie: 🚂 🏃‍♀️ 💼 💍",
                hint: "Year: 1995 | Language: Hindi",
                options: ["A) Kuch Kuch Hota Hai", "B) Dilwale Dulhania Le Jayenge", "C) Kabhi Khushi Kabhie Gham", "D) Pardes"],
                correct: 1
            },
            {
                round: 2,
                type: "emoji challenge",
                question: "Decode the Hollywood Movie: 🚢 🏔️ 🥶 🎻",
                hint: "Year: 1997 | Language: English",
                options: ["A) Pearl Harbor", "B) The Perfect Storm", "C) Titanic", "D) Cast Away"],
                correct: 2
            }
        ],
        players: {},
        currentQuestionIndex: 0,
        showAnswersState: false,
        showHintState: false
    },
    "jyoti-trivia": {
        questions: Array(15).fill(null).map((_, i) => ({
            round: 1,
            type: "multiple choice",
            question: `Jyoti Trivia Question ${i + 1}: What is...?`,
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correct: 0
        })),
        players: {},
        currentQuestionIndex: 0,
        showAnswersState: false,
        showHintState: false
    }
};

const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/home") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getLandingPageHTML());
    } else if (req.url === "/projector/generation-gap") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getProjectorHTML("generation-gap"));
    } else if (req.url === "/play/generation-gap") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getPlayerHTML("generation-gap"));
    } else if (req.url === "/projector/jyoti-trivia") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getProjectorHTML("jyoti-trivia"));
    } else if (req.url === "/play/jyoti-trivia") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getPlayerHTML("jyoti-trivia"));
    } else {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>404 Not Found</h1><p>Please check the URL. Available: /home, /projector/generation-gap, /play/generation-gap, /projector/jyoti-trivia, /play/jyoti-trivia</p>");
    }
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
    const parameters = url.parse(req.url, true);
    let gameId = parameters.query.gameId;

    let playerId = Math.random().toString(36).substring(2, 7);
    ws.gameId = gameId;

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        gameId = data.gameId; 

        if (!games[gameId]) {
            ws.send(JSON.stringify({ error: "Invalid game ID" }));
            ws.close();
            return;
        }
        let game = games[gameId];

        if (data.type === "join") {
            game.players[playerId] = { name: data.name, score: 0, lastAnswer: null, ws: ws };
            broadcastState(gameId);
        } else if (data.type === "submit_answer") {
            if (game.players[playerId] && !game.showAnswersState && game.players[playerId].lastAnswer === null) {
                game.players[playerId].lastAnswer = data.answer;
                broadcastState(gameId);
            }
        } else if (data.type === "host_action") {
            handleHostAction(gameId, data.action);
        }
    });

    ws.on("close", () => {
        if (gameId && games[gameId] && games[gameId].players[playerId]) {
            delete games[gameId].players[playerId];
            broadcastState(gameId);
        }
    });
});

function handleHostAction(gameId, action) {
    let game = games[gameId];
    if (!game) return;

    const q = game.questions[game.currentQuestionIndex];
    if (action === "next") {
        if (game.currentQuestionIndex < game.questions.length - 1) {
            game.currentQuestionIndex++;
            game.showAnswersState = false;
            game.showHintState = false;
            resetPlayerAnswers(gameId);
        }
    } else if (action === "back") {
        if (game.currentQuestionIndex > 0) {
            game.currentQuestionIndex--;
            game.showAnswersState = false;
            game.showHintState = false;
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
    } else if (action === "hint") {
        game.showHintState = true;
    } else if (action === "add-team-score-1") {
        if (gameId === "generation-gap") {
            if (!game.players.team1) game.players.team1 = { name: "Team 1", score: 0, isTeam: true };
            game.players.team1.score += 50; 
        }
    } else if (action === "add-team-score-2") {
        if (gameId === "generation-gap") {
            if (!game.players.team2) game.players.team2 = { name: "Team 2", score: 0, isTeam: true };
            game.players.team2.score += 50; 
        }
    }
    broadcastState(gameId);
}

function resetPlayerAnswers(gameId) {
    let game = games[gameId];
    if (!game) return;
    Object.keys(game.players).forEach(id => { 
        if (!game.players[id].isTeam) { 
            game.players[id].lastAnswer = null; 
        }
    });
}

function broadcastState(gameId) {
    let game = games[gameId];
    if (!game) return;

    const state = JSON.stringify({
        currentQuestionIndex: game.currentQuestionIndex,
        showAnswersState: game.showAnswersState,
        showHintState: game.showHintState,
        question: game.questions[game.currentQuestionIndex],
        players: Object.keys(game.players).map(id => ({
            name: game.players[id].name,
            score: game.players[id].score,
            hasAnswered: game.players[id].lastAnswer !== null && !game.players[id].isTeam
        })).filter(p => !p.isTeam) 
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
        <title>Jyoti's 50th Birthday Games</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; background: linear-gradient(135deg, #f06, #f90); color: white; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .container { background: rgba(0, 0, 0, 0.7); padding: 40px 60px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { font-size: 3em; margin-bottom: 10px; color: #D4AF37; text-shadow: 2px 2px #333; }
            p { font-size: 1.2em; margin-bottom: 30px; }
            .game-buttons button { background: #D4AF37; color: #333; border: none; padding: 15px 30px; font-size: 1.2em; font-weight: bold; border-radius: 8px; cursor: pointer; margin: 10px; transition: background-color 0.3s ease; }
            .game-buttons button:hover { background-color: #fff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to Jyoti's 50th Birthday Games!</h1>
            <p>Choose a game to begin the fun:</p>
            <div class="game-buttons">
                <button onclick="location.href=\`/projector/generation-gap\`">Generation Gap (Host)</button>
                <button onclick="location.href=\`/play/generation-gap\`">Generation Gap (Player)</button>
                <br>
                <button onclick="location.href=\`/projector/jyoti-trivia\`">Jyoti Trivia (Host)</button>
                <button onclick="location.href=\`/play/jyoti-trivia\`">Jyoti Trivia (Player)</button>
            </div>
        </div>
    </body>
    </html>
    `;
}

// --- 🖥️ PART A: KAHOOT STYLE PROJECTOR DASHBOARD VIEW ---
function getProjectorHTML(gameId) {
    let gameTitle = gameId === "generation-gap" ? "The Golden Evolution" : "Jyoti's Trivia Challenge";
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${gameTitle} - Projector</title>
        <style>
            body { background: #111; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
            .header-bar { background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 3px solid #D4AF37; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; height: 12vh; box-sizing: border-box; }
            h1 { color: #D4AF37; margin: 0; font-size: 1.8em; text-transform: uppercase; letter-spacing: 2px; }
            .round-title { color: #aaa; font-style: italic; font-size: 1em; margin: 2px 0 0 0; }
            .main-arena { flex-grow: 1; display: flex; align-items: center; justify-content: center; padding: 20px; height: 74vh; box-sizing: border-box; position: relative; }
            .game-card { background: #1a1a1a; border: 2px solid #222; border-radius: 15px; padding: 35px; width: 100%; max-width: 900px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box; margin-right: 260px; }
            .question-image { max-width: 100%; height: auto; border-radius: 8px; margin-top: 15px; margin-bottom: 15px; }
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
            /* Styles for team score adjustment */
            .team-controls { margin-top: 20px; padding-top: 15px; border-top: 1px solid #333; }
            .team-controls button { background: #555; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin: 5px; }
            .team-controls button:hover { background: #777; }
            .team-score-display { font-size: 1.2em; font-weight: bold; color: #D4AF37; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header-bar">
            <div>
                <h1 id="game-title">${gameTitle}</h1>
                <p id="round-subtitle" class="round-title">Loading Challenge...</p>
            </div>
        </div>

        <div class="main-arena">
            <div class="game-card">
                <div id="question-text" class="question-text">Syncing with backend...</div>
                <img id="question-image" class="question-image" style="display:none;" alt="Question Image">
                <div id="hint-box" class="hint-box"></div>
                <div class="options-matrix" id="options-matrix"></div>

                ${gameId === "generation-gap" ? `
                <div class="team-controls">
                    <div id="team1-score" class="team-score-display">Team 1 Score: 0</div>
                    <button onclick="sendAction(\'add-team-score-1\')">Add Score Team 1</button>
                    <div id="team2-score" class="team-score-display">Team 2 Score: 0</div>
                    <button onclick="sendAction(\'add-team-score-2\')">Add Score Team 2</button>
                </div>
                ` : ``} 
            </div>

            <div class="leaderboard-dock">
                <div class="lb-title">🏆 Scoreboard</div>
                <div id="player-list"></div>
            </div>
        </div>

        <div class="control-dock">
            <button class="btn" onclick="location.href=\'/home\'">🏠 Home</button>
            <button class="btn" onclick="sendAction(\'back\')">⏮️ Back</button>
            <button class="btn" onclick="sendAction(\'hint\')" style="background:#8a6d1c; color:white;">💡 Hint</button>
            <button class="btn" onclick="sendAction(\'reveal\')" style="background:#2e7d32; color:white;">✅ Reveal Answer</button>
            <button class="btn" onclick="sendAction(\'next\')">Next ⏭️</button>
        </div>

        <script>
            const gameId = \'${gameId}\';
            const protocol = window.location.protocol === \'https:\' ? \'wss://\' : \'ws://\';
            const ws = new WebSocket(protocol + window.location.host + \'?gameId=\' + gameId);
            
            ws.onopen = () => {
                // Send an initial join message for the projector to receive state updates
                ws.send(JSON.stringify({ type: \'join\', name: \'Projector\', gameId: gameId }));
            };

            function sendAction(action) {
                ws.send(JSON.stringify({ type: \'host_action\', action: action, gameId: gameId }));
            }

            ws.onmessage = (event) => {
                const state = JSON.parse(event.data);
                document.getElementById(\'round-subtitle\').innerText = "ROUND " + state.question.round + " • " + state.question.type.toUpperCase();
                document.getElementById(\'question-text\').innerText = state.question.question;
                
                const questionImage = document.getElementById(\'question-image\');
                if (state.question.imageUrl) {
                    questionImage.src = state.question.imageUrl;
                    questionImage.style.display = \'block\';
                } else {
                    questionImage.style.display = \'none\';
                }

                const hintBox = document.getElementById(\'hint-box\');
                if (state.question.hint && state.showHintState) {
                    hintBox.style.display = \'block\';
                    hintBox.innerText = "Hint: " + state.question.hint;
                } else {
                    hintBox.style.display = \'none\';
                }

                const matrix = document.getElementById(\'options-matrix\');
                matrix.innerHTML = \'\';
                state.question.options.forEach((opt, idx) => {
                    const box = document.createElement(\'div\');
                    box.className = \'opt-box\';
                    box.innerText = opt;
                    if (state.showAnswersState && idx === state.question.correct) {
                        box.className += \' correct\';
                    }
                    matrix.appendChild(box);
                });

                const list = document.getElementById(\'player-list\');
                list.innerHTML = \'\';
                // Display regular players first
                state.players.filter(p => !p.isTeam).sort((a,b) => b.score - a.score).forEach(p => {
                    list.innerHTML += \'<div class="player-item"><span>\' + (p.hasAnswered ? \'<span class="status-dot">✓</span>\' : \'\') + p.name + \'</span><span>\' + p.score + \'</span></div>\';
                });
                // Display team scores if available for generation-gap
                if (gameId === \'generation-gap\') {
                    const team1 = state.players.find(p => p.name === \'Team 1\');
                    const team2 = state.players.find(p => p.name === \'Team 2\');
                    if (team1) document.getElementById(\'team1-score\').innerText = `Team 1 Score: ${team1.score}`;
                    if (team2) document.getElementById(\'team2-score\').innerText = `Team 2 Score: ${team2.score}`;
                }
            };
        </script>
    </body>
    </html>
    `;
}

// --- 📱 PART B: MULTIPLAYER PLAYER CONTROLLER VIEW ---
function getPlayerHTML(gameId) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jyoti\'s Game Pad</title>
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
        </style>
    </head>
    <body>
        <div id="login-card" class="login-card">
            <h2 style="color:#D4AF37; margin-bottom: 5px;">JYOTI\'S 50TH</h2>
            <p style="color:#888; margin-top:0; margin-bottom:25px;">Wireless Buzz-In System</p>
            <input type="text" id="player-nickname" placeholder="Your Name..." maxlength="12"><br>
            <button class="btn-join" onclick="initiateConnection()">JOIN GAME</button>
        </div>

        <div id="pad-layout" class="pad-layout">
            <div id="question-display" class="question-display"></div>
            <div id="status-banner" class="status-banner">Syncing...</div>
            <div class="grid-inputs">
                <button class="pad-trigger btn-a" onclick="submitChoice(0)">A</button>
                <button class="pad-trigger btn-b" onclick="submitChoice(1)">B</button>
                <button class="pad-trigger btn-c" onclick="submitChoice(2)">C</button>
                <button class="pad-trigger btn-d" onclick="submitChoice(3)">D</button>
            </div>
        </div>

        <script>
            const gameId = \'${gameId}\';
            let socket;
            function initiateConnection() {
                const name = document.getElementById(\'player-nickname\').value.trim();
                if(!name) return alert(\'Enter a nickname first!\');
                
                const protocol = window.location.protocol === \'https:\' ? \'wss://\' : \'ws://\';
                socket = new WebSocket(protocol + window.location.host + \'?gameId=\' + gameId);
                
                socket.onopen = () => {
                    socket.send(JSON.stringify({ type: \'join\', name: name, gameId: gameId }));
                    document.getElementById(\'login-card\').style.display = \'none\';
                    document.getElementById(\'pad-layout\').style.display = \'flex\';
                };

                socket.onmessage = (event) => {
                    const state = JSON.parse(event.data);
                    document.getElementById(\'question-display\').innerText = state.question.question;
                    const targets = document.querySelectorAll(\'\\.grid-inputs button\');
                    const userState = state.players.find(p => p.name === name);
                    
                    if (state.showAnswersState) {
                        document.getElementById(\'status-banner\').innerText = "Round over! See the big screen.";
                        targets.forEach(b => b.disabled = true);
                    } else if (userState && userState.hasAnswered) {
                        document.getElementById(\'status-banner\').innerText = "Answer locked in. Waiting...";
                        targets.forEach(b => b.disabled = true);
                    } else {
                        document.getElementById(\'status-banner\').innerText = "Tap your answer now!";
                        targets.forEach(b => b.disabled = false);
                    }
                };
            }

            function submitChoice(num) {
                socket.send(JSON.stringify({ type: \'submit_answer\', answer: num, gameId: gameId }));
            }
        </script>
    </body>
    </html>
    `;
}

const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎉 JYOTI\'S MULTIPLAYER CLOUD ENGINE IS LIVE ONLINE!`);
    console.log(`======================================================`);
    console.log(`🖥️  Landing Page: /home`);
    console.log(`🖥️  Host Projector URL (Generation Gap): /projector/generation-gap`);
    console.log(`📱 Guest Controller URL (Generation Gap): /play/generation-gap\n`);
    console.log(`🖥️  Host Projector URL (Jyoti Trivia): /projector/jyoti-trivia`);
    console.log(`📱 Guest Controller URL (Jyoti Trivia): /play/jyoti-trivia\n`);
});
