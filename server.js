const http = require("http");
const WebSocket = require("ws");
const url = require("url");

// Centralized game configuration
// Both games are now designed as 2-Team score-board based games (no player joins / "Projector only" style).
// Game 1 is purely offline Generation Gap with inputs.
// Game 2 is Jyoti's Emoji Movie Trivia with a projector layout showcasing the emoji questions and a 2-team manually updateable score board! No multiple choice, just answer reveal.
const games = {
    "generation-gap": {
        title: "Generation Gap (2 Teams)",
        questions: [], // Offline scoreboard only
        team1Score: 0,
        team2Score: 0
    },
    "jyoti-trivia": {
        title: "Jyoti's 50th - Emoji Movie Trivia",
        team1Score: 0,
        team2Score: 0,
        currentQuestionIndex: 0,
        showAnswersState: false,
        questions: [
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 1",
                hint: "1995 | Hindi",
                emojis: "🚂 🏃‍♀️ 💼 💍",
                answer: "Dilwale Dulhania Le Jayenge"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 2",
                hint: "2009 | Hindi",
                emojis: "🤫 🤓 👨‍🎓",
                answer: "3 Idiots"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 3",
                hint: "1975 | Hindi",
                emojis: "🤠 🔫 ⛰️ 💰",
                answer: "Sholay"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 4",
                hint: "2022 | Hindi/Telugu",
                emojis: "⚡ 🕺 🥁 🏰",
                answer: "RRR"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 5",
                hint: "2001 | Hindi",
                emojis: "👦🏽 🏏 🇬🇧 🌧️",
                answer: "Lagaan"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 6",
                hint: "2000 | Hindi",
                emojis: "🏛️ violin 🍁 👩‍❤️‍👨",
                answer: "Mohabbatein"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 7",
                hint: "2013 | Hindi",
                emojis: "🦫 🕶️ 🎒 🏔️",
                answer: "Yeh Jawaani Hai Deewani"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 8",
                hint: "2015 | Hindi",
                emojis: "👑 🏰 ⚔️ 🌹",
                answer: "Bajirao Mastani"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 9",
                hint: "1970 | Hindi",
                emojis: "🐘 🎪 🤹‍♂️ 💔",
                answer: "Mera Naam Joker"
            },
            {
                round: "Part 1: Bollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 10",
                hint: "2011 | Hindi",
                emojis: "🕶️ 👮‍♂️ 🦁 💥",
                answer: "Singham"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 11",
                hint: "1997 | English",
                emojis: "🚢 🏔️ 🥶 🎻",
                answer: "Titanic"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 12",
                hint: "1994 | English",
                emojis: "🦁 👑 🌅 🐗",
                answer: "The Lion King"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 13",
                hint: "1993 | English",
                emojis: "🦖 🌴 🚙 🧬",
                answer: "Jurassic Park"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 14",
                hint: "1994 | English",
                emojis: "🎀 🧠 🦄 🍫",
                answer: "Forrest Gump"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 15",
                hint: "2001 | English",
                emojis: "🧙‍♂️ ⚡ 🦉 🚂",
                answer: "Harry Potter"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 16",
                hint: "1982 | English",
                emojis: "👽 🚲 🌕 👉",
                answer: "E.T. the Extra-Terrestrial"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 17",
                hint: "2002 | English",
                emojis: "🕷️ 🕸️ 🏙️ 🧑‍⚕️",
                answer: "Spider-Man"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 18",
                hint: "2023 | English",
                emojis: "🩰 🦢 🕶️ 🏰",
                answer: "Barbie"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 19",
                hint: "1985 | English",
                emojis: "⏰ 🚗 ⚡ 🎸",
                answer: "Back to the Future"
            },
            {
                round: "Part 2: Hollywood Blockbusters",
                type: "emoji challenge",
                qNum: "Question 20",
                hint: "1999 | English",
                emojis: "🕶️ 🧥 💊 👁️",
                answer: "The Matrix"
            }
        ]
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

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        const activeGameId = ws.gameId || data.gameId;

        if (!games[activeGameId]) return;
        const game = games[activeGameId];

        if (data.type === "join") {
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
});

function handleHostAction(gameId, action, val) {
    const game = games[gameId];
    if (!game) return;

    if (action === "update-team-score-1") {
        game.team1Score = parseInt(val) || 0;
    } else if (action === "update-team-score-2") {
        game.team2Score = parseInt(val) || 0;
    } else if (gameId === "jyoti-trivia") {
        if (action === "next") {
            if (game.currentQuestionIndex < game.questions.length - 1) {
                game.currentQuestionIndex++;
                game.showAnswersState = false;
            }
        } else if (action === "back") {
            if (game.currentQuestionIndex > 0) {
                game.currentQuestionIndex--;
                game.showAnswersState = false;
            }
        } else if (action === "reveal") {
            game.showAnswersState = !game.showAnswersState;
        }
    }
    broadcastState(gameId);
}

function broadcastState(gameId) {
    const game = games[gameId];
    if (!game) return;

    const stateObj = {
        team1Score: game.team1Score || 0,
        team2Score: game.team2Score || 0
    };

    if (gameId === "jyoti-trivia") {
        stateObj.currentQuestionIndex = game.currentQuestionIndex;
        stateObj.showAnswersState = game.showAnswersState;
        stateObj.question = game.questions[game.currentQuestionIndex];
    }

    const state = JSON.stringify(stateObj);

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
            .btn-group { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }
            .btn { background: #D4AF37; color: #111; border: none; padding: 12px 24px; font-size: 1.1em; font-weight: bold; border-radius: 5px; cursor: pointer; flex: 1; transition: background 0.3s; text-transform: uppercase; text-decoration: none; display: inline-block; text-align: center; }
            .btn:hover { background: #fff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Jyoti's 50th Birthday Game Arena</h1>
            <p class="subtitle">Welcome! Select your game board mode to project on screen:</p>
            
            <div class="game-section">
                <h2>Game 1: Generation Gap (2-Team Scoreboard Only)</h2>
                <div class="btn-group">
                    <a class="btn" href="/projector/generation-gap">Launch Scoreboard</a>
                </div>
            </div>

            <div class="game-section">
                <h2>Game 2: Emoji Movie Trivia (2-Team Quiz & Scoreboard)</h2>
                <div class="btn-group">
                    <a class="btn" href="/projector/jyoti-trivia">Launch Emoji Trivia</a>
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
        <title>${title}</title>
        <style>
            body { background: #111; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
            .header-bar { background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 3px solid #D4AF37; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; height: 12vh; box-sizing: border-box; }
            h1 { color: #D4AF37; margin: 0; font-size: 1.8em; text-transform: uppercase; letter-spacing: 2px; }
            .round-title { color: #aaa; font-style: italic; font-size: 1.1em; margin: 2px 0 0 0; }
            .main-arena { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; height: 74vh; box-sizing: border-box; position: relative; }
            .game-card { background: #1a1a1a; border: 2px solid #222; border-radius: 15px; padding: 30px; width: 95%; max-width: 1000px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .q-num { background: #333; padding: 5px 15px; border-radius: 20px; font-size: 1rem; font-weight: bold; color: #D4AF37; display: inline-block; margin-bottom: 10px; }
            .hint { font-size: 1.1rem; color: #7f8c8d; font-style: italic; margin-bottom: 10px; }
            .emoji-display { font-size: 5rem; text-align: center; margin: 25px 0; letter-spacing: 15px; }
            .answer-display { font-size: 2.2rem; font-weight: bold; color: #00b894; margin: 20px auto; min-height: 40px; border: 2px dashed #00b894; padding: 15px; border-radius: 10px; display: inline-block; max-width: 90%; background: rgba(0, 184, 148, 0.1); }
            
            .control-dock { background: #0a0a0a; border-top: 1px solid #222; padding: 12px 40px; display: flex; justify-content: space-between; height: 14vh; box-sizing: border-box; align-items: center;}
            .btn { background: #D4AF37; color: #111; border: none; padding: 12px 28px; font-size: 1em; font-weight: bold; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #fff; }
            .team-score-display { font-size: 2.2em; font-weight: bold; color: #D4AF37; margin: 10px 0; text-transform: uppercase; }
            .team-controls { display: flex; justify-content: space-around; align-items: center; width: 100%; }
            .team-score-input { background: #222; color: #fff; border: 2px solid #D4AF37; font-size: 3.5em; font-weight: bold; padding: 15px; width: 180px; text-align: center; border-radius: 12px; margin-top: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        </style>
    </head>
    <body>
        <div class="header-bar">
            <div>
                <h1 id="game-title">${title}</h1>
                <p id="round-subtitle" class="round-title">ROUND 1 • TEAM SCORE BOARD</p>
            </div>
        </div>

        <div class="main-arena">
            <div class="game-card">
                ${gameId === "generation-gap" ? `
                <div class="team-controls" style="display: flex; justify-content: space-around; width: 100%;">
                    <div style="flex: 1; text-align: center;">
                        <div class="team-score-display" style="font-size: 2.8em; letter-spacing: 1px; color: #D4AF37;">The Roots Crew</div>
                        <div style="font-size: 1.2em; color: #aaa; margin-top: -5px; margin-bottom: 15px; font-style: italic;">The Older Generation</div>
                        <input type="number" id="team1-score-val" class="team-score-input" value="0" onchange="updateTeamScore(1, this.value)">
                    </div>
                    <div style="border-left: 2px dashed #444; height: 320px; margin: 0 40px;"></div>
                    <div style="flex: 1; text-align: center;">
                        <div class="team-score-display" style="font-size: 2.8em; letter-spacing: 1px; color: #D4AF37;">The Gen Z & Alpha</div>
                        <div style="font-size: 1.2em; color: #aaa; margin-top: -5px; margin-bottom: 15px; font-style: italic;">The Dashing Youngs</div>
                        <input type="number" id="team2-score-val" class="team-score-input" value="0" onchange="updateTeamScore(2, this.value)">
                    </div>
                </div>
                ` : `
                <div id="quiz-block" style="width: 100%;">
                    <div class="q-num" id="q-num-display">Question 1</div>
                    <div class="hint" id="hint-display">Hint: Year</div>
                    <div class="emoji-display" id="emoji-display">🎬</div>
                    <div id="answer-box" class="answer-display" style="display: none;"></div>
                </div>
                `} 
            </div>

            ${gameId === "jyoti-trivia" ? `
            <div class="team-controls" style="margin-top: 20px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border: 1px solid #333;">
                <div style="display: flex; gap: 40px; justify-content: center; align-items: center;">
                    <div style="text-align: center;">
                        <span style="color: #D4AF37; font-weight: bold; font-size: 1.2rem;">The Roots Crew: </span>
                        <input type="number" id="team1-score-val" style="background:#222; color:#fff; border:1px solid #D4AF37; font-size:1.5em; width:80px; text-align:center; border-radius:5px;" value="0" onchange="updateTeamScore(1, this.value)">
                    </div>
                    <div style="text-align: center;">
                        <span style="color: #D4AF37; font-weight: bold; font-size: 1.2rem;">The Gen Z & Alpha: </span>
                        <input type="number" id="team2-score-val" style="background:#222; color:#fff; border:1px solid #D4AF37; font-size:1.5em; width:80px; text-align:center; border-radius:5px;" value="0" onchange="updateTeamScore(2, this.value)">
                    </div>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="control-dock">
            <div>
                <button class="btn" style="background:#555; color:white; margin-right: 10px;" onclick="window.location.href='/'">🏠 Exit to Home</button>
                <button class="btn" style="background:#8a6d1c; color:white;" onclick="window.location.href='/projector/${gameId}'">📊 View Scoreboard</button>
            </div>
            <div style="display: ${gameId === "jyoti-trivia" ? "block" : "none"};">
                <button class="btn" onclick="sendAction('back')">⏮️ Back</button>
                <button class="btn" onclick="sendAction('reveal')" style="background:#00b894; color:white;">👁️ Reveal Answer</button>
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
                
                document.getElementById('team1-score-val').value = state.team1Score;
                document.getElementById('team2-score-val').value = state.team2Score;

                if (gameId === 'jyoti-trivia') {
                    document.getElementById('round-subtitle').innerText = state.question.round;
                    document.getElementById('q-num-display').innerText = state.question.qNum;
                    document.getElementById('hint-display').innerText = "Hint: " + state.question.hint;
                    document.getElementById('emoji-display').innerText = state.question.emojis;

                    const answerBox = document.getElementById('answer-box');
                    if (state.showAnswersState) {
                        answerBox.innerText = "Answer: " + state.question.answer;
                        answerBox.style.display = "inline-block";
                    } else {
                        answerBox.style.display = "none";
                    }
                } else {
                    document.getElementById('round-subtitle').innerText = "ROUND 1 • TEAM SCORE BOARD";
                }
            };

            // Set round-subtitle immediately on load for generation-gap to avoid showing default "Loading Challenge..."
            if (gameId === 'generation-gap') {
                document.getElementById('round-subtitle').innerText = "ROUND 1 • TEAM SCORE BOARD";
            }
        </script>
    </body>
    </html>
    `;
}

// --- Empty controller pads fallback (not used for scoreboard-based games) ---
function getPlayerHTML(gameId) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Offline Mode</title>
    </head>
    <body style="background:#111; color:white; font-family:sans-serif; text-align:center; padding-top:100px;">
        <h1>Offline Scoreboard Mode</h1>
        <p>This game is projected on the host screen using the manual team scoreboard!</p>
        <a href="/" style="color:#D4AF37; font-size:1.2em;">Return to Home</a>
    </body>
    </html>
    `;
}

const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎉 JYOTI'S MULTIPLAYER ENGINE IS LIVE ONLINE!`);
    console.log(`======================================================`);
    console.log("🖥️  Landing Page: /home or /");
    console.log("🖥️  Host Projector URL (Generation Gap): /projector/generation-gap");
    console.log("🖥️  Host Projector URL (Jyoti Trivia): /projector/jyoti-trivia");
    console.log("📱 Guest Controller URL (Jyoti Trivia): /play/jyoti-trivia\n");
});
