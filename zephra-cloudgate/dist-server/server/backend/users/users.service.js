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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let UsersService = class UsersService {
    prisma;
    cloudflare;
    constructor(prisma, cloudflare) {
        this.prisma = prisma;
        this.cloudflare = cloudflare;
    }
    async findAll(page, per_page) {
        const skip = ((page || 1) - 1) * (per_page || 10);
        const take = per_page || 10;
        const [users, total_count] = await Promise.all([
            this.prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    cloudflareId: true,
                    createdAt: true,
                    updatedAt: true,
                },
                where: {
                    role: {
                        not: 'ADMIN',
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.user.count({
                where: {
                    role: {
                        not: 'ADMIN',
                    },
                },
            })
        ]);
        return {
            response: users.map((u) => ({
                ...u,
                role: u.role,
                cloudflareId: u.cloudflareId || undefined,
                createdAt: u.createdAt.toISOString(),
                updatedAt: u.updatedAt.toISOString(),
            })),
            total_count
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                cloudflareId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            ...user,
            role: user.role,
            cloudflareId: user.cloudflareId || undefined,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
    async create(data) {
        const hashedPassword = data.password
            ? await bcrypt.hash(data.password, 10)
            : null;
        const user = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                password: hashedPassword,
            },
        });
        // Sync to Cloudflare if user is a MEMBER
        if (user.role === 'MEMBER') {
            try {
                const cfRes = await this.cloudflare.addAccountMemberByRole(user.name, user.email, 'MEMBER');
                if (cfRes?.id) {
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: { cloudflareId: cfRes.id },
                    });
                    user.cloudflareId = cfRes.id;
                }
            }
            catch (e) {
                console.error('Failed to sync user creation to Cloudflare:', e);
            }
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            cloudflareId: user.cloudflareId || undefined,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
    async update(id, data) {
        const { currentPassword, ...updateData } = data;
        const prismaData = {
            name: updateData.name,
            email: updateData.email,
            role: updateData.role,
        };
        if (updateData.password) {
            if (!currentPassword) {
                throw new common_1.BadRequestException('Current password is required to change password');
            }
            const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
            if (!user.password ||
                !(await bcrypt.compare(currentPassword, user.password))) {
                throw new common_1.BadRequestException('Invalid current password');
            }
            prismaData.password = await bcrypt.hash(updateData.password, 10);
            delete prismaData.confirm; // Ensure frontend confirm field doesn't leak
        }
        const userBefore = await this.prisma.user.findUniqueOrThrow({ where: { id } });
        const updated = await this.prisma.user.update({
            where: { id },
            data: prismaData,
        });
        // Sync to Cloudflare if not Admin
        if (userBefore.role !== 'ADMIN' && updateData.role && updateData.role !== 'ADMIN') {
            try {
                await this.cloudflare.updateAccountMemberRoleByEmail(updated.email, updateData.role, updated.cloudflareId || undefined);
            }
            catch (e) {
                console.error('Failed to sync user update to Cloudflare:', e);
            }
        }
        return {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
            cloudflareId: updated.cloudflareId || undefined,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        };
    }
    async delete(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (user && user.role !== 'ADMIN') {
            try {
                await this.cloudflare.deleteAccountMemberByEmail(user.email, user.cloudflareId || undefined);
            }
            catch (e) {
                console.error('Failed to sync user deletion to Cloudflare:', e);
            }
        }
        await this.prisma.user.delete({ where: { id } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudflare_service_1.CloudflareService])
], UsersService);
//# sourceMappingURL=users.service.js.map