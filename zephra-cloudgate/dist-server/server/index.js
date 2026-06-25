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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv = __importStar(require("dotenv"));
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const next = __importStar(require("next"));
const path = __importStar(require("path"));
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./backend/app.module");
const http_exception_filter_1 = require("./backend/shared/filters/http-exception.filter");
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000);
const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
async function bootstrap() {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const server = (0, express_1.default)();
    const apiServer = (0, express_1.default)();
    const nextApp = next.default({ dev, hostname, port });
    const nextHandler = nextApp.getRequestHandler();
    await nextApp.prepare();
    const nestApp = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(apiServer), {
        logger: ['error', 'warn', 'log'],
    });
    nestApp.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    nestApp.setGlobalPrefix('v1');
    await nestApp.init();
    server.use('/uploads', express_1.default.static(uploadsDir));
    server.use('/api', apiServer);
    server.all(/.*/, (req, res) => nextHandler(req, res));
    http.createServer(server).listen(port, hostname, () => {
        console.log(`Zephra CloudGate running at http://${hostname}:${port}`);
        console.log('API available under /api/v1');
    });
}
bootstrap().catch((error) => {
    console.error('Failed to start Zephra CloudGate', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map