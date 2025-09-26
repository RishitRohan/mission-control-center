// Weather Monitoring System
// Simulates weather conditions for launch decisions

class WeatherMonitor {
    constructor() {
        this.conditions = {
            // Wind conditions
            surfaceWind: {
                speed: 15, // knots
                direction: 270, // degrees
                gusts: 20 // knots
            },
            upperLevelWind: {
                speed: 45, // knots at altitude
                direction: 250,
                shear: 5 // knots per 1000ft
            },

            // Atmospheric conditions
            temperature: 25, // Celsius
            pressure: 1013, // mb
            humidity: 65, // %
            dewPoint: 18, // Celsius

            // Cloud coverage
            cloudCeiling: 8000, // feet
            cloudCoverage: 30, // percentage
            visibility: 10, // miles

            // Precipitation
            precipitation: 'NONE', // NONE, LIGHT, MODERATE, HEAVY
            lightningDetected: false,
            lightningDistance: 50, // miles

            // Launch constraints
            constraints: {
                go: true,
                issues: []
            }
        };

        // Weather limits for launch
        this.limits = {
            maxSurfaceWind: 30, // knots
            maxUpperWind: 80, // knots
            minCloudCeiling: 2000, // feet
            minVisibility: 3, // miles
            maxLightningDistance: 10, // miles
            minTemperature: -5, // Celsius
            maxTemperature: 40, // Celsius
        };

        // Update weather periodically
        this.updateInterval = null;
        this.startWeatherUpdates();
    }

    startWeatherUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateWeatherConditions();
        }, 5000); // Update every 5 seconds
    }

    updateWeatherConditions() {
        // Simulate changing weather conditions

        // Wind variations
        this.conditions.surfaceWind.speed += (Math.random() - 0.5) * 2;
        this.conditions.surfaceWind.speed = Math.max(5, Math.min(40, this.conditions.surfaceWind.speed));
        this.conditions.surfaceWind.direction += (Math.random() - 0.5) * 10;
        this.conditions.surfaceWind.gusts = this.conditions.surfaceWind.speed + Math.random() * 10;

        // Upper wind
        this.conditions.upperLevelWind.speed += (Math.random() - 0.5) * 5;
        this.conditions.upperLevelWind.speed = Math.max(20, Math.min(100, this.conditions.upperLevelWind.speed));

        // Temperature drift
        this.conditions.temperature += (Math.random() - 0.5) * 0.5;
        this.conditions.humidity += (Math.random() - 0.5) * 2;
        this.conditions.humidity = Math.max(20, Math.min(100, this.conditions.humidity));

        // Cloud changes
        this.conditions.cloudCoverage += (Math.random() - 0.5) * 5;
        this.conditions.cloudCoverage = Math.max(0, Math.min(100, this.conditions.cloudCoverage));
        this.conditions.cloudCeiling += (Math.random() - 0.5) * 500;
        this.conditions.cloudCeiling = Math.max(500, Math.min(20000, this.conditions.cloudCeiling));

        // Lightning simulation (random chance)
        if (Math.random() < 0.05) { // 5% chance
            this.conditions.lightningDetected = true;
            this.conditions.lightningDistance = Math.random() * 30;
        } else if (this.conditions.lightningDetected) {
            this.conditions.lightningDistance += 5; // Lightning moving away
            if (this.conditions.lightningDistance > 50) {
                this.conditions.lightningDetected = false;
            }
        }

        // Check constraints
        this.checkWeatherConstraints();
    }

    checkWeatherConstraints() {
        const issues = [];
        let go = true;

        // Surface wind check
        if (this.conditions.surfaceWind.speed > this.limits.maxSurfaceWind) {
            issues.push(`Surface winds exceed ${this.limits.maxSurfaceWind} knots`);
            go = false;
        }

        // Upper wind check
        if (this.conditions.upperLevelWind.speed > this.limits.maxUpperWind) {
            issues.push(`Upper level winds exceed ${this.limits.maxUpperWind} knots`);
            go = false;
        }

        // Cloud ceiling check
        if (this.conditions.cloudCeiling < this.limits.minCloudCeiling) {
            issues.push(`Cloud ceiling below ${this.limits.minCloudCeiling} feet`);
            go = false;
        }

        // Visibility check
        if (this.conditions.visibility < this.limits.minVisibility) {
            issues.push(`Visibility below ${this.limits.minVisibility} miles`);
            go = false;
        }

        // Lightning check
        if (this.conditions.lightningDetected &&
            this.conditions.lightningDistance < this.limits.maxLightningDistance) {
            issues.push(`Lightning within ${this.limits.maxLightningDistance} miles`);
            go = false;
        }

        // Temperature check
        if (this.conditions.temperature < this.limits.minTemperature ||
            this.conditions.temperature > this.limits.maxTemperature) {
            issues.push('Temperature out of limits');
            go = false;
        }

        // Precipitation check
        if (this.conditions.precipitation !== 'NONE' && this.conditions.precipitation !== 'LIGHT') {
            issues.push('Heavy precipitation detected');
            go = false;
        }

        this.conditions.constraints.go = go;
        this.conditions.constraints.issues = issues;
    }

    getCurrentConditions() {
        return this.conditions;
    }

    getConstraints() {
        return this.conditions.constraints;
    }

    isGoForLaunch() {
        return this.conditions.constraints.go;
    }

    // Simulate weather event
    triggerWeatherEvent(type) {
        switch(type) {
            case 'LIGHTNING':
                this.conditions.lightningDetected = true;
                this.conditions.lightningDistance = Math.random() * 15;
                break;
            case 'HIGH_WINDS':
                this.conditions.surfaceWind.speed = 35 + Math.random() * 10;
                this.conditions.surfaceWind.gusts = this.conditions.surfaceWind.speed + 15;
                break;
            case 'LOW_CEILING':
                this.conditions.cloudCeiling = 1000 + Math.random() * 500;
                this.conditions.cloudCoverage = 80 + Math.random() * 20;
                break;
            case 'CLEAR':
                this.conditions.surfaceWind.speed = 5 + Math.random() * 10;
                this.conditions.cloudCeiling = 15000;
                this.conditions.cloudCoverage = 10;
                this.conditions.lightningDetected = false;
                this.conditions.precipitation = 'NONE';
                break;
        }
        this.checkWeatherConstraints();
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

module.exports = WeatherMonitor;