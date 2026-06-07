import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { DashboardSummary, SystemStats, WeatherStats } from '../shared/types';
import * as os from 'os';
import * as gateway from 'default-gateway';
import { getDiskInfo } from 'node-disk-info';
import { IPAPIJsonResponse, WeatherAPIResponse } from './dashboard.types';

@Injectable()
export class DashboardService {
  private lastCpuStats: { time: number; total: number; idle: number }[] = [];
  private lastNetworkStats: { time: number; rx: number; tx: number } | null = null;
  private interfaceName: string | null = null;
  private interfaceAddress: { ipv4: string; ipv6: string | null } | null = null;
  private lastInterfaceCheck: number = 0;
  private deviceCount: number = 0;
  private tunnelCount: number = 0;
  private lastCfCheck: number = 0;

  constructor(
    private prisma: PrismaService,
    private cloudflare: CloudflareService
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    // Optimization: Cache Cloudflare data for 60 seconds
    const now = Date.now();
    if (now - this.lastCfCheck > 60000) {
      try {
        const [cfDevices, cfTunnels] = await Promise.all([this.cloudflare.getDevices(), this.cloudflare.getTunnels()]);
        this.deviceCount = Array.isArray(cfDevices?.result) ? cfDevices.result.length : 0;
        this.tunnelCount = Array.isArray(cfTunnels?.result) ? cfTunnels.result.length : 0;
        this.lastCfCheck = now;
      } catch (e) {
        console.error('Failed to fetch stats from Cloudflare:', e);
      }
    }

    const [applications, users] = await Promise.all([this.prisma.application.count(), this.prisma.user.count()]);

    return {
      applications,
      tunnels: this.tunnelCount,
      users,
      devices: this.deviceCount
    };
  }

  async getNetworkInterfaceName(): Promise<{ name: string; address: { ipv4: string; ipv6: string | null } }> {
    const now = Date.now();
    if (this.interfaceName && now - this.lastInterfaceCheck < 30000) {
      return {
        name: this.interfaceName,
        address: this.interfaceAddress || { ipv4: '0.0.0.0', ipv6: null }
      };
    }

    let name: string = '';
    let address: { ipv4: string; ipv6: string | null } | null = null;

    try {
      const interfaces = os.networkInterfaces();
      const route = await gateway.gateway4async();
      name = route.int || '';

      const adapter = interfaces[name];

      const ipv4 = adapter?.find((x) => x.family === 'IPv4' && !x.internal);
      const ipv6 = adapter?.find((x) => x.family === 'IPv6' && !x.internal);
      address = {
        ipv4: ipv4?.address || '',
        ipv6: ipv6?.address || null
      }

      /* if (os.platform() === 'win32') {
        try {
          const { execSync } = await import('child_process');
          const cmd = 'powershell -Command "(Get-NetRoute -DestinationPrefix \'0.0.0.0/0\' | Get-NetAdapter).Name"';
          const result = execSync(cmd).toString().trim();
          if (result) {
            name =
              result
                .split(/\r?\n/)
                .map((n) => n.trim())
                .find((n) => !!n) || null;
          }
        } catch (e) {
          console.error('Failed to get network interface name:', e);
        }
      }

      if (name && interfaces[name]) {
        const addresses = interfaces[name] || [];
        address = {
          ipv4: addresses.find((addr) => !addr.internal && addr.family === 'IPv4')?.address || '0.0.0.0',
          ipv6: addresses.find((addr) => !addr.internal && addr.family === 'IPv6')?.address || null
        };
      }

      if (!address) {
        for (const [iface, addresses] of Object.entries(interfaces)) {
          if (!Array.isArray(addresses)) continue;

          const ipv4 = addresses.find((addr) => !addr.internal && addr.family === 'IPv4');
          const ipv6 = addresses.find((addr) => !addr.internal && addr.family === 'IPv6');

          if (ipv4 || ipv6) {
            if (!name) {
              name = iface;
            }
            address = {
              ipv4: ipv4?.address || '0.0.0.0',
              ipv6: ipv6?.address || null
            };
            break;
          }
        }
      }

      if (!name && Object.keys(interfaces).length > 0) {
        name = Object.keys(interfaces)[0];
      } */
    } catch (e) {
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

  async getSystemStats(): Promise<SystemStats> {
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
    } else {
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
    let currentRx = 0;
    let currentTx = 0;
    const networkInfo = await this.getNetworkInterfaceName();
    const interfaceName = networkInfo.name;

    if (os.platform() === 'win32') {
      try {
        const { execSync } = await import('child_process');
        const output = execSync('netstat -e').toString();
        const lines = output.split('\n');
        const bytesLine = lines.find((l) => l.trim().startsWith('Bytes'));
        if (bytesLine) {
          const parts = bytesLine.trim().split(/\s+/);
          currentRx = parseInt(parts[1], 10);
          currentTx = parseInt(parts[2], 10);
        }
      } catch (e) {
        console.error('Failed to get netstat stats:', e);
      }
    }

    let downloadSpeed = '0 B/s';
    let uploadSpeed = '0 B/s';
    let downloadBps = 0;
    let uploadBps = 0;

    if (this.lastNetworkStats && currentRx > 0) {
      const timeDiff = (now - this.lastNetworkStats.time) / 1000;
      if (timeDiff > 0) {
        downloadBps = Math.max(0, currentRx - this.lastNetworkStats.rx) / timeDiff;
        uploadBps = Math.max(0, currentTx - this.lastNetworkStats.tx) / timeDiff;

        const formatSpeed = (bps: number) => {
          if (bps > 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
          if (bps > 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
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

  async getStorageStats(): Promise<import('../shared/types').DiskStats[]> {
    const getDiskType = (description: string): string => {
      switch ((description || '').toLowerCase()) {
        case 'local fixed disk':
          return 'Internal Storage';
          break;
        case 'removable disk':
          return 'USB Storage';
          break;
        case 'network connection':
          return 'Network Drive';
          break;
        default:
          return description;
      }
    };
    try {
      const disks = await getDiskInfo();
      return disks
        .filter((d) => {
          // Filter out small boot partitions/CDROMs (less than 1GB) to ensure we only show real fixed drives.
          // Convert d.blocks from bytes to GB
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
    } catch (e) {
      console.error('Failed to get disk info', e);
      return [];
    }
  }

  async getLocationFromIP() {
    try {
      const axios = (await import('axios')).default;
      const res: IPAPIJsonResponse = (await axios.get('https://ipapi.co/json/')).data as IPAPIJsonResponse;
      return {
        lat: res.latitude,
        lon: res.longitude,
        city: res.city,
        country: res.country_name
      };
    } catch (e) {
      console.error('Failed to get location from IP:', e);
      return null;
    }
  }

  async getWeather(lat?: number, lon?: number): Promise<WeatherStats | { error: string; message: string }> {
    try {
      const axios = (await import('axios')).default;
      let targetLat = lat;
      let targetLon = lon;
      let city = 'Detecting...';

      if (!targetLat || !targetLon) {
        const location = await this.getLocationFromIP();
        if (location) {
          targetLat = location.lat;
          targetLon = location.lon;
          city = location.city;
        } else {
          // Fallback to London
          targetLat = 51.5074;
          targetLon = -0.1278;
          city = 'London';
        }
      }

      const res: WeatherAPIResponse = (await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,wind_speed_10m,weather_code&wind_speed_unit=kmh`)).data as WeatherAPIResponse;
      const current = res.current;
      return {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        uvIndex: current.uv_index,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        city,
        lat: targetLat,
        lon: targetLon
      } as WeatherStats;
    } catch (e: unknown) {
      return {
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
        message: (e as Error).message
      };
    }
  }
}
