// Mission Control Center Server
// Simulates a NASA-style mission control for rocket launches
// Features: Real-time telemetry, Go/No-Go polling, multiple flight phases

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const cors = require('cors');
const path = require('path');

// Import mission simulators
const RocketSimulator = require('./src/rocketSimulator');
const WeatherMonitor = require('./src/weatherMonitor');
const RangeControl = require('./src/rangeControl');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mission state
const mission = {
    status: 'IDLE', // IDLE, PRE_LAUNCH, COUNTDOWN, LAUNCH, ASCENT, STAGE_SEP, ORBIT, ABORT
    launchTime: null,
    countdownTime: 30, // 30 seconds for quick demo
    holds: [],
    goNoGoPoll: {
        stations: {
            'Flight Director': null,
            'Booster': null,
            'FIDO': null,
            'Guidance': null,
            'EECOM': null,
            'GNC': null,
            'CAPCOM': null,
            'Range Safety': null,
            'Weather': null
        },
        isPolling: false,
        pollComplete: false
    }
};

// Initialize simulators
let rocket = new RocketSimulator(); // Let instead of const for reset functionality
const weather = new WeatherMonitor();
const range = new RangeControl();

// Connected clients tracking
let connectedClients = {};
let clientCount = 0;

// Telemetry broadcast interval
let telemetryInterval = null;
let countdownInterval = null;

// WebSocket connection handler
io.on('connection', (socket) => {
    clientCount++;
    connectedClients[socket.id] = {
        id: socket.id,
        station: null,
        connectedAt: new Date()
    };

    console.log(`Client connected: ${socket.id} (Total: ${clientCount})`);

    // Send initial state
    socket.emit('missionState', mission);
    socket.emit('rocketState', rocket.getState());
    socket.emit('telemetry', rocket.getTelemetry());
    socket.emit('weatherData', weather.getCurrentConditions());
    socket.emit('rangeStatus', range.getStatus());

    // Station assignment
    socket.on('assignStation', (station) => {
        connectedClients[socket.id].station = station;
        console.log(`Client ${socket.id} assigned to ${station}`);
        socket.emit('stationAssigned', station);
        io.emit('stationsUpdate', getStationAssignments());
    });

    // Start launch sequence
    socket.on('initiateLaunch', () => {
        if (mission.status === 'IDLE' || mission.status === 'ABORT' || mission.status === 'ORBIT') {
            // Reset mission state for new launch
            mission.status = 'PRE_LAUNCH';
            mission.launchTime = new Date(Date.now() + 30000); // T-30 seconds for quick demo
            mission.countdownTime = 30; // Reset countdown to 30 seconds
            mission.holds = [];
            mission.goNoGoPoll.pollComplete = false;
            mission.goNoGoPoll.isPolling = false;

            // Reset rocket state
            rocket.state.phase = 'PAD';
            rocket.state.abort = false;

            startCountdown();
            io.emit('missionState', mission);
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'info',
                message: 'Launch sequence initiated. T-00:30 and counting.'
            });
        }
    });

    // Go/No-Go polling
    socket.on('startGoNoGoPoll', () => {
        if (mission.status === 'PRE_LAUNCH' || mission.status === 'COUNTDOWN') {
            mission.goNoGoPoll.isPolling = true;
            mission.goNoGoPoll.pollComplete = false;
            // Reset all votes
            Object.keys(mission.goNoGoPoll.stations).forEach(station => {
                mission.goNoGoPoll.stations[station] = null;
            });
            io.emit('goNoGoPollStarted', mission.goNoGoPoll);
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'info',
                message: 'Go/No-Go poll initiated. All stations report status.'
            });

            // Auto-simulate other stations voting GO after a delay (for single-player mode)
            setTimeout(() => {
                if (mission.goNoGoPoll.isPolling) {
                    Object.keys(mission.goNoGoPoll.stations).forEach(station => {
                        if (mission.goNoGoPoll.stations[station] === null && station !== 'Flight Director') {
                            // Always vote GO to avoid issues
                            mission.goNoGoPoll.stations[station] = 'GO';
                        }
                    });
                    io.emit('goNoGoUpdate', mission.goNoGoPoll);
                }
            }, 3000); // 3 second delay for other stations to "report"
        }
    });

    // Station Go/No-Go vote
    socket.on('goNoGoVote', (data) => {
        const { station, vote } = data;
        if (mission.goNoGoPoll.isPolling && mission.goNoGoPoll.stations.hasOwnProperty(station)) {
            mission.goNoGoPoll.stations[station] = vote;
            io.emit('goNoGoUpdate', mission.goNoGoPoll);

            // Check if all stations have voted
            const allVoted = Object.values(mission.goNoGoPoll.stations).every(v => v !== null);
            if (allVoted) {
                const allGo = Object.values(mission.goNoGoPoll.stations).every(v => v === 'GO');
                mission.goNoGoPoll.isPolling = false;
                mission.goNoGoPoll.pollComplete = true;

                if (allGo) {
                    io.emit('eventLog', {
                        timestamp: new Date(),
                        level: 'success',
                        message: 'All stations are GO for launch!'
                    });
                    if (mission.status === 'PRE_LAUNCH') {
                        mission.status = 'COUNTDOWN';
                        io.emit('missionState', mission);
                    }
                } else {
                    const noGoStations = Object.entries(mission.goNoGoPoll.stations)
                        .filter(([s, v]) => v === 'NO_GO')
                        .map(([s]) => s);

                    // CRITICAL: Stop countdown and prevent launch
                    if (countdownInterval) {
                        clearInterval(countdownInterval);
                        countdownInterval = null;
                    }

                    // Keep in PRE_LAUNCH, don't proceed to COUNTDOWN
                    mission.status = 'PRE_LAUNCH';
                    mission.countdownTime = 30; // Reset countdown

                    io.emit('eventLog', {
                        timestamp: new Date(),
                        level: 'critical',
                        message: `LAUNCH SCRUBBED! NO-GO from: ${noGoStations.join(', ')}`
                    });
                    io.emit('missionState', mission);
                    io.emit('countdownUpdate', mission.countdownTime);
                }
            }
        }
    });

    // Countdown hold
    socket.on('holdCountdown', (reason) => {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            mission.holds.push({
                time: mission.countdownTime,
                reason: reason,
                timestamp: new Date()
            });
            io.emit('countdownHold', { time: mission.countdownTime, reason });
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'warning',
                message: `HOLD HOLD HOLD at T-${formatCountdown(mission.countdownTime)}. Reason: ${reason}`
            });
        }
    });

    // Resume countdown
    socket.on('resumeCountdown', () => {
        if (!countdownInterval && mission.status === 'COUNTDOWN') {
            startCountdown();
            io.emit('countdownResumed');
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'info',
                message: `Countdown resumed at T-${formatCountdown(mission.countdownTime)}`
            });
        }
    });

    // Launch command
    socket.on('launch', () => {
        if (mission.status === 'COUNTDOWN' && mission.countdownTime <= 10) {
            launchRocket();
        }
    });

    // Abort launch
    socket.on('abort', (reason) => {
        abortMission(reason);
    });

    // Manual stage separation
    socket.on('stageSeparation', () => {
        if (rocket.state.phase === 'ASCENT' && rocket.telemetry.altitude > 60000) {
            rocket.separateStage();
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'success',
                message: 'Stage separation confirmed!'
            });
        }
    });

    // Throttle control
    socket.on('setThrottle', (level) => {
        rocket.setThrottle(level);
        io.emit('throttleChanged', level);
    });

    // Initiate landing sequence
    socket.on('initiateLanding', () => {
        if (rocket.state.phase === 'ASCENT' || rocket.state.phase === 'SECOND_STAGE' ||
            rocket.state.phase === 'ORBIT' || rocket.state.phase === 'ABORT') {
            rocket.initiateLanding();
            mission.status = 'LANDING';
            io.emit('missionState', mission);
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'warning',
                message: 'Landing sequence initiated! Performing flip maneuver...'
            });
        }
    });

    // Reset simulation
    socket.on('resetSimulation', () => {
        // Stop all intervals
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
        }

        // Reset mission state
        mission.status = 'IDLE';
        mission.countdownTime = 30;
        mission.launchTime = null;
        mission.holds = [];
        Object.keys(mission.goNoGoPoll.stations).forEach(station => {
            mission.goNoGoPoll.stations[station] = null;
        });
        mission.goNoGoPoll.isPolling = false;
        mission.goNoGoPoll.pollComplete = false;

        // Create new rocket simulator
        rocket = new RocketSimulator();

        // Notify all clients
        io.emit('missionState', mission);
        io.emit('rocketState', rocket.getState());
        io.emit('telemetry', rocket.getTelemetry());
        io.emit('eventLog', {
            timestamp: new Date(),
            level: 'info',
            message: 'Simulation reset. All systems ready.'
        });
    });

    // Removed fixNoGoIssues handler - no longer needed since all stations always vote GO

    // Proceed with launch after fixing issues
    socket.on('proceedWithLaunch', () => {
        if (mission.status === 'PRE_LAUNCH' || mission.status === 'COUNTDOWN') {
            // Clear any existing countdown
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }

            // Start fresh countdown
            mission.status = 'COUNTDOWN';
            mission.countdownTime = 30;
            startCountdown();
            io.emit('missionState', mission);
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'success',
                message: 'All systems GO. Countdown initiated T-00:30'
            });
        }
    });

    // Client disconnect
    socket.on('disconnect', () => {
        clientCount--;
        const client = connectedClients[socket.id];
        if (client && client.station) {
            io.emit('eventLog', {
                timestamp: new Date(),
                level: 'info',
                message: `${client.station} station disconnected`
            });
        }
        delete connectedClients[socket.id];
        console.log(`Client disconnected: ${socket.id} (Total: ${clientCount})`);
        io.emit('stationsUpdate', getStationAssignments());
    });
});

// Start countdown timer
function startCountdown() {
    if (countdownInterval) return;

    countdownInterval = setInterval(() => {
        mission.countdownTime--;

        // Emit countdown update
        io.emit('countdownUpdate', mission.countdownTime);

        // Key countdown events
        switch(mission.countdownTime) {
            case 20: // T-20 seconds
                io.emit('eventLog', {
                    timestamp: new Date(),
                    level: 'info',
                    message: 'T-20 seconds. Final system checks.'
                });
                rocket.armIgnition();
                break;
            case 10: // T-10 seconds
                io.emit('eventLog', {
                    timestamp: new Date(),
                    level: 'warning',
                    message: 'T-10 seconds. GO for launch!'
                });
                rocket.startIgnitionSequence();
                break;
            case 5: // T-5 seconds
                io.emit('eventLog', {
                    timestamp: new Date(),
                    level: 'warning',
                    message: 'T-5 seconds. Ignition sequence start!'
                });
                break;
            case 0: // Launch!
                // Only launch if we have all GO votes (or if poll was fixed)
                const allGo = mission.goNoGoPoll.stations ?
                    Object.values(mission.goNoGoPoll.stations).every(v => v === 'GO' || v === null) : true;
                if (allGo) {
                    launchRocket();
                } else {
                    // Abort at T-0 if NO-GO
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    mission.status = 'ABORT';
                    io.emit('eventLog', {
                        timestamp: new Date(),
                        level: 'critical',
                        message: 'LAUNCH ABORT AT T-0! Unresolved NO-GO status!'
                    });
                    io.emit('missionState', mission);
                }
                break;
        }

        if (mission.countdownTime <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }, 1000);
}

// Launch the rocket
function launchRocket() {
    mission.status = 'LAUNCH';
    mission.launchTime = new Date(); // Record actual launch time
    rocket.launch();

    io.emit('missionState', mission);
    io.emit('eventLog', {
        timestamp: new Date(),
        level: 'critical',
        message: 'LIFTOFF! We have liftoff!'
    });

    // Start mission timer (T+ counting)
    let missionElapsedTime = 0;

    // Start telemetry streaming
    if (!telemetryInterval) {
        telemetryInterval = setInterval(() => {
            const telemetry = rocket.updateSimulation();
            io.emit('telemetry', telemetry);
            io.emit('rocketState', rocket.getState());

            // Update T+ timer
            missionElapsedTime++;
            io.emit('missionTimer', missionElapsedTime); // Send T+ time

            // Check mission phase transitions
            checkMissionPhases();

            // Check for landing events
            if (mission.status === 'LANDING') {
                const state = rocket.getState();
                const telemetry = rocket.getTelemetry();

                if (state.landingBurnStarted && !mission.landingBurnAnnounced) {
                    mission.landingBurnAnnounced = true;
                    io.emit('eventLog', {
                        timestamp: new Date(),
                        level: 'critical',
                        message: 'LANDING BURN! Suicide burn initiated!'
                    });
                }

                if (state.phase === 'LANDED') {
                    mission.status = 'LANDED';
                    io.emit('missionState', mission);
                    io.emit('eventLog', {
                        timestamp: new Date(),
                        level: 'success',
                        message: 'THE FALCON HAS LANDED! Successful touchdown!'
                    });
                    clearInterval(telemetryInterval);
                    telemetryInterval = null;
                }
            }

            // Check for anomalies
            const anomalies = rocket.checkAnomalies();
            if (anomalies.length > 0) {
                anomalies.forEach(anomaly => {
                    io.emit('anomaly', anomaly);
                    if (anomaly.severity === 'CRITICAL') {
                        abortMission(`Critical anomaly: ${anomaly.message}`);
                    }
                });
            }
        }, 100); // 10Hz update rate
    }
}

// Check and update mission phases
function checkMissionPhases() {
    const state = rocket.getState();
    const telemetry = rocket.getTelemetry();

    if (mission.status === 'LAUNCH' && telemetry.altitude > 1000) {
        mission.status = 'ASCENT';
        io.emit('missionState', mission);
        io.emit('eventLog', {
            timestamp: new Date(),
            level: 'success',
            message: 'Vehicle has cleared the tower!'
        });
    }

    if (mission.status === 'ASCENT' && state.stageNumber === 2) {
        mission.status = 'STAGE_SEP';
        io.emit('missionState', mission);
        io.emit('eventLog', {
            timestamp: new Date(),
            level: 'success',
            message: 'First stage separation confirmed!'
        });
    }

    if (telemetry.altitude > 400000) { // 400km orbit
        mission.status = 'ORBIT';
        io.emit('missionState', mission);
        io.emit('eventLog', {
            timestamp: new Date(),
            level: 'critical',
            message: 'Orbital insertion successful! Mission complete!'
        });
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }
}

// Abort mission
function abortMission(reason) {
    mission.status = 'ABORT';
    rocket.abort();

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // DON'T stop telemetry interval - let it continue for gradual decrease
    // telemetryInterval continues running to show gradual descent

    io.emit('missionState', mission);
    io.emit('abort', { reason, timestamp: new Date() });
    io.emit('eventLog', {
        timestamp: new Date(),
        level: 'critical',
        message: `ABORT! ABORT! ABORT! Reason: ${reason}`
    });
}

// Get current station assignments
function getStationAssignments() {
    const assignments = {};
    Object.values(connectedClients).forEach(client => {
        if (client.station) {
            assignments[client.station] = client.id;
        }
    });
    return assignments;
}

// Format countdown time
function formatCountdown(seconds) {
    const negative = seconds < 0;
    const abs = Math.abs(seconds);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${negative ? '+' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// REST API endpoints
app.get('/api/mission', (req, res) => {
    res.json(mission);
});

app.get('/api/telemetry', (req, res) => {
    res.json(rocket.getTelemetry());
});

app.get('/api/weather', (req, res) => {
    res.json(weather.getCurrentConditions());
});

app.get('/api/range', (req, res) => {
    res.json(range.getStatus());
});

app.get('/api/stations', (req, res) => {
    res.json(getStationAssignments());
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        mission: mission.status,
        clients: clientCount,
        uptime: process.uptime()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

http.listen(PORT, HOST, () => {
    console.log(`🚀 Mission Control Center online`);
    console.log(`📡 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 Status: All systems nominal`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    if (telemetryInterval) clearInterval(telemetryInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    http.close(() => {
        console.log('Mission Control Center offline.');
    });
});