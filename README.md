# SustainAI — 循環經濟原型控制台

一個從「回收端 → 處理廠 → 製造商 → 稽核方 → 消費者 QR 查詢」的完整原型，
用來 Demo **塑膠回收再製的批次履歷、碳足跡與 Token 模型**。

目前版本重點：  
- ✅ 可實際操作的多角色入口與流程  
- ✅ 批次履歷 / Token / Balance / Dashboard / AI 報告  
- ✅ 已設計好上鏈資料結構，暫以 JSON 模擬「鏈上儲存」  
- 🔜 可依 Roadmap 直接升級為 Polygon + 智能合約版本

---

## 1. System Overview 系統總覽

SustainAI 模型將一個回收塑膠批次，拆成四個主要角色：

1. ♻️ **Recycler 回收商**
2. 🧪 **Processor 處理廠（再生料工廠）**
3. 🏭 **Manufacturer 製造商**
4. ✅ **Auditor 稽核方**

每個角色在系統中都有自己的「入口頁」，負責填寫/確認各階段資料。
系統會自動生成：

- 批次履歷頁（Traceability Page）
- Tokens & Balances 模擬（代表材料與價值流動）
- ESG / 碳排 Dashboard
- AI 版 ESG 敘述與報告摘要

---

## 2. Features 功能總覽

### 2.1 多角色入口 Home

首頁提供 Demo 專用的控制台：

- 回收商入口  
- 處理廠入口  
- 製造商入口  
- 稽核方入口  
- 批次履歷清單 `/recent`  
- 驗章/掃碼頁 `/verify`  
- Dashboard  
- AI 報告 Demo  
- Multi-Role Console（展示 Mint → Process → Use 一鍵流程）

> 用途：給老師 / 評審從一個畫面理解「這套系統的全貌」。

---

### 2.2 批次履歷 Batch Records

路徑：`/recent` → 點選任一筆批次 → 導向 `/trace/[record]`

內容包含：

- 批次基本資訊（ID、材料、重量、日期…）
- 回收商 / 處理廠 / 製造商 / 稽核方 資訊
- 各階段碳排估算（運輸、再製、製造…）
- Tokens（此批次）  
  - Token ID、狀態、材料、重量、流向
- Balances（模擬結算）  
  - 各角色持有的 Token / 積分

目前資料來源：`/data/chain.json`  
> 設計成可以直接替換為「鏈上讀取結果」。

---

### 2.3 QR Trace & Verify

- `/qr/[id]`：產生該批次的 QR 追溯頁  
- `/verify`：驗章 Demo，模擬掃碼進來查詢批次是否有效/審核通過

用途：  
- 用於展示給消費者端 / 監管單位看「這杯飲料 / 這個產品」背後的回收來源。

---

### 2.4 Dashboard 與 AI 報告

- `/dashboard`  
  - 顯示回收量、處理量、製造使用量的趨勢或分布圖  
  - 目前用 demo data + Chart.js 呈現

- `/ai`（AI 報告 Demo）  
  - 整合批次與碳排資訊，輸出類似 ESG 報告段落  
  - 模擬「未來接 LLM 自動生成敘述」的效果

---

## 3. Implementation 簡要技術說明

- Framework：Next.js App Router
- 資料層：`/data/chain.json`（設計為對應未來鏈上結構）
- 前端：
  - 卡片式控制台首頁
  - 批次列表 + 履歷表格
  - Tokens / Balances JSON 區塊
  - Dashboard 圖表
  - AI 報告樣板
- 角色切換：
  - 以不同入口頁模擬「權限分流」
  - 未來可升級成 API key / wallet-based auth

---

## 4. Current Status 現況總結

目前已完成（可 Demo）：

- [x] 模型設計：回收商 → 處理廠 → 製造商 → 稽核 → QR 查詢
- [x] 多角色入口頁與流程導覽
- [x] 批次資料 `chain.json` 結構設計（可對應鏈上 storage）
- [x] 批次履歷頁 `/trace/[record]`
- [x] Tokens & Balances 模擬（Mint → Process → Use）
- [x] Dashboard 與 AI 報告 Demo
- [x] QR 追溯與驗章流程

尚未實作但已規劃：

- [ ] 真正部署至 Polygon（或其他 EVM）上的 Solidity 合約  
- [ ] 真實使用者登入 / 權限（API key / Wallet / OAuth）  
- [ ] 更細緻的碳排計算模型  
- [ ] 進階 UI / RWD / 動畫效果  

> 本專案目前定位為「**功能完整、可操作的上鏈原型 Demo**」，  
> 足夠用於學校專題、申請資料與競賽展示。

---

## 5. Roadmap 未來升級路線

### 5.1 智能合約與 Polygon 上鏈（建議用 Remix 快速版）

1. 設計 `SustainAI` Solidity 合約：  
   - `struct Batch { ... }`  
   - `mapping(string => Batch)`  
   - `setBatch(...)` / `getBatch(...)`

2. 使用 **Remix + MetaMask + Polygon Amoy Testnet**：
   - 在 Remix 部署合約  
   - 取得合約地址與 ABI

3. 回到本專案：
   - 在 `lib/contract.ts` 中寫入：

     ```ts
     export const CONTRACT_ADDRESS = "0x...";
     export const CONTRACT_ABI = [ /* from Remix */ ];
     ```

   - 未來可用 `viem` 或 `ethers`：
     - 從 `/trace/[record]` 讀取鏈上資料  
     - 或在 Multi-Role Console 頁面寫入鏈上 Batch

> 這條路線完全不用再碰 Hardhat，在目前磁碟限制下是最穩定的做法。

---

### 5.2 使用者登入與權限控管（Demo 等級）

短期可行方案：

- 以 URL `?role=recycler` / `?role=processor` / `?role=manufacturer` / `?role=auditor`  
- 或簡單 API key：`?key=RECYCLE_DEMO`  
- 在各入口頁做檢查，不符就顯示「未授權」。

長期方案：

- 若走 Web3：用 MetaMask / WalletConnect 作為登入  
- 若走 Web2：用 NextAuth / OAuth 實作多角色帳號。

---

### 5.3 UI / RWD / 動畫優化

- 採用 Tailwind / shadcn 或保留現有 inline style 再整理
- 為首頁卡片加入 hover 動畫、流程引導箭頭
- 將 Dashboard + AI 報告做成「一頁式簡報視圖」

---

### 5.4 碳排公式升級

目前：簡化版係數（運輸 vs 加工 co2e 比較）  
未來可：

- 採用公開碳排係數（IPCC, ISO, GHG Protocol）
- 對接工廠 IoT 資料（電力、天然氣、水耗）
- 依材料 / 工藝建立不同係數表，在系統中配置。

---

## 6. 使用情境（給報告 / 簡報用）

- 🎓 **學校專題 / 碩士申請**  
  - 展示「從商業問題 → 流程設計 → 上鏈模型 → 前端原型」的完整思考。
- 💼 **競賽 / Demo Day**  
  - 直接操作首頁控制台，跑一輪回收 → 處理 → 製造 → 稽核 → QR 查詢。
- 🔬 **未來研究延伸**  
  - 可將真實 ESG / 碳排數據接入，作為 FinTech / ESG / supply-chain 研究平台。

---