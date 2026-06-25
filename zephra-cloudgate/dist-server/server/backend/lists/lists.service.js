"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListsService = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let ListsService = class ListsService {
    cloudflare;
    constructor(cloudflare) {
        this.cloudflare = cloudflare;
    }
    async findAll() {
        return this.cloudflare.getGatewayLists();
    }
    async findOne(id) {
        return this.cloudflare.getGatewayList(id);
    }
    async create(data) {
        return this.cloudflare.createGatewayList(data);
    }
    async update(id, data) {
        return this.cloudflare.updateGatewayList(id, data);
    }
    async updateDetails(id, data) {
        return this.cloudflare.updateGatewayListDetails(id, data);
    }
    async delete(id) {
        return this.cloudflare.deleteGatewayList(id);
    }
};
exports.ListsService = ListsService;
exports.ListsService = ListsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService])
], ListsService);
//# sourceMappingURL=lists.service.js.map