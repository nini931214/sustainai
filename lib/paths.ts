import path from "path";

// 🔗 外接硬碟資料存放位置
export const DATA_DIR = "/Volumes/My Passport for Mac/Work/SustainAI/data";

// 🧱 模擬鏈與批次檔路徑
export const CHAIN_PATH = path.join(DATA_DIR, "chain.json");
export const BATCHES_PATH = path.join(DATA_DIR, "batches.json");
