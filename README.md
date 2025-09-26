# 🚀 Space Launch Mission Control Center

A professional NASA-style mission control system for monitoring and controlling rocket launches in real-time. Features multiple operator stations, Go/No-Go polling, real-time telemetry, and realistic physics simulation.

🌐 **Live Demo**: [https://mission-control-center.onrender.com](https://mission-control-center.onrender.com)

## 🎯 Features

### Mission Control Capabilities
- **Real-time Telemetry Streaming** - 10Hz updates via WebSocket
- **Multi-Station Operations** - 9 different control stations (Flight Director, Booster, FIDO, etc.)
- **Go/No-Go Polling System** - Formal launch readiness verification
- **Launch Countdown Management** - T-10 minute countdown with hold/resume capability
- **Abort System** - Emergency abort procedures at any phase

### Physics Simulation
- **Multi-stage Rocket** - Realistic Falcon 9-class vehicle simulation
- **Accurate Physics** - Gravity, drag, thrust variations with altitude
- **Orbital Mechanics** - Apogee/perigee calculations, orbital velocity tracking
- **Max-Q Monitoring** - Dynamic pressure tracking and throttle management
- **Stage Separation** - Automated MECO and stage separation sequences

### Environmental Monitoring
- **Weather System** - Wind, cloud ceiling, lightning tracking
- **Range Safety** - Airspace and maritime clearance monitoring
- **Tracking Stations** - Multiple ground station telemetry links
- **Flight Termination System** - FTS arming and battery monitoring

### Data Visualization
- **Real-time Charts** - Altitude and velocity graphs
- **Telemetry Panels** - 20+ live parameters
- **Status Indicators** - Visual Go/No-Go lights
- **Event Logging** - Timestamped mission events

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Run Locally
```bash
npm start
# Open http://localhost:3000
```

### How to Use

1. **Open Mission Control** - Navigate to http://localhost:3000
2. **Select Your Station** - Choose from 9 available control stations
3. **Initiate Launch Sequence** - Click "INITIATE LAUNCH SEQUENCE"
4. **Conduct Go/No-Go Poll** - Click "START GO/NO-GO POLL"
5. **Vote on Your Station** - Click GO or NO-GO based on your station's status
6. **Monitor Countdown** - Watch T-10:00 countdown
7. **Liftoff!** - Automatic launch at T-0
8. **Track Mission** - Monitor telemetry through ascent to orbit

## 📊 Telemetry Parameters

### Trajectory Data
- Altitude (km)
- Velocity (m/s)
- Downrange distance (km)
- Acceleration (G-forces)

### Propulsion Metrics
- Thrust (kN)
- Thrust-to-Weight Ratio
- Propellant remaining (%)
- Chamber pressure (bar)

### Environmental Conditions
- Dynamic pressure (kPa)
- Mach number
- Max-Q (maximum dynamic pressure)

### Orbital Parameters
- Apogee (km)
- Perigee (km)
- Inclination (degrees)

## 🎮 Control Stations

Each operator can select one of these stations:

1. **Flight Director (FD)** - Overall mission command
2. **Booster** - First stage systems
3. **FIDO** - Flight Dynamics Officer
4. **Guidance** - Navigation and guidance systems
5. **EECOM** - Electrical and Environmental systems
6. **GNC** - Guidance, Navigation & Control
7. **CAPCOM** - Capsule Communicator
8. **Range Safety (RSO)** - Range safety officer
9. **Weather** - Weather monitoring

## 🔧 Technical Architecture

### Backend
- **Node.js** with Express server
- **Socket.io** for real-time bidirectional communication
- **Modular simulators** for rocket, weather, and range systems

### Frontend
- **Vanilla JavaScript** for maximum performance
- **Chart.js** for real-time data visualization
- **NASA-inspired UI** with retro CRT terminal aesthetic

### Key Files
- `server.js` - Main mission control server
- `src/rocketSimulator.js` - Physics engine for rocket flight
- `src/weatherMonitor.js` - Weather condition simulator
- `src/rangeControl.js` - Range safety systems
- `public/mission-control.js` - Client-side dashboard logic

## 🚨 Mission Phases

1. **IDLE** - Pre-launch preparations
2. **PRE_LAUNCH** - Systems check, Go/No-Go polling
3. **COUNTDOWN** - T-10:00 countdown sequence
4. **LAUNCH** - Liftoff and initial ascent
5. **ASCENT** - First stage flight
6. **MECO** - Main Engine Cutoff
7. **STAGE_SEP** - Stage separation
8. **SECOND_STAGE** - Second stage burn
9. **ORBIT** - Orbital insertion complete

## 📈 Performance

- **Update Rate**: 10Hz (100ms) telemetry streaming
- **Latency**: <50ms typical WebSocket latency
- **Concurrent Users**: Supports multiple mission control stations
- **Data Points**: Tracks 20+ real-time parameters

## 🎯 Mission Success Criteria

- Reach 400km altitude (ISS orbit)
- Achieve 7.66 km/s orbital velocity
- Maintain vehicle integrity through Max-Q
- Successfully separate stages
- No critical anomalies during ascent

## 🛠️ Development

### Project Structure
```
mission_control_center/
├── server.js              # Main server
├── src/
│   ├── rocketSimulator.js # Rocket physics
│   ├── weatherMonitor.js  # Weather system
│   └── rangeControl.js    # Range safety
├── public/
│   ├── index.html         # Dashboard UI
│   ├── style.css          # NASA styling
│   └── mission-control.js # Client logic
└── package.json
```

### Adding New Features
- Extend simulators in `src/` directory
- Add new telemetry parameters to `rocketSimulator.js`
- Create new control stations in server and client
- Implement additional abort modes

## 🚀 Deployment

### Deploy to Render

1. Push to GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: mission-control-center
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Click "Create Web Service"

The app will be available at: `https://mission-control-center.onrender.com`

### Alternative Deployment Options
- **Heroku**: Push to Heroku git, uses PORT environment variable
- **Railway**: Import from GitHub, auto-detects Node.js
- **Vercel**: Works with Node.js runtime

## 📝 License

MIT License - Educational project for space systems simulation

## 🙏 Acknowledgments

Inspired by NASA's real Mission Control Center in Houston and SpaceX's modern launch operations.

---

*"Flight, we are GO for launch!"* 🚀