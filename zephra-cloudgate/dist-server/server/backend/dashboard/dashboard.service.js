"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
const os = __importStar(require("os"));
const fs = __importStar(require("fs/promises"));
const si = __importStar(require("systeminformation"));
const node_disk_info_1 = require("node-disk-info");
let DashboardService = class DashboardService {
    prisma;
    cloudflare;
    lastCpuStats = [];
    lastNetworkStats = null;
    interfaceName = null;
    interfaceAddress = null;
    lastInterfaceCheck = 0;
    deviceCount = 0;
    tunnelCount = 0;
    lastCfCheck = 0;
    cfRefreshInFlight = null;
    storageStats = [];
    lastStorageCheck = 0;
    storageRefreshInFlight = null;
    weatherCache = null;
    constructor(prisma, cloudflare) {
        this.prisma = prisma;
        this.cloudflare = cloudflare;
    }
    async getSummary() {
        // Cloudflare can be slow or unavailable on home networks; never block the dashboard shell on it.
        const now = Date.now();
        if (now - this.lastCfCheck > 60000 && !this.cfRefreshInFlight) {
            this.cfRefreshInFlight = this.refreshCloudflareCounts()
                .catch((e) => console.error('Failed to fetch stats from Cloudflare:', e))
                .finally(() => {
                this.lastCfCheck = Date.now();
                this.cfRefreshInFlight = null;
            });
        }
        const [applications, users] = await Promise.all([this.prisma.application.count(), this.prisma.user.count()]);
        return {
            applications,
            tunnels: this.tunnelCount,
            users,
            devices: this.deviceCount
        };
    }
    async refreshCloudflareCounts() {
        const [cfDevices, cfTunnels] = await Promise.all([this.cloudflare.getDevices(), this.cloudflare.getTunnels()]);
        this.deviceCount = Array.isArray(cfDevices?.result) ? cfDevices.result.length : 0;
        this.tunnelCount = Array.isArray(cfTunnels?.result) ? cfTunnels.result.length : 0;
    }
    async withTimeout(promise, timeoutMs) {
        let timeout;
        const timeoutPromise = new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async getNetworkInterfaceName() {
        const now = Date.now();
        if (this.interfaceName && now - this.lastInterfaceCheck < 30000) {
            return {
                name: this.interfaceName,
                address: this.interfaceAddress || { ipv4: '0.0.0.0', ipv6: null }
            };
        }
        let name = '';
        let address = null;
        try {
            const networkInterfaces = await si.networkInterfaces();
            const liveAdapter = networkInterfaces.find((iface) => iface.default && iface.operstate === 'up');
            if (liveAdapter) {
                name = liveAdapter.iface;
                address = {
                    ipv4: liveAdapter.ip4,
                    ipv6: liveAdapter.ip6
                };
            }
        }
        catch (e) {
            console.error('Failed to determine network interface info from os.networkInterfaces():', e);
        }
        if (!name) {
            name = 'Network';
        }
        if (!address) {
            address = { ipv4: '0.0.0.0', ipv6: null };
        }
        this.interfaceName = name;
        this.interfaceAddress = address;
        this.lastInterfaceCheck = now;
        return { name, address };
    }
    async getWindowsBytes() {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        return new Promise((resolve) => {
            exec('netstat -e', (err, stdout) => {
                if (err || !stdout)
                    return resolve({ currentRx: 0, currentTx: 0 });
                const lines = stdout.split('\n');
                const bytesLine = lines.find((l) => l.trim().startsWith('Bytes'));
                if (bytesLine) {
                    const parts = bytesLine.trim().split(/\s+/);
                    return resolve({ currentRx: parseInt(parts[1], 10), currentTx: parseInt(parts[2], 10) });
                }
                resolve({ currentRx: 0, currentTx: 0 });
            });
        });
    }
    async getLinuxBytes() {
        try {
            const data = await fs.readFile('/proc/net/dev', 'utf8');
            const lines = data.split('\n');
            let currentRx = 0;
            let currentTx = 0;
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('lo:'))
                    continue;
                const parts = line.split(/\s+/);
                const interfaceRx = parseInt(parts[1], 10);
                const interfaceTx = parseInt(parts[9], 10);
                if (!isNaN(interfaceRx))
                    currentRx += interfaceRx;
                if (!isNaN(interfaceTx))
                    currentTx += interfaceTx;
            }
            return { currentRx, currentTx };
        }
        catch {
            return { currentRx: 0, currentTx: 0 };
        }
    }
    async getNetworkSnapshot() {
        const platform = os.platform();
        if (platform === 'win32')
            return await this.getWindowsBytes();
        if (platform === 'linux')
            return this.getLinuxBytes(); // Linux is sync but incredibly fast (file system memory read)
        return { currentRx: 0, currentTx: 0 };
    }
    async getSystemStats() {
        const cpus = os.cpus();
        const now = Date.now();
        // Calculate accurate CPU usage delta
        let cpuUsage = 0;
        if (this.lastCpuStats.length === cpus.length) {
            let totalDiff = 0;
            let idleDiff = 0;
            cpus.forEach((cpu, i) => {
                const last = this.lastCpuStats[i];
                const currentTotal = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                const currentIdle = cpu.times.idle;
                totalDiff += currentTotal - last.total;
                idleDiff += currentIdle - last.idle;
                this.lastCpuStats[i] = {
                    time: now,
                    total: currentTotal,
                    idle: currentIdle
                };
            });
            cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
        }
        else {
            this.lastCpuStats = cpus.map((cpu) => ({
                time: now,
                total: Object.values(cpu.times).reduce((a, b) => a + b, 0),
                idle: cpu.times.idle
            }));
            cpuUsage =
                cpus.reduce((acc, cpu) => {
                    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                    return acc + (1 - cpu.times.idle / total) * 100;
                }, 0) / cpus.length;
        }
        // Network Stats
        const networkInfo = await this.getNetworkInterfaceName();
        const interfaceName = networkInfo.name;
        const { currentRx, currentTx } = await this.getNetworkSnapshot();
        let downloadSpeed = '0 B/s';
        let uploadSpeed = '0 B/s';
        let downloadBps = 0;
        let uploadBps = 0;
        if (this.lastNetworkStats && currentRx > 0) {
            const timeDiff = (now - this.lastNetworkStats.time) / 1000;
            if (timeDiff > 0) {
                downloadBps = Math.max(0, currentRx - this.lastNetworkStats.rx) / timeDiff;
                uploadBps = Math.max(0, currentTx - this.lastNetworkStats.tx) / timeDiff;
                const formatSpeed = (bps) => {
                    if (bps > 1024 * 1024)
                        return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
                    if (bps > 1024)
                        return `${(bps / 1024).toFixed(1)} KB/s`;
                    return `${Math.round(bps)} B/s`;
                };
                downloadSpeed = formatSpeed(downloadBps);
                uploadSpeed = formatSpeed(uploadBps);
            }
        }
        if (currentRx > 0) {
            this.lastNetworkStats = { time: now, rx: currentRx, tx: currentTx };
        }
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return {
            cpu: {
                usage: Math.round(cpuUsage),
                cores: cpus.length,
                model: cpus[0]?.model || 'Unknown'
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usagePercent: Math.round((usedMem / totalMem) * 100)
            },
            network: {
                upload: uploadSpeed,
                download: downloadSpeed,
                uploadBps,
                downloadBps,
                interfaceName,
                interfaceAddress: networkInfo.address
            },
            platform: os.platform(),
            uptime: os.uptime()
        };
    }
    async getStorageStats() {
        const now = Date.now();
        if (this.storageStats.length > 0 && now - this.lastStorageCheck < 5 * 60 * 1000) {
            return this.storageStats;
        }
        if (!this.storageRefreshInFlight) {
            this.storageRefreshInFlight = this.refreshStorageStats()
                .then((stats) => {
                this.storageStats = stats;
                this.lastStorageCheck = Date.now();
                return stats;
            })
                .catch((e) => {
                console.error('Failed to get disk info', e);
                this.lastStorageCheck = Date.now();
                return this.storageStats;
            })
                .finally(() => {
                this.storageRefreshInFlight = null;
            });
        }
        if (this.storageStats.length > 0) {
            return this.storageStats;
        }
        try {
            return await this.withTimeout(this.storageRefreshInFlight, 1500);
        }
        catch {
            return [];
        }
    }
    async refreshStorageStats() {
        const getDiskType = (description) => {
            switch ((description || '').toLowerCase()) {
                case 'local fixed disk':
                    return 'Internal Storage';
                case 'removable disk':
                    return 'USB Storage';
                case 'network connection':
                    return 'Network Drive';
                default:
                    return description;
            }
        };
        if (os.platform() === 'win32') {
            return this.getWindowsStorageStats();
        }
        const disks = await (0, node_disk_info_1.getDiskInfo)();
        return disks
            .filter((d) => {
            const totalGB = d.blocks / (1024 * 1024 * 1024);
            return totalGB >= 1;
        })
            .map((d) => {
            const totalGB = d.blocks / (1024 * 1024 * 1024);
            const usedGB = d.used / (1024 * 1024 * 1024);
            const usedPercent = parseFloat(((usedGB / totalGB) * 100).toFixed(1));
            return {
                label: d.mounted.endsWith(':') ? d.mounted.concat('\\') : d.mounted,
                used: usedGB.toFixed(1),
                total: totalGB.toFixed(1),
                usedPercent: usedPercent,
                description: getDiskType(d.filesystem || '')
            };
        });
    }
    async getWindowsStorageStats() {
        const driveRoot = process.env.SYSTEMDRIVE ? `${process.env.SYSTEMDRIVE}\\` : 'C:\\';
        const stats = await fs.statfs(driveRoot);
        const total = Number(stats.blocks) * Number(stats.bsize);
        const free = Number(stats.bavail) * Number(stats.bsize);
        const used = total - free;
        const totalGB = total / (1024 * 1024 * 1024);
        const usedGB = used / (1024 * 1024 * 1024);
        return [
            {
                label: driveRoot,
                used: usedGB.toFixed(1),
                total: totalGB.toFixed(1),
                usedPercent: parseFloat(((usedGB / totalGB) * 100).toFixed(1)),
                description: 'Internal Storage'
            }
        ];
    }
    async getLocationFromIP() {
        try {
            const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
            const res = (await this.withTimeout(axios.get('https://ipapi.co/json/', { timeout: 2500 }), 3000)).data;
            return {
                lat: res.latitude,
                lon: res.longitude,
                city: res.city,
                country: res.country_name
            };
        }
        catch (e) {
            console.error('Failed to get location from IP:', e);
            return null;
        }
    }
    async getWeather(lat, lon) {
        const cacheKey = `${lat ?? 'auto'}:${lon ?? 'auto'}`;
        const now = Date.now();
        if (this.weatherCache?.key === cacheKey && now - this.weatherCache.checkedAt < 10 * 60 * 1000) {
            return this.weatherCache.value;
        }
        try {
            const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
            let targetLat = lat;
            let targetLon = lon;
            let city = 'Detecting...';
            if (!targetLat || !targetLon) {
                const location = await this.getLocationFromIP();
                if (location) {
                    targetLat = location.lat;
                    targetLon = location.lon;
                    city = location.city;
                }
                else {
                    // Fallback to London
                    targetLat = 51.5074;
                    targetLon = -0.1278;
                    city = 'London';
                }
            }
            const res = (await this.withTimeout(axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,wind_speed_10m,weather_code&wind_speed_unit=kmh`, { timeout: 2500 }), 3000)).data;
            const current = res.current;
            const value = {
                temperature: current.temperature_2m,
                feelsLike: current.apparent_temperature,
                humidity: current.relative_humidity_2m,
                uvIndex: current.uv_index,
                windSpeed: current.wind_speed_10m,
                weatherCode: current.weather_code,
                city,
                lat: targetLat,
                lon: targetLon
            };
            this.weatherCache = { key: cacheKey, checkedAt: now, value };
            return value;
        }
        catch (e) {
            const value = {
                temperature: 0,
                feelsLike: 0,
                humidity: 0,
                uvIndex: 0,
                windSpeed: 0,
                weatherCode: 0,
                city: 'Unknown',
                lat: lat || 0,
                lon: lon || 0,
                error: 'Weather data unavailable',
                message: e.message
            };
            this.weatherCache = { key: cacheKey, checkedAt: now, value };
            return value;
        }
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudflare_service_1.CloudflareService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map