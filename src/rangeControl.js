// Range Safety Control System
// Manages launch range clearance and safety zones

class RangeControl {
    constructor() {
        this.status = {
            rangeStatus: 'GREEN', // GREEN, YELLOW, RED

            // Airspace clearance
            airspace: {
                cleared: false,
                aircraft: [],
                nextWindow: null
            },

            // Maritime clearance
            maritime: {
                cleared: false,
                vessels: [],
                exclusionZone: {
                    radius: 50, // nautical miles
                    center: { lat: 28.5729, lon: -80.6490 } // Cape Canaveral
                }
            },

            // Ground safety
            ground: {
                personnelEvacuated: false,
                launchPadClear: false,
                roadsClosed: false,
                hazardZonesClear: false
            },

            // Downrange tracking
            tracking: {
                stationsOnline: 0,
                totalStations: 5,
                telemetryLink: false,
                radarLock: false
            },

            // Flight termination system
            fts: {
                armed: false,
                tested: false,
                batteryLevel: 100,
                signalStrength: 100
            },

            // Range violations
            violations: [],

            // Overall go/no-go
            goForLaunch: false
        };

        // Safety zones (simplified)
        this.safetyZones = {
            launchHazardArea: 5, // km radius
            downrangeHazardArea: 100, // km
            impactZones: []
        };

        // Start monitoring
        this.startRangeMonitoring();
    }

    startRangeMonitoring() {
        // Simulate range monitoring updates
        setInterval(() => {
            this.updateRangeStatus();
        }, 3000);
    }

    updateRangeStatus() {
        // Simulate tracking stations coming online
        if (this.status.tracking.stationsOnline < this.status.tracking.totalStations) {
            if (Math.random() < 0.3) {
                this.status.tracking.stationsOnline++;
            }
        }

        // Simulate aircraft in area (random)
        if (Math.random() < 0.1) {
            this.status.airspace.aircraft.push({
                id: `AC${Math.floor(Math.random() * 9999)}`,
                altitude: Math.floor(Math.random() * 40000),
                distance: Math.floor(Math.random() * 100),
                heading: Math.floor(Math.random() * 360)
            });
        } else if (this.status.airspace.aircraft.length > 0 && Math.random() < 0.3) {
            this.status.airspace.aircraft.shift(); // Aircraft leaving area
        }

        // Simulate vessels
        if (Math.random() < 0.05) {
            this.status.maritime.vessels.push({
                id: `SHIP${Math.floor(Math.random() * 999)}`,
                distance: Math.floor(Math.random() * 60),
                speed: Math.floor(Math.random() * 20)
            });
        } else if (this.status.maritime.vessels.length > 0 && Math.random() < 0.2) {
            this.status.maritime.vessels.shift();
        }

        // FTS battery drain
        this.status.fts.batteryLevel = Math.max(50, this.status.fts.batteryLevel - Math.random() * 0.1);

        // Check overall status
        this.evaluateRangeStatus();
    }

    evaluateRangeStatus() {
        const violations = [];
        let status = 'GREEN';

        // Check airspace
        if (this.status.airspace.aircraft.length > 0) {
            const closeAircraft = this.status.airspace.aircraft.filter(ac => ac.distance < 30);
            if (closeAircraft.length > 0) {
                violations.push('Aircraft in restricted airspace');
                status = 'RED';
            }
        }
        this.status.airspace.cleared = this.status.airspace.aircraft.length === 0;

        // Check maritime
        if (this.status.maritime.vessels.length > 0) {
            const closeVessels = this.status.maritime.vessels.filter(v => v.distance < 50);
            if (closeVessels.length > 0) {
                violations.push('Vessels in exclusion zone');
                status = status === 'GREEN' ? 'YELLOW' : status;
            }
        }
        this.status.maritime.cleared = this.status.maritime.vessels.length === 0;

        // Check tracking stations
        if (this.status.tracking.stationsOnline < 3) {
            violations.push('Insufficient tracking coverage');
            status = 'RED';
        }
        this.status.tracking.telemetryLink = this.status.tracking.stationsOnline >= 3;
        this.status.tracking.radarLock = this.status.tracking.stationsOnline >= 4;

        // Check FTS
        if (!this.status.fts.armed || !this.status.fts.tested) {
            violations.push('Flight Termination System not ready');
            status = status === 'GREEN' ? 'YELLOW' : status;
        }
        if (this.status.fts.batteryLevel < 80) {
            violations.push('FTS battery low');
            status = status === 'GREEN' ? 'YELLOW' : status;
        }

        // Update status
        this.status.rangeStatus = status;
        this.status.violations = violations;
        this.status.goForLaunch = status === 'GREEN' && violations.length === 0;
    }

    // Clear the range for launch
    clearRange() {
        this.status.ground.personnelEvacuated = true;
        this.status.ground.launchPadClear = true;
        this.status.ground.roadsClosed = true;
        this.status.ground.hazardZonesClear = true;

        // Clear any simulated traffic
        this.status.airspace.aircraft = [];
        this.status.maritime.vessels = [];

        console.log('Range cleared for launch');
    }

    // Arm FTS
    armFTS() {
        this.status.fts.armed = true;
        this.status.fts.tested = true;
        console.log('Flight Termination System armed');
    }

    // Disarm FTS
    disarmFTS() {
        this.status.fts.armed = false;
        console.log('Flight Termination System disarmed');
    }

    // Add tracking station
    addTrackingStation() {
        if (this.status.tracking.stationsOnline < this.status.tracking.totalStations) {
            this.status.tracking.stationsOnline++;
        }
    }

    // Get range status
    getStatus() {
        return this.status;
    }

    // Check if range is clear
    isRangeClear() {
        return this.status.goForLaunch;
    }

    // Emergency range closure
    emergencyClosure(reason) {
        this.status.rangeStatus = 'RED';
        this.status.goForLaunch = false;
        this.status.violations.push(`EMERGENCY: ${reason}`);
        console.log(`Range emergency closure: ${reason}`);
    }

    cleanup() {
        // Cleanup if needed
    }
}

module.exports = RangeControl;