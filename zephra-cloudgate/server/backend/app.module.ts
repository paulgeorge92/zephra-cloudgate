import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { SetupModule } from './setup/setup.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ApplicationsModule } from './applications/applications.module';
import { TunnelsModule } from './tunnels/tunnels.module';
import { UsersModule } from './users/users.module';
import { CloudflareModule } from './cloudflare/cloudflare.module';
import { DevicesModule } from './devices/devices.module';
import { PoliciesModule } from './policies/policies.module';
import { ListsModule } from './lists/lists.module';
import { DomainsModule } from './domains/domains.module';
import { DnsModule } from './dns/dns.module';
import { FirewallModule } from './firewall/firewall.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    SetupModule,
    DashboardModule,
    ApplicationsModule,
    TunnelsModule,
    UsersModule,
    CloudflareModule,
    DevicesModule,
    PoliciesModule,
    ListsModule,
    DomainsModule,
    DnsModule,
    FirewallModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
