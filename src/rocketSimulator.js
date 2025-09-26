// Rocket Flight Simulator
// Simulates a multi-stage rocket launch to ISS orbit
// Based on Falcon 9 / Atlas V class vehicle

class RocketSimulator {
    constructor() {
        // Vehicle specifications
        this.specs = {
            name: 'Falcon-X',
            stages: 2,
            totalMass: 549054, // kg (similar to Falcon 9)
            hasLandingCapability: true, // SpaceX-style propulsive landing
            landingBurnAltitude: 5000, // meters - when to start landing burn
            firstStage: {
                dryMass: 22200, // kg
                propellantMass: 411000, // kg
                thrust: 7607000, // N (sea level)
                thrustVac: 8227000, // N (vacuum)
                burnTime: 162, // seconds
                engines: 9,
                specificImpulse: 282 // seconds (sea level)
            },
            secondStage: {
                dryMass: 4000, // kg
                propellantMass: 111500, // kg
                thrust: 934000, // N (vacuum)
                burnTime: 397, // seconds
                engines: 1,
                specificImpulse: 348 // seconds (vacuum)
            },
            payload: 22800, // kg to LEO
            dragCoefficient: 0.3,
            crossSection: 10.52 // m^2
        };

        // Current state
        this.state = {
            phase: 'PAD', // PAD, IGNITION, LAUNCH, ASCENT, MECO, STAGE_SEP, SECOND_STAGE, ORBIT, ABORT, LANDING, LANDED
            stageNumber: 1,
            ignitionSequence: false,
            engineStatus: 'OFF',
            guidanceMode: 'GRAVITY_TURN',
            throttleLevel: 100,
            missionTime: 0,
            abort: false,
            landingBurnStarted: false
        };

        // Telemetry data
        this.telemetry = {
            // Position & velocity
            altitude: 0, // meters
            velocity: 0, // m/s
            acceleration: 0, // m/s^2
            downrange: 0, // km

            // Orbital parameters
            apogee: 0, // km
            perigee: 0, // km
            inclination: 51.6, // degrees (ISS orbit)
            orbitalVelocity: 0, // m/s

            // Vehicle status
            mass: this.specs.totalMass, // kg
            thrust: 0, // N
            twr: 0, // thrust-to-weight ratio
            maxQ: 0, // max dynamic pressure (Pa)
            gForce: 0, // G's

            // Propulsion
            propellantRemaining: 100, // %
            engineThrottle: 0, // %
            chamberPressure: 0, // bar
            exhaustVelocity: 0, // m/s

            // Guidance
            pitch: 90, // degrees (90 = vertical)
            yaw: 0, // degrees
            roll: 0, // degrees
            flightPathAngle: 90, // degrees

            // Environmental
            dynamicPressure: 0, // Pa
            machNumber: 0,
            atmosphericDensity: 1.225, // kg/m^3 (sea level)
            temperature: 288, // K

            // Stage specific
            stage1FuelRemaining: 100, // %
            stage2FuelRemaining: 100, // %
            stage1BurnTime: 0, // seconds
            stage2BurnTime: 0 // seconds
        };

        // Physics constants
        this.constants = {
            g0: 9.81, // m/s^2 (Earth surface gravity)
            Re: 6371000, // m (Earth radius)
            atmosphereHeight: 100000, // m
            speedOfSound: 343, // m/s at sea level
            airDensitySeaLevel: 1.225 // kg/m^3
        };

        // Mission parameters
        this.mission = {
            targetAltitude: 400000, // m (400km - ISS altitude)
            targetVelocity: 7660, // m/s (orbital velocity at 400km)
            maxQAltitude: 13000, // m (typical max-Q altitude)
            stageSepAltitude: 65000, // m
            gravityTurnStart: 150, // m
            targetInclination: 51.6 // degrees
        };

        // Anomaly tracking
        this.anomalies = [];
        this.limits = {
            maxQ: 45000, // Pa
            maxG: 5, // G's
            maxThrust: 8500000, // N
            maxAltitude: 500000, // m
            maxVelocity: 8000, // m/s
            minChamberPressure: 50 // bar
        };
    }

    // Start ignition sequence
    armIgnition() {
        if (this.state.phase === 'PAD') {
            this.state.ignitionSequence = true;
            console.log('Ignition sequence armed');
        }
    }

    // Start engine ignition
    startIgnitionSequence() {
        if (this.state.ignitionSequence) {
            this.state.phase = 'IGNITION';
            this.state.engineStatus = 'STARTING';
            console.log('Engine ignition sequence started');
        }
    }

    // Launch the rocket
    launch() {
        if (this.state.phase === 'IGNITION' || this.state.phase === 'PAD') {
            this.state.phase = 'LAUNCH';
            this.state.engineStatus = 'RUNNING';
            console.log('Liftoff!');
        }
    }

    // Main simulation update (called at 10Hz)
    updateSimulation() {
        if (this.state.phase === 'PAD' || this.state.phase === 'ORBIT' || this.state.phase === 'LANDED') {
            return this.telemetry;
        }

        // Update mission time (except during abort and landing)
        if (this.state.phase !== 'ABORT' && this.state.phase !== 'LANDING') {
            this.state.missionTime += 0.1; // 100ms increments
        }

        // Update based on flight phase
        switch(this.state.phase) {
            case 'IGNITION':
                this.simulateIgnition();
                break;
            case 'LAUNCH':
            case 'ASCENT':
                this.simulateAscent();
                break;
            case 'MECO':
                this.simulateMECO();
                break;
            case 'STAGE_SEP':
                this.simulateStageSeparation();
                break;
            case 'SECOND_STAGE':
                this.simulateSecondStage();
                break;
            case 'ABORT':
                this.simulateAbort();
                break;
            case 'LANDING':
                this.simulateLanding();
                break;
        }

        // Update environmental conditions
        this.updateEnvironment();

        // Calculate orbital parameters
        this.calculateOrbitalParams();

        // Check for phase transitions
        this.checkPhaseTransitions();

        return this.telemetry;
    }

    // Simulate ignition phase
    simulateIgnition() {
        const ignitionProgress = Math.min((this.state.missionTime * 10), 1); // 0 to 1 over 0.1 seconds

        // Ramp up thrust
        const stage = this.specs.firstStage;
        this.telemetry.thrust = stage.thrust * ignitionProgress;
        this.telemetry.engineThrottle = ignitionProgress * 100;
        this.telemetry.chamberPressure = 270 * ignitionProgress; // bar

        // Check for proper ignition
        if (ignitionProgress >= 1) {
            this.state.phase = 'LAUNCH';
            console.log('All engines at full thrust');
        }
    }

    // Simulate ascent phase
    simulateAscent() {
        const dt = 0.1; // 100ms time step

        // Get current stage specs
        const stage = this.state.stageNumber === 1 ?
            this.specs.firstStage : this.specs.secondStage;

        // Calculate thrust (varies with altitude)
        let thrust = this.calculateThrust(stage);
        thrust *= (this.state.throttleLevel / 100);
        this.telemetry.thrust = thrust;

        // Calculate mass (decreases as propellant burns)
        const fuelBurnRate = thrust / (stage.specificImpulse * this.constants.g0);
        this.telemetry.mass -= fuelBurnRate * dt;

        // Update propellant remaining
        if (this.state.stageNumber === 1) {
            this.telemetry.stage1BurnTime += dt;
            this.telemetry.stage1FuelRemaining = Math.max(0,
                100 * (1 - this.telemetry.stage1BurnTime / stage.burnTime));
            this.telemetry.propellantRemaining = this.telemetry.stage1FuelRemaining;
        } else {
            this.telemetry.stage2BurnTime += dt;
            this.telemetry.stage2FuelRemaining = Math.max(0,
                100 * (1 - this.telemetry.stage2BurnTime / stage.burnTime));
            this.telemetry.propellantRemaining = this.telemetry.stage2FuelRemaining;
        }

        // Calculate forces
        const weight = this.telemetry.mass * this.getGravity();
        const drag = this.calculateDrag();

        // Net force and acceleration
        const netForce = thrust - weight - drag;
        this.telemetry.acceleration = netForce / this.telemetry.mass;
        this.telemetry.gForce = this.telemetry.acceleration / this.constants.g0;

        // Update velocity and position
        this.telemetry.velocity += this.telemetry.acceleration * dt;
        this.telemetry.altitude += this.telemetry.velocity * dt;

        // Update downrange distance (simplified)
        const horizontalVel = this.telemetry.velocity * Math.sin(Math.PI * (90 - this.telemetry.pitch) / 180);
        this.telemetry.downrange += (horizontalVel * dt) / 1000; // km

        // Guidance and control
        this.updateGuidance();

        // Engine parameters
        this.telemetry.exhaustVelocity = stage.specificImpulse * this.constants.g0;
        this.telemetry.chamberPressure = 270 * (this.telemetry.engineThrottle / 100);

        // TWR calculation
        this.telemetry.twr = thrust / weight;
    }

    // Calculate thrust accounting for atmospheric pressure
    calculateThrust(stage) {
        const atmosphericPressure = 101325 * Math.exp(-this.telemetry.altitude / 8000); // Pa
        const seaLevelPressure = 101325; // Pa

        if (this.state.stageNumber === 1) {
            // First stage thrust varies with altitude
            const thrustLoss = (atmosphericPressure / seaLevelPressure) *
                (stage.thrustVac - stage.thrust);
            return stage.thrust + thrustLoss;
        } else {
            // Second stage operates in near-vacuum
            return stage.thrust;
        }
    }

    // Calculate aerodynamic drag
    calculateDrag() {
        if (this.telemetry.altitude > this.constants.atmosphereHeight) {
            return 0; // No drag in space
        }

        const density = this.telemetry.atmosphericDensity;
        const velocity = this.telemetry.velocity;
        const area = this.specs.crossSection;
        const cd = this.specs.dragCoefficient;

        return 0.5 * density * velocity * velocity * cd * area;
    }

    // Update atmospheric conditions
    updateEnvironment() {
        const alt = this.telemetry.altitude;

        // Atmospheric density (exponential decay)
        if (alt < this.constants.atmosphereHeight) {
            this.telemetry.atmosphericDensity =
                this.constants.airDensitySeaLevel * Math.exp(-alt / 8000);

            // Temperature (simplified model)
            if (alt < 11000) {
                this.telemetry.temperature = 288 - 0.0065 * alt;
            } else if (alt < 25000) {
                this.telemetry.temperature = 216.65;
            } else {
                this.telemetry.temperature = 216.65 + 0.0028 * (alt - 25000);
            }

            // Speed of sound varies with temperature
            const speedOfSound = Math.sqrt(1.4 * 287 * this.telemetry.temperature);
            this.telemetry.machNumber = this.telemetry.velocity / speedOfSound;

            // Dynamic pressure (Q)
            this.telemetry.dynamicPressure =
                0.5 * this.telemetry.atmosphericDensity * this.telemetry.velocity * this.telemetry.velocity;

            // Track max-Q
            if (this.telemetry.dynamicPressure > this.telemetry.maxQ) {
                this.telemetry.maxQ = this.telemetry.dynamicPressure;
            }
        } else {
            // In space
            this.telemetry.atmosphericDensity = 0;
            this.telemetry.dynamicPressure = 0;
            this.telemetry.machNumber = 0;
            this.telemetry.temperature = 2.7; // Cosmic background temperature
        }
    }

    // Get gravity at current altitude
    getGravity() {
        const r = this.constants.Re + this.telemetry.altitude;
        return this.constants.g0 * Math.pow(this.constants.Re / r, 2);
    }

    // Update guidance system
    updateGuidance() {
        // Gravity turn maneuver
        if (this.state.guidanceMode === 'GRAVITY_TURN') {
            if (this.telemetry.altitude > this.mission.gravityTurnStart) {
                // Start pitching over
                const targetPitch = 90 - (this.telemetry.altitude / 100000) * 45; // Simplified
                this.telemetry.pitch = Math.max(targetPitch, 0);
                this.telemetry.flightPathAngle = this.telemetry.pitch;
            }
        }

        // Throttle control for max-Q
        if (this.telemetry.dynamicPressure > 35000 && this.state.stageNumber === 1) {
            this.state.throttleLevel = 70; // Throttle down for max-Q
        } else if (this.telemetry.dynamicPressure < 25000 && this.state.throttleLevel < 100) {
            this.state.throttleLevel = 100; // Throttle back up
        }
    }

    // Calculate orbital parameters
    calculateOrbitalParams() {
        const alt = this.telemetry.altitude;
        const vel = this.telemetry.velocity;

        // Simplified orbital mechanics
        const r = this.constants.Re + alt;
        const orbitalVel = Math.sqrt(this.constants.g0 * this.constants.Re * this.constants.Re / r);
        this.telemetry.orbitalVelocity = orbitalVel;

        // Estimate apogee/perigee (simplified)
        if (vel > 0) {
            const energy = (vel * vel / 2) - (this.constants.g0 * this.constants.Re * this.constants.Re / r);
            const a = -this.constants.g0 * this.constants.Re * this.constants.Re / (2 * energy); // Semi-major axis

            if (a > 0) {
                this.telemetry.apogee = (a * 2 - r) / 1000; // km
                this.telemetry.perigee = alt / 1000; // km
            }
        }
    }

    // Check for phase transitions
    checkPhaseTransitions() {
        // Launch to Ascent
        if (this.state.phase === 'LAUNCH' && this.telemetry.altitude > 1000) {
            this.state.phase = 'ASCENT';
            console.log('Vehicle in ascent phase');
        }

        // Main Engine Cutoff (MECO)
        if (this.state.phase === 'ASCENT' && this.state.stageNumber === 1) {
            if (this.telemetry.stage1FuelRemaining <= 0 ||
                this.telemetry.stage1BurnTime >= this.specs.firstStage.burnTime) {
                this.state.phase = 'MECO';
                this.telemetry.thrust = 0;
                console.log('Main Engine Cutoff (MECO)');
            }
        }

        // Stage separation
        if (this.state.phase === 'MECO' && this.state.missionTime > 3) {
            this.separateStage();
        }

        // Second stage shutdown
        if (this.state.phase === 'SECOND_STAGE') {
            if (this.telemetry.stage2FuelRemaining <= 0 ||
                this.telemetry.altitude >= this.mission.targetAltitude ||
                this.telemetry.velocity >= this.mission.targetVelocity) {
                this.state.phase = 'ORBIT';
                this.telemetry.thrust = 0;
                console.log('Orbital insertion complete!');
            }
        }
    }

    // Simulate MECO phase
    simulateMECO() {
        // Coast phase - no thrust
        const dt = 0.1;
        const weight = this.telemetry.mass * this.getGravity();
        const drag = this.calculateDrag();

        this.telemetry.acceleration = -(weight + drag) / this.telemetry.mass;
        this.telemetry.velocity += this.telemetry.acceleration * dt;
        this.telemetry.altitude += this.telemetry.velocity * dt;
        this.telemetry.gForce = this.telemetry.acceleration / this.constants.g0;
    }

    // Stage separation
    separateStage() {
        if (this.state.stageNumber === 1) {
            this.state.phase = 'STAGE_SEP';
            this.state.stageNumber = 2;

            // Update mass (drop first stage)
            this.telemetry.mass = this.specs.secondStage.dryMass +
                                  this.specs.secondStage.propellantMass +
                                  this.specs.payload;

            console.log('Stage separation confirmed');

            // Start second stage after brief coast
            setTimeout(() => {
                this.state.phase = 'SECOND_STAGE';
                console.log('Second stage ignition');
            }, 2000);
        }
    }

    // Simulate stage separation
    simulateStageSeparation() {
        // Brief coast during separation
        this.simulateMECO();
    }

    // Simulate second stage
    simulateSecondStage() {
        this.simulateAscent(); // Same physics, different stage
    }

    // Abort mission
    abort() {
        this.state.phase = 'ABORT';
        this.state.abort = true;
        this.telemetry.thrust = 0;
        console.log('Mission abort initiated');
    }

    // Simulate abort - rapid but controlled descent to complete stop
    simulateAbort() {
        // Check if we've reached complete stop
        if (this.telemetry.altitude <= 0 && this.telemetry.velocity <= 0) {
            // Complete stop reached - maintain zero state
            this.telemetry.altitude = 0;
            this.telemetry.velocity = 0;
            this.telemetry.acceleration = 0;
            this.telemetry.gForce = 0;
            this.telemetry.thrust = 0;
            this.telemetry.chamberPressure = 0;
            this.telemetry.chamberTemperature = 300;
            this.telemetry.fuelFlowRate = 0;
            this.telemetry.oxidizerFlowRate = 0;
            this.telemetry.totalFlowRate = 0;
            this.telemetry.fuelTurbopumpRPM = 0;
            this.telemetry.oxidizerTurbopumpRPM = 0;
            this.telemetry.turbopumpInletPressure = 0;
            this.telemetry.nozzleThroatTemp = 300;
            this.telemetry.turbineInletTemp = 300;
            this.telemetry.dynamicPressure = 0;
            this.telemetry.machNumber = 0;
            this.telemetry.vibrationLevel = 0;
            this.telemetry.exhaustVelocity = 0;
            this.state.phase = 'ABORTED_STOPPED';
            this.state.engineStatus = 'SHUTDOWN - ABORTED';
            return; // Stay at complete stop
        }

        // Immediately cut thrust
        this.telemetry.thrust = 0;
        this.telemetry.chamberPressure = Math.max(0, this.telemetry.chamberPressure * 0.85);
        this.telemetry.chamberTemperature = Math.max(300, this.telemetry.chamberTemperature * 0.90);

        // RAPID altitude and velocity decrease - catastrophic failure simulation
        this.telemetry.altitude = Math.max(0, this.telemetry.altitude * 0.85); // 15% drop per update - very fast!
        this.telemetry.velocity = Math.max(0, this.telemetry.velocity * 0.75); // 25% drop per update - rapid deceleration
        this.telemetry.downrange = Math.max(0, this.telemetry.downrange * 0.98);
        this.telemetry.acceleration = -9.81; // Free fall
        this.telemetry.gForce = -1;

        // Immediately cut flow rates
        this.telemetry.fuelFlowRate = Math.max(0, this.telemetry.fuelFlowRate * 0.70);
        this.telemetry.oxidizerFlowRate = Math.max(0, this.telemetry.oxidizerFlowRate * 0.70);
        this.telemetry.totalFlowRate = this.telemetry.fuelFlowRate + this.telemetry.oxidizerFlowRate;
        this.telemetry.propellantRemaining = Math.max(0, this.telemetry.propellantRemaining * 0.95);

        // Rapid turbopump shutdown
        this.telemetry.fuelTurbopumpRPM = Math.max(0, this.telemetry.fuelTurbopumpRPM * 0.75);
        this.telemetry.oxidizerTurbopumpRPM = Math.max(0, this.telemetry.oxidizerTurbopumpRPM * 0.75);
        this.telemetry.turbopumpInletPressure = Math.max(0, this.telemetry.turbopumpInletPressure * 0.80);

        // Rapid temperature drop
        this.telemetry.nozzleThroatTemp = Math.max(300, this.telemetry.nozzleThroatTemp * 0.88);
        this.telemetry.turbineInletTemp = Math.max(300, this.telemetry.turbineInletTemp * 0.88);

        // Zero out other parameters quickly
        this.telemetry.dynamicPressure = 0;
        this.telemetry.machNumber = 0;
        this.telemetry.vibrationLevel = Math.max(0, this.telemetry.vibrationLevel * 0.70);
        this.telemetry.exhaustVelocity = Math.max(0, this.telemetry.exhaustVelocity * 0.80);

        // Reduce mass (simulating breakup)
        this.telemetry.mass = Math.max(this.specs.totalMass * 0.3, this.telemetry.mass * 0.995);

        // Check if crashed (hit ground or near zero)
        if (this.telemetry.altitude < 100) {
            // Rapid final descent
            this.telemetry.altitude = Math.max(0, this.telemetry.altitude * 0.5); // 50% drop when near ground
        }

        if (this.telemetry.altitude < 1) {
            // Crashed - zero everything and maintain stop
            this.telemetry.altitude = 0;
            this.telemetry.velocity = 0;
            this.telemetry.acceleration = 0;
            this.telemetry.gForce = 0;
            this.telemetry.fuelTurbopumpRPM = 0;
            this.telemetry.oxidizerTurbopumpRPM = 0;
            this.telemetry.fuelFlowRate = 0;
            this.telemetry.oxidizerFlowRate = 0;
            this.telemetry.totalFlowRate = 0;
            this.state.phase = 'ABORTED_STOPPED';
            this.state.engineStatus = 'SHUTDOWN - ABORTED';
        }
    }

    // Initiate landing sequence
    initiateLanding() {
        this.state.phase = 'LANDING';
        this.state.landingBurnStarted = false;
        console.log('Landing sequence initiated - performing entry burn');
    }

    // Simulate SpaceX-style propulsive landing with enhanced realism
    simulateLanding() {
        const dt = 0.1;

        // Check if already landed - maintain complete stop
        if (this.state.phase === 'LANDED') {
            this.telemetry.altitude = 0;
            this.telemetry.velocity = 0;
            this.telemetry.thrust = 0;
            this.telemetry.engineThrottle = 0;
            this.telemetry.chamberPressure = 0;
            this.telemetry.fuelFlowRate = 0;
            this.telemetry.oxidizerFlowRate = 0;
            this.telemetry.acceleration = 0;
            this.telemetry.gForce = 0;
            this.telemetry.totalFlowRate = 0;
            this.telemetry.fuelTurbopumpRPM = 0;
            this.telemetry.oxidizerTurbopumpRPM = 0;
            this.state.engineStatus = 'SHUTDOWN - LANDED';
            return; // Stay at complete stop
        }

        // Phase 1: Re-entry & Boostback (altitude > 50km)
        if (this.telemetry.altitude > 50000) {
            // Re-entry burn to reduce velocity
            this.telemetry.velocity = Math.max(-1200, this.telemetry.velocity - 30); // Hypersonic descent
            this.telemetry.altitude += this.telemetry.velocity * dt;

            // Three engines for re-entry burn
            this.telemetry.thrust = 1800000; // 3 engines at 60% throttle
            this.telemetry.engineThrottle = 30;
            this.state.engineStatus = 'RE-ENTRY BURN (3 ENGINES)';

            // Atmospheric heating effects
            this.telemetry.machNumber = Math.abs(this.telemetry.velocity) / 343;
            this.telemetry.dynamicPressure = 0.5 * 0.01 * this.telemetry.velocity * this.telemetry.velocity;

        // Phase 2: Aerodynamic descent (50km to 7km)
        } else if (this.telemetry.altitude > 7000) {
            // Grid fins deployed for control
            this.telemetry.velocity = Math.max(-350, this.telemetry.velocity - 15); // Terminal velocity with grid fins
            this.telemetry.altitude += this.telemetry.velocity * dt;

            // Engines off during aerodynamic phase
            this.telemetry.thrust = 0;
            this.telemetry.engineThrottle = 0;
            this.state.engineStatus = 'GRID FIN CONTROL';

            // Grid fin control simulation
            this.telemetry.pitch = 88 + Math.sin(this.state.missionTime * 0.5) * 2;
            this.telemetry.gimbalAngleX = Math.sin(this.state.missionTime * 1.5) * 3;
            this.telemetry.gimbalAngleY = Math.cos(this.state.missionTime * 1.5) * 3;

        // Phase 3: Entry burn (7km to 2km)
        } else if (this.telemetry.altitude > 2000) {
            // Entry burn - 3 engines to slow down
            this.telemetry.velocity = Math.max(-250, this.telemetry.velocity + 10); // Deceleration
            this.telemetry.altitude += this.telemetry.velocity * dt;

            this.telemetry.thrust = 2200000; // 3 engines at higher throttle
            this.telemetry.engineThrottle = 70;
            this.state.engineStatus = 'ENTRY BURN (3 ENGINES)';

        // Phase 4: Landing burn initiation (2km to 500m)
        } else if (this.telemetry.altitude > 500 && !this.state.landingBurnStarted) {
            // Coast phase before landing burn
            this.telemetry.velocity = Math.max(-120, this.telemetry.velocity - 8);
            this.telemetry.altitude += this.telemetry.velocity * dt;

            this.telemetry.thrust = 0;
            this.telemetry.engineThrottle = 0;
            this.state.engineStatus = 'PREPARING LANDING BURN';

            if (this.telemetry.altitude <= 600) {
                this.state.landingBurnStarted = true;
                console.log('LANDING BURN! Single engine start!');
            }

        // Phase 5: Landing burn / Suicide burn (500m to 20m)
        } else if (this.state.landingBurnStarted && this.telemetry.altitude > 20) {
            // Single engine landing burn - hoverslam maneuver
            const timeToImpact = Math.abs(this.telemetry.altitude / this.telemetry.velocity);
            const requiredDeceleration = Math.abs(this.telemetry.velocity) / timeToImpact;
            const requiredThrust = this.telemetry.mass * (requiredDeceleration + 9.81);

            // Single Merlin engine with throttle control (40-100% capability)
            const maxSingleEngineThrust = 850000; // Single Merlin at sea level
            const minThrust = maxSingleEngineThrust * 0.4; // 40% minimum throttle

            this.telemetry.thrust = Math.min(maxSingleEngineThrust, Math.max(minThrust, requiredThrust));
            this.telemetry.engineThrottle = (this.telemetry.thrust / maxSingleEngineThrust) * 100;
            this.state.engineStatus = 'LANDING BURN (1 ENGINE)';

            // Update velocity and altitude with actual physics
            const acceleration = (this.telemetry.thrust / this.telemetry.mass) - 9.81;
            this.telemetry.velocity += acceleration * dt;
            this.telemetry.altitude += this.telemetry.velocity * dt;

            // Engine parameters during landing burn
            this.telemetry.chamberPressure = 100 + 150 * (this.telemetry.engineThrottle / 100);
            this.telemetry.chamberTemperature = 2500 + 800 * (this.telemetry.engineThrottle / 100);
            this.telemetry.fuelFlowRate = 250 * (this.telemetry.engineThrottle / 100);
            this.telemetry.oxidizerFlowRate = 650 * (this.telemetry.engineThrottle / 100);

            // Landing legs deploy at 40m
            if (this.telemetry.altitude < 40 && !this.state.landingLegsDeployed) {
                this.state.landingLegsDeployed = true;
                console.log('Landing legs deployed!');
            }

        // Phase 6: Final touchdown (20m to 0m)
        } else if (this.telemetry.altitude <= 20 && this.telemetry.altitude > 0) {
            // Precision hover and touchdown
            const targetVelocity = -Math.sqrt(this.telemetry.altitude * 0.8); // Gentle touchdown profile
            this.telemetry.velocity = Math.max(-5, targetVelocity);
            this.telemetry.altitude = Math.max(0, this.telemetry.altitude + this.telemetry.velocity * dt);

            // Precise thrust control for soft landing
            const hoverThrust = this.telemetry.mass * 9.81;
            const velocityCorrection = (targetVelocity - this.telemetry.velocity) * this.telemetry.mass * 10;
            this.telemetry.thrust = Math.max(400000, Math.min(850000, hoverThrust + velocityCorrection));
            this.telemetry.engineThrottle = (this.telemetry.thrust / 850000) * 100;
            this.state.engineStatus = 'TOUCHDOWN BURN';

        // Phase 7: Landed!
        } else {
            this.state.phase = 'LANDED';
            this.telemetry.altitude = 0;
            this.telemetry.velocity = 0;
            this.telemetry.thrust = 0;
            this.telemetry.engineThrottle = 0;
            this.telemetry.chamberPressure = 0;
            this.telemetry.chamberTemperature = 300;
            this.telemetry.fuelFlowRate = 0;
            this.telemetry.oxidizerFlowRate = 0;
            this.telemetry.totalFlowRate = 0;
            this.telemetry.acceleration = 0;
            this.telemetry.gForce = 0;
            this.telemetry.fuelTurbopumpRPM = 0;
            this.telemetry.oxidizerTurbopumpRPM = 0;
            this.telemetry.turbopumpInletPressure = 0;
            this.telemetry.nozzleThroatTemp = 300;
            this.telemetry.turbineInletTemp = 300;
            this.telemetry.dynamicPressure = 0;
            this.telemetry.machNumber = 0;
            this.telemetry.vibrationLevel = 0;
            this.telemetry.exhaustVelocity = 0;
            this.state.engineStatus = 'SHUTDOWN - LANDED';
            console.log('🚀 The Falcon has landed! Mission success!');
        }

        // Update other parameters
        this.telemetry.acceleration = this.telemetry.thrust / this.telemetry.mass - 9.81;
        this.telemetry.gForce = this.telemetry.acceleration / 9.81;
        this.telemetry.totalFlowRate = this.telemetry.fuelFlowRate + this.telemetry.oxidizerFlowRate;

        // Turbopump activity during landing
        this.telemetry.fuelTurbopumpRPM = 20000 * (this.telemetry.engineThrottle / 100);
        this.telemetry.oxidizerTurbopumpRPM = 22000 * (this.telemetry.engineThrottle / 100);
    }

    // Set throttle level
    setThrottle(level) {
        this.state.throttleLevel = Math.max(0, Math.min(100, level));
    }

    // Check for anomalies
    checkAnomalies() {
        const anomalies = [];

        // Max-Q violation
        if (this.telemetry.dynamicPressure > this.limits.maxQ) {
            anomalies.push({
                parameter: 'dynamicPressure',
                value: this.telemetry.dynamicPressure,
                limit: this.limits.maxQ,
                severity: 'WARNING',
                message: 'Approaching max-Q limits'
            });
        }

        // Excessive G-forces
        if (Math.abs(this.telemetry.gForce) > this.limits.maxG) {
            anomalies.push({
                parameter: 'gForce',
                value: this.telemetry.gForce,
                limit: this.limits.maxG,
                severity: 'CRITICAL',
                message: 'Excessive G-forces detected'
            });
        }

        // Over-thrust
        if (this.telemetry.thrust > this.limits.maxThrust) {
            anomalies.push({
                parameter: 'thrust',
                value: this.telemetry.thrust,
                limit: this.limits.maxThrust,
                severity: 'CRITICAL',
                message: 'Engine over-thrust condition'
            });
        }

        return anomalies;
    }

    // Get current state
    getState() {
        return this.state;
    }

    // Get telemetry
    getTelemetry() {
        return this.telemetry;
    }
}

module.exports = RocketSimulator;