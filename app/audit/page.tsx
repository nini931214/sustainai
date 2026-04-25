import { redirect } from "next/navigation";
import BackToFlow from "@/app/components/BackToFlow";

// 在 return 的 header 區塊裡
<div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
  <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
    稽核方入口（批次審核）
  </h1>
  <BackToFlow />
</div>

export default function AuditRedirect() {
  redirect("/auditor");
}