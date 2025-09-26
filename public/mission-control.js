// Mission Control Center - Client Dashboard
// Real-time telemetry visualization and control interface

// WebSocket connection
const socket = io();

// Chart instances
let altitudeChart, velocityChart;

// Chart data storage
const chartData = {
    labels: [],
    altitude: [],
    velocity: []
};

// Mission state
let missionState = null;
let myStation = null;
let countdownInterval = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
    setupSocketListeners();
});

// Initialize Chart.js charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
        scales: {
            x: {
                display: false
            },
            y: {
                ticks: {
                    color: '#0f0',
                    font: {
                        family: 'Courier New'
                    }
                },
                grid: {
                    color: 'rgba(0, 255, 0, 0.1)',
                    borderColor: '#0f0'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    };

    // Altitude chart
    const altCtx = document.getElementById('altitude-chart').getContext('2d');
    altitudeChart = new Chart(altCtx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.altitude,
                borderColor: '#0ff',
                backgroundColor: 'rgba(0, 255, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Altitude (km)',
                        color: '#0ff'
                    }
                }
            }
        }
    });

    // Velocity chart
    const velCtx = document.getElementById('velocity-chart').getContext('2d');
    velocityChart = new Chart(velCtx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.velocity,
                borderColor: '#ff0',
                backgroundColor: 'rgba(255, 255, 0, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Velocity (m/s)',
                        color: '#ff0'
                    }
                }
            }
        }
    });
}

// Setup button event listeners
function setupEventListeners() {
    // Control buttons
    document.getElementById('init-launch').addEventListener('click', () => {
        socket.emit('initiateLaunch');
    });

    document.getElementById('start-poll').addEventListener('click', () => {
        socket.emit('startGoNoGoPoll');
    });

    document.getElementById('hold').addEventListener('click', () => {
        socket.emit('holdCountdown', 'Manual hold');
    });

    document.getElementById('resume').addEventListener('click', () => {
        socket.emit('resumeCountdown');
    });

    document.getElementById('abort').addEventListener('click', () => {
        if (confirm('CONFIRM MISSION ABORT?')) {
            socket.emit('abort', 'Manual abort initiated');
        }
    });

    document.getElementById('land').addEventListener('click', () => {
        socket.emit('initiateLanding');
        addEventLog('LANDING SEQUENCE INITIATED - Performing propulsive landing', 'info');
        document.getElementById('land').disabled = true;
    });

    document.getElementById('reset').addEventListener('click', () => {
        socket.emit('resetSimulation');
        location.reload(); // Refresh page for clean reset
    });

    // Removed fix NO-GO issues button handler - no longer needed

    // Station selection
    document.getElementById('station-selector').addEventListener('change', (e) => {
        const station = e.target.value;
        if (station) {
            myStation = station;
            socket.emit('assignStation', station);
            document.getElementById('station-controls').style.display = 'flex';
        }
    });

    // Go/No-Go voting
    document.getElementById('vote-go').addEventListener('click', () => {
        if (myStation) {
            socket.emit('goNoGoVote', { station: myStation, vote: 'GO' });
        }
    });

    document.getElementById('vote-no-go').addEventListener('click', () => {
        if (myStation) {
            socket.emit('goNoGoVote', { station: myStation, vote: 'NO_GO' });
        }
    });
}

// Setup WebSocket event listeners
function setupSocketListeners() {
    // Connection status
    socket.on('connect', () => {
        document.getElementById('connection-status').textContent = '● ONLINE';
        document.getElementById('connection-status').className = 'connection-status connected';
        addEventLog('Connected to Mission Control', 'info');
    });

    socket.on('disconnect', () => {
        document.getElementById('connection-status').textContent = '● OFFLINE';
        document.getElementById('connection-status').className = 'connection-status disconnected';
        addEventLog('Disconnected from Mission Control', 'critical');
    });

    // Mission state updates
    socket.on('missionState', (state) => {
        missionState = state;
        updateMissionDisplay(state);
    });

    // Telemetry updates
    socket.on('telemetry', (data) => {
        updateTelemetry(data);
        updateCharts(data);
    });

    // Rocket state
    socket.on('rocketState', (state) => {
        updateRocketState(state);
    });

    // Weather updates
    socket.on('weatherData', (weather) => {
        updateWeatherDisplay(weather);
    });

    // Range status
    socket.on('rangeStatus', (range) => {
        updateRangeDisplay(range);
    });

    // Countdown updates
    socket.on('countdownUpdate', (time) => {
        updateCountdown(time);
    });

    // Mission timer (T+ after launch)
    socket.on('missionTimer', (seconds) => {
        updateMissionTimer(seconds);
    });

    // Go/No-Go poll updates
    socket.on('goNoGoPollStarted', (poll) => {
        updatePollDisplay(poll);
        addEventLog('Go/No-Go poll initiated', 'info');
    });

    socket.on('goNoGoUpdate', (poll) => {
        updatePollDisplay(poll);

        // Check if any station voted NO-GO and show fix button
        // No longer checking for NO-GO since all stations always vote GO
    });

    // Event log
    socket.on('eventLog', (event) => {
        addEventLog(event.message, event.level);
    });

    // Countdown hold
    socket.on('countdownHold', () => {
        document.getElementById('hold').disabled = true;
        document.getElementById('resume').disabled = false;
    });

    socket.on('countdownResumed', () => {
        document.getElementById('hold').disabled = false;
        document.getElementById('resume').disabled = true;
    });

    // Abort
    socket.on('abort', () => {
        updateCountdown(0);
        document.getElementById('mission-phase').textContent = 'ABORT - RAPID DESCENT';
        document.getElementById('mission-phase').style.color = '#f00';
        document.getElementById('mission-phase').style.textShadow = '0 0 30px #f00';
    });

    // Anomaly alerts
    socket.on('anomaly', (anomaly) => {
        addEventLog(`ANOMALY: ${anomaly.message}`, anomaly.severity.toLowerCase());
    });
}

// Update telemetry display
function updateTelemetry(data) {
    // Trajectory
    document.getElementById('altitude').textContent = (data.altitude / 1000).toFixed(1);
    document.getElementById('velocity').textContent = data.velocity.toFixed(0);
    document.getElementById('downrange').textContent = data.downrange.toFixed(1);
    document.getElementById('acceleration').textContent = data.gForce.toFixed(2);

    // Color code velocity during landing (red = descending, green = slowing down)
    const velocityEl = document.getElementById('velocity');
    if (data.velocity < -100) {
        velocityEl.style.color = '#f00'; // Fast descent
    } else if (data.velocity < 0) {
        velocityEl.style.color = '#ff0'; // Controlled descent
    } else {
        velocityEl.style.color = '#0f0'; // Normal
    }

    // Propulsion
    document.getElementById('thrust').textContent = (data.thrust / 1000).toFixed(0);
    document.getElementById('twr').textContent = data.twr.toFixed(2);
    document.getElementById('fuel').textContent = data.propellantRemaining.toFixed(0);
    document.getElementById('chamber-pressure').textContent = data.chamberPressure.toFixed(0);

    // Environmental
    document.getElementById('dynamic-pressure').textContent = (data.dynamicPressure / 1000).toFixed(1);
    document.getElementById('mach').textContent = data.machNumber.toFixed(2);
    document.getElementById('max-q').textContent = (data.maxQ / 1000).toFixed(1);

    // Orbital
    document.getElementById('apogee').textContent = data.apogee.toFixed(0);
    document.getElementById('perigee').textContent = data.perigee.toFixed(0);
    document.getElementById('inclination').textContent = data.inclination.toFixed(1);

    // Vehicle mass
    document.getElementById('mass').textContent = (data.mass / 1000).toFixed(0);
}

// Update rocket state display
function updateRocketState(state) {
    document.getElementById('stage').textContent = state.stageNumber;
    document.getElementById('flight-phase').textContent = state.phase;
    document.getElementById('engine-status').textContent = state.engineStatus;

    // Update vehicle status indicator
    const indicator = document.getElementById('vehicle-status').querySelector('.indicator-light');
    if (state.abort) {
        indicator.className = 'indicator-light red';
    } else if (state.phase === 'PAD' || state.phase === 'ORBIT' || state.phase === 'LANDED') {
        indicator.className = 'indicator-light green';
    } else if (state.phase === 'LANDING') {
        indicator.className = 'indicator-light yellow';
        // Update mission phase display for landing
        document.getElementById('mission-phase').textContent = 'LANDING SEQUENCE';
        document.getElementById('mission-phase').style.color = '#ff0';
    } else {
        indicator.className = 'indicator-light yellow';
    }

    // Special display for landed state
    if (state.phase === 'LANDED') {
        document.getElementById('mission-phase').textContent = '🎆 LANDED SUCCESSFULLY';
        document.getElementById('mission-phase').style.color = '#0f0';
        document.getElementById('mission-phase').style.textShadow = '0 0 30px #0f0';
        addEventLog('🚀 The Falcon has landed! Mission Success!', 'success');
    }
}

// Update mission display
function updateMissionDisplay(state) {
    document.getElementById('mission-phase').textContent = state.status;

    // Update control buttons based on mission state
    switch(state.status) {
        case 'IDLE':
            document.getElementById('init-launch').disabled = false;
            document.getElementById('start-poll').disabled = true;
            document.getElementById('land').disabled = true;
            break;
        case 'PRE_LAUNCH':
            document.getElementById('init-launch').disabled = true;
            document.getElementById('start-poll').disabled = false;
            document.getElementById('land').disabled = true;
            break;
        case 'COUNTDOWN':
            document.getElementById('start-poll').disabled = true;
            document.getElementById('hold').disabled = false;
            document.getElementById('land').disabled = true;
            break;
        case 'LAUNCH':
        case 'ASCENT':
            document.getElementById('hold').disabled = true;
            document.getElementById('resume').disabled = true;
            document.getElementById('land').disabled = false; // Enable landing button during flight
            break;
        case 'ORBIT':
            document.getElementById('land').disabled = false; // Can land from orbit
            break;
        case 'LANDING':
        case 'LANDED':
            document.getElementById('land').disabled = true;
            break;
    }
}

// Update weather display
function updateWeatherDisplay(weather) {
    document.getElementById('surface-wind').textContent = weather.surfaceWind.speed.toFixed(0);
    document.getElementById('upper-wind').textContent = weather.upperLevelWind.speed.toFixed(0);
    document.getElementById('cloud-ceiling').textContent = weather.cloudCeiling.toFixed(0);
    document.getElementById('lightning').textContent = weather.lightningDetected ?
        `${weather.lightningDistance.toFixed(0)} mi` : 'CLEAR';

    // Update weather status indicator
    const indicator = document.getElementById('weather-status').querySelector('.indicator-light');
    if (weather.constraints.go) {
        indicator.className = 'indicator-light green';
    } else {
        indicator.className = 'indicator-light red';
    }
}

// Update range display
function updateRangeDisplay(range) {
    document.getElementById('airspace').textContent = range.airspace.cleared ? 'CLEAR' :
        `${range.airspace.aircraft.length} AIRCRAFT`;
    document.getElementById('maritime').textContent = range.maritime.cleared ? 'CLEAR' :
        `${range.maritime.vessels.length} VESSELS`;
    document.getElementById('tracking').textContent =
        `${range.tracking.stationsOnline}/${range.tracking.totalStations}`;
    document.getElementById('fts').textContent = range.fts.armed ? 'ARMED' : 'SAFE';

    // Update range status indicator
    const indicator = document.getElementById('range-status').querySelector('.indicator-light');
    indicator.className = `indicator-light ${range.rangeStatus.toLowerCase()}`;
}

// Update countdown display
function updateCountdown(seconds) {
    const negative = seconds < 0;
    const abs = Math.abs(seconds);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;

    document.getElementById('countdown-sign').textContent = negative ? '+' : '-';
    document.getElementById('countdown').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Change color based on countdown phase
    const countdownEl = document.getElementById('countdown');
    if (seconds <= 10 && seconds >= 0) {
        countdownEl.style.color = '#f00';
        countdownEl.style.textShadow = '0 0 30px #f00';
    } else if (seconds <= 60) {
        countdownEl.style.color = '#ff0';
        countdownEl.style.textShadow = '0 0 20px #ff0';
    } else {
        countdownEl.style.color = '#0ff';
        countdownEl.style.textShadow = '0 0 20px #0ff';
    }
}

// Update mission timer (T+ after launch)
function updateMissionTimer(tenthsOfSeconds) {
    const seconds = Math.floor(tenthsOfSeconds / 10);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    document.getElementById('countdown-sign').textContent = '+';
    document.getElementById('countdown').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Green color for T+
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.color = '#0f0';
    countdownEl.style.textShadow = '0 0 20px #0f0';
}

// Update Go/No-Go poll display
function updatePollDisplay(poll) {
    Object.entries(poll.stations).forEach(([station, vote]) => {
        const stationEl = document.querySelector(`[data-station="${station}"]`);
        if (stationEl) {
            const statusEl = stationEl.querySelector('.station-status');
            if (vote === 'GO') {
                statusEl.textContent = 'GO';
                statusEl.className = 'station-status go';
            } else if (vote === 'NO_GO') {
                statusEl.textContent = 'NO-GO';
                statusEl.className = 'station-status no-go';
            } else {
                statusEl.textContent = 'PENDING';
                statusEl.className = 'station-status pending';
            }
        }
    });
}

// Update charts with new telemetry data
function updateCharts(data) {
    const timestamp = new Date().toLocaleTimeString();
    chartData.labels.push(timestamp);
    chartData.altitude.push(data.altitude / 1000);
    chartData.velocity.push(data.velocity);

    // Limit data points
    const maxPoints = 30;
    if (chartData.labels.length > maxPoints) {
        chartData.labels.shift();
        chartData.altitude.shift();
        chartData.velocity.shift();
    }

    // Update charts
    altitudeChart.update('none');
    velocityChart.update('none');
}

// Add event to log
function addEventLog(message, level = 'info') {
    const eventLog = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `event-entry ${level}`;

    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;

    eventLog.insertBefore(entry, eventLog.firstChild);

    // Limit log entries
    while (eventLog.children.length > 50) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Removed issuesFixed handler - no longer needed