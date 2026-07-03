"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const TERMS_VERSION = "V2.0_2026_06";

function TermsContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flow";
  const [checked, setChecked] = useState(false);

  function acceptTerms() {
    document.cookie = `sustainai_terms_accepted=${TERMS_VERSION}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.href = next || "/flow";
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-white shadow-lg">
        <div className="border-b p-8">
          <h1 className="text-3xl font-bold">
            SustainAI 服務條款暨隱私權政策
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            版本：V2.0 ｜ 修訂日期：2026/06
          </p>
        </div>

        <div className="h-[520px] overflow-y-auto p-8 leading-8 text-gray-800">
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-bold">網站使用聲明</h2>
              <p className="mt-4">
                本平台提供之 ESG 驗證、AI 分析、版本追溯及相關資訊服務，僅供使用者於合法授權範圍內使用。平台所呈現之分析結果、公開追溯資訊及其他內容，係依使用者提供之資料及系統分析結果產生，僅供參考，不構成法律、財務、會計、環境查證或其他專業意見。
              </p>
              <p className="mt-4">
                使用本平台前，請詳閱《服務條款暨隱私權政策》。當您登入或使用本平台服務時，即視為已閱讀、瞭解並同意相關條款內容。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">前言</h2>
              <p className="mt-4">
                歡迎您使用 SustainAI 循環經濟 ESG 驗證平台（以下簡稱「本平台」）。
              </p>
              <p className="mt-4">
                本平台提供回收批次管理、ESG 驗證、版本追溯、AI 分析、稽核管理及相關資訊服務，協助企業建立循環經濟資料管理及驗證流程。
              </p>
              <p className="mt-4">
                為保障您與本平台之權益，並釐清雙方於使用本平台服務時之權利與義務，請於登入或使用本平台服務前，詳細閱讀本《服務條款暨隱私權政策》（以下簡稱「本條款」）。
              </p>
              <p className="mt-4">
                當您登入本平台、勾選「我已閱讀並同意本服務條款」（如適用）或實際使用本平台任何服務時，即表示您已閱讀、瞭解並同意遵守本條款之全部內容。如您不同意本條款之全部或部分內容，請立即停止使用本平台相關服務。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第一章 服務內容</h2>

              <h3 className="mt-4 font-bold">第一條 平台服務</h3>
              <p className="mt-2">
                本平台所提供之各項功能，將依不同使用者角色、權限及授權範圍有所不同，包括但不限於：
              </p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>回收批次資料建置與管理。</li>
                <li>回收流程追蹤及版本管理。</li>
                <li>ESG 資料驗證與稽核管理。</li>
                <li>AI 輔助分析、摘要及永續資訊整理。</li>
                <li>QR Code 公開追溯與驗證。</li>
                <li>版本驗證及資料完整性檢核。</li>
                <li>其他經本平台公告之相關服務。</li>
              </ol>
              <p className="mt-2">
                本平台得依營運需求、法令規定或系統更新需要，新增、調整、暫停或終止部分功能或服務內容。
              </p>

              <h3 className="mt-4 font-bold">第二條 服務適用對象</h3>
              <p className="mt-2">
                本平台主要提供企業、回收業者、處理業者、稽核單位及其他依法得使用本平台之組織或個人使用。
              </p>
              <p className="mt-2">
                使用者應確認其具有合法權限使用本平台，並依相關法令及本條款使用本平台服務。
              </p>
              <p className="mt-2">
                本平台保留新增、修改、停止或終止部分功能之權利，惟不影響使用者依法享有之權益。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第二章 帳號註冊與使用</h2>

              <h3 className="mt-4 font-bold">第三條 帳號註冊</h3>
              <p className="mt-2">
                使用者申請本平台帳號時，應提供完整、真實且最新之資料。
              </p>
              <p className="mt-2">
                如提供之資料有錯誤、不實、冒用他人資料或有其他違法情形，本平台得拒絕提供服務、限制帳號權限或終止使用資格。
              </p>

              <h3 className="mt-4 font-bold">第四條 帳號管理</h3>
              <p className="mt-2">
                使用者應妥善保管帳號、密碼及其他登入資訊，不得提供、出租、轉讓或出借予第三人使用。
              </p>
              <p className="mt-2">
                因帳號管理不當所產生之一切法律責任及損害，應由帳號持有人自行負責。
              </p>
              <p className="mt-2">
                如發現帳號遭冒用、未經授權使用或有資訊安全疑慮，使用者應立即通知本平台，以利採取必要措施。
              </p>

              <h3 className="mt-4 font-bold">第五條 帳號停權或終止</h3>
              <p className="mt-2">
                如有下列情形之一，本平台得視情節限制、暫停或終止使用者帳號，且不因此負擔任何賠償責任：
              </p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>違反本條款或相關法令。</li>
                <li>提供不實資料或冒用他人身分。</li>
                <li>妨礙本平台正常運作或資訊安全。</li>
                <li>未經授權存取、修改或破壞平台資料。</li>
                <li>從事其他足以影響平台營運或第三人權益之行為。</li>
              </ol>
            </div>

            <div>
              <h2 className="text-xl font-bold">第三章 隱私權與個人資料保護</h2>

              <h3 className="mt-4 font-bold">第六條 個人資料蒐集</h3>
              <p className="mt-2">
                本平台依《中華民國個人資料保護法》及相關法令蒐集、處理及利用使用者個人資料。
              </p>
              <p className="mt-2">蒐集資料可能包括但不限於：</p>
              <ul className="ml-6 mt-2 list-disc">
                <li>姓名</li>
                <li>職稱</li>
                <li>公司名稱</li>
                <li>聯絡電話</li>
                <li>電子郵件</li>
                <li>登入紀錄</li>
                <li>系統操作紀錄（Log）</li>
                <li>其他提供平台服務所必要之資料。</li>
              </ul>

              <h3 className="mt-4 font-bold">第七條 蒐集目的</h3>
              <p className="mt-2">本平台蒐集使用者資料，主要作為下列用途：</p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>帳號建立與身分驗證。</li>
                <li>平台服務提供與維護。</li>
                <li>ESG 驗證及稽核管理。</li>
                <li>回收批次管理與版本追溯。</li>
                <li>AI 分析及服務優化。</li>
                <li>客戶服務及技術支援。</li>
                <li>系統安全管理與異常事件處理。</li>
                <li>法令要求之保存及配合政府機關依法調查。</li>
              </ol>

              <h3 className="mt-4 font-bold">第八條 資料利用</h3>
              <p className="mt-2">
                本平台僅於提供服務之必要範圍內處理使用者資料，不會任意出售、交換或提供予第三人。
              </p>
              <p className="mt-2">惟有下列情形之一者，不在此限：</p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>經使用者同意或授權。</li>
                <li>配合法令規定或司法、行政機關依法要求。</li>
                <li>維護公共利益或防止重大危害。</li>
                <li>為維護本平台或第三人合法權益所必要。</li>
              </ol>

              <h3 className="mt-4 font-bold">第九條 使用者權利</h3>
              <p className="mt-2">使用者得依法向本平台行使下列權利：</p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>查詢或請求閱覽個人資料。</li>
                <li>請求製給複製本。</li>
                <li>請求補充或更正資料。</li>
                <li>請求停止蒐集、處理或利用。</li>
                <li>請求刪除個人資料。</li>
              </ol>
              <p className="mt-2">
                惟涉及依法應保存之資料、版本驗證紀錄或其他依法不得刪除之資訊，本平台得依相關法令及本條款保留必要紀錄。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第四章 企業資料保護與保密義務</h2>

              <h3 className="mt-4 font-bold">第十條 企業資料保護</h3>
              <p className="mt-2">
                本平台瞭解使用者於平台上傳之回收紀錄、供應鏈資訊、ESG 資料、稽核文件及其他相關資訊，可能涉及企業營運資訊、營業秘密或其他依法應受保護之資料。
              </p>
              <p className="mt-2">
                本平台將採取合理且符合業界標準之資訊安全管理措施，以維護資料之機密性、完整性及可用性，並避免未經授權之存取、洩漏、竄改或毀損。
              </p>

              <h3 className="mt-4 font-bold">第十一條 資料使用範圍</h3>
              <p className="mt-2">
                使用者上傳至本平台之資料，其所有權及相關權利仍歸使用者或合法權利人所有。
              </p>
              <p className="mt-2">
                本平台僅於提供平台服務、資料驗證、版本管理、ESG 分析、AI 輔助分析、稽核管理及系統維運之必要範圍內，蒐集、處理及利用相關資料。
              </p>
              <p className="mt-2">
                除法令另有規定、司法或主管機關依法要求，或經使用者事前同意外，本平台不會將企業資料提供予第三人或作其他與平台服務無關之用途。
              </p>

              <h3 className="mt-4 font-bold">第十二條 AI 分析服務</h3>
              <p className="mt-2">
                本平台提供之 AI 分析、摘要、永續報告建議及相關智慧分析功能，係依據使用者提供之資料進行自動化分析。
              </p>
              <p className="mt-2">
                AI 產出內容僅供使用者參考，不構成法律、財務、會計、環境查證、投資或其他專業意見。
              </p>
              <p className="mt-2">
                使用者應自行判斷分析結果之適用性，並視需要委請相關專業人員進行確認。
              </p>
              <p className="mt-2">
                未經使用者授權，本平台不會將企業原始資料作為對外公開 AI 模型之訓練資料。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第五章 使用者責任</h2>

              <h3 className="mt-4 font-bold">第十三條 資料真實性</h3>
              <p className="mt-2">
                使用者應確保提供予本平台之資料為合法取得、真實、完整且最新之資訊。
              </p>
              <p className="mt-2">
                如因提供不實、錯誤或違法資料而致本平台、其他使用者或第三人受有損害，使用者應自行負擔相關法律責任。
              </p>

              <h3 className="mt-4 font-bold">第十四條 禁止事項</h3>
              <p className="mt-2">使用者不得利用本平台從事下列行為：</p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>提供虛偽、偽造或變造之資料。</li>
                <li>未經授權存取、修改、刪除或破壞平台資料。</li>
                <li>散布惡意程式、病毒或其他足以影響平台正常運作之程式。</li>
                <li>侵害他人智慧財產權、營業秘密、個人資料或其他合法權益。</li>
                <li>利用本平台從事違反法令、公序良俗或其他不法行為。</li>
                <li>其他經本平台認定足以影響平台安全、穩定或正常營運之行為。</li>
              </ol>
              <p className="mt-2">
                如使用者違反前項規定，本平台得限制、暫停或終止其帳號使用權限，並保留依法追究相關責任之權利。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第六章 版本追溯與資料管理</h2>

              <h3 className="mt-4 font-bold">第十五條 版本管理</h3>
              <p className="mt-2">
                為維護資料之完整性及可追溯性，本平台提供版本管理功能。
              </p>
              <p className="mt-2">
                使用者每次新增、修改或更新資料時，平台得保留必要之版本紀錄，以建立完整之歷史異動資訊，供後續查詢、稽核及驗證使用。
              </p>

              <h3 className="mt-4 font-bold">第十六條 資料完整性驗證</h3>
              <p className="mt-2">
                本平台採用追加式版本管理（Append-only Version Chain）及雜湊驗證（Hash Verification）機制，以維護版本紀錄之完整性及一致性。
              </p>
              <p className="mt-2">
                任何版本內容如遭未經授權之修改，其驗證結果可能發生變化，平台得據此提供資料完整性檢核及驗證結果。
              </p>

              <h3 className="mt-4 font-bold">第十七條 公開追溯服務</h3>
              <p className="mt-2">
                本平台得提供公開追溯頁面、QR Code 驗證或其他驗證機制，供經授權之使用者、合作單位或利害關係人查詢批次資料之版本資訊、驗證狀態及追溯紀錄。
              </p>
              <p className="mt-2">
                公開資訊之範圍，由資料提供者或本平台依服務設定決定，並以不涉及個人資料、企業營業秘密或其他依法不得公開之資訊為原則。
              </p>

              <h3 className="mt-4 font-bold">第十八條 版本紀錄保存</h3>
              <p className="mt-2">
                使用者得依法請求刪除其個人資料。
              </p>
              <p className="mt-2">
                惟基於系統維運、資料驗證、版本追溯、資訊安全及稽核需求，本平台得於不影響使用者依法享有之權利前提下，保留必要之版本紀錄、驗證資訊及相關系統紀錄。
              </p>
              <p className="mt-2">
                前項保存之資料不得作為識別個人身分之用途，並應符合相關法令規定。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第七章 智慧財產權</h2>

              <h3 className="mt-4 font-bold">第十九條 平台智慧財產權</h3>
              <p className="mt-2">
                本平台之網站內容、系統架構、介面設計、資料模型、程式碼、AI 分析模組、版本驗證機制、圖像、文字、商標、標誌及其他相關內容，其智慧財產權均屬本平台或合法權利人所有，除法律另有規定或經權利人書面同意外，任何人不得擅自重製、修改、散布、公開傳輸、反向工程或作其他侵害智慧財產權之行為。
              </p>

              <h3 className="mt-4 font-bold">第二十條 使用者資料權利</h3>
              <p className="mt-2">
                使用者上傳至本平台之資料，其所有權及相關智慧財產權仍歸使用者或合法權利人所有。
              </p>
              <p className="mt-2">
                使用者同意授權本平台於提供平台服務、系統維運、資料驗證、版本管理、ESG 分析、AI 輔助分析及稽核流程之必要範圍內，蒐集、處理、利用、儲存及傳輸相關資料。
              </p>
              <p className="mt-2">
                除依法令規定或經使用者同意外，本平台不會將使用者資料作其他與平台服務無關之用途。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第八章 免責聲明與責任限制</h2>

              <h3 className="mt-4 font-bold">第二十一條 服務可用性</h3>
              <p className="mt-2">
                本平台將盡合理努力維持服務之安全性、穩定性及可用性。
              </p>
              <p className="mt-2">
                惟因下列情形所造成之服務中斷、延遲、資料遺失或其他影響，本平台不負損害賠償責任：
              </p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>系統維護、更新或升級。</li>
                <li>網路通訊異常、停電或設備故障。</li>
                <li>天災、戰爭、疫情或其他不可抗力事件。</li>
                <li>第三方服務供應商之服務異常。</li>
                <li>其他非可歸責於本平台之事由。</li>
              </ol>

              <h3 className="mt-4 font-bold">第二十二條 AI 分析與資訊內容</h3>
              <p className="mt-2">
                本平台提供之 AI 分析、ESG 摘要、永續報告建議、驗證結果及其他資訊，係依據使用者提供之資料及系統分析結果產生。
              </p>
              <p className="mt-2">
                本平台不保證分析結果之完整性、即時性或完全符合使用者特定需求。
              </p>
              <p className="mt-2">
                使用者應依自身需求及相關法令，自行判斷分析結果之適用性，必要時應委請專業人員進一步確認。
              </p>

              <h3 className="mt-4 font-bold">第二十三條 責任限制</h3>
              <p className="mt-2">
                除法律另有強制規定外，如因可歸責於本平台之故意或重大過失致使用者受有損害，本平台將依法負擔相應之法律責任。
              </p>
              <p className="mt-2">
                如本平台未來提供付費服務，相關收費方式將另行公告。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第九章 研究與展示用途</h2>

              <h3 className="mt-4 font-bold">第二十四條 研究與展示用途</h3>
              <p className="mt-2">
                本平台目前屬研究開發及原型驗證階段，其功能、介面、分析模型及服務內容將持續更新及優化。
              </p>
              <p className="mt-2">
                平台所提供之 ESG 分析、AI 摘要、永續報告建議、版本驗證結果、公開追溯資訊及其他相關內容，主要作為研究開發、概念驗證、教學展示及決策參考之用途。
              </p>
              <p className="mt-2">
                除法律另有規定外，本平台產出內容不構成法律、會計、財務、環境查證、投資或其他專業意見。
              </p>
              <p className="mt-2">
                如使用者擬將相關資料作為政府申報、第三方查驗、法規遵循或重大商業決策依據，應另行委請具有相關資格之專業機構或人員進行確認。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">第十章 條款修訂與服務終止</h2>

              <h3 className="mt-4 font-bold">第二十五條 條款修訂</h3>
              <p className="mt-2">
                本平台得因法令變更、服務內容調整、系統更新或營運需求，隨時修訂本條款。
              </p>
              <p className="mt-2">
                修訂後之內容將公告於本平台網站或以適當方式通知使用者，自公告或通知之日起生效。
              </p>
              <p className="mt-2">
                使用者於修訂內容生效後繼續使用本平台服務者，視為已閱讀、瞭解並同意修訂後之條款內容。
              </p>

              <h3 className="mt-4 font-bold">第二十六條 服務終止</h3>
              <p className="mt-2">如有下列情形之一，本平台得全部或部分停止提供服務：</p>
              <ol className="ml-6 mt-2 list-decimal">
                <li>法令要求。</li>
                <li>主管機關命令。</li>
                <li>系統重大維護或安全事件。</li>
                <li>平台停止營運。</li>
                <li>其他經本平台認定有必要停止服務之情形。</li>
              </ol>
              <p className="mt-2">
                如因前項事由停止服務，本平台將於合理範圍內公告或通知使用者。
              </p>

              <h3 className="mt-4 font-bold">第二十七條 準據法與管轄法院</h3>
              <p className="mt-2">
                本條款之解釋、適用及因本條款所生之爭議，均依中華民國法律辦理。
              </p>
              <p className="mt-2">
                因本條款所生之任何爭議，雙方同意以臺灣臺南地方法院為第一審管轄法院。但法律另有強制規定者，從其規定。
              </p>
            </div>
          </section>
        </div>

        <div className="border-t p-8">
          <p className="mb-5 text-sm leading-6 text-gray-500">
            使用本平台前，請詳閱以上《服務條款暨隱私權政策》。勾選「我已閱讀、瞭解並同意」後，即表示您已閱讀、瞭解並同意遵守本條款之全部內容。
          </p>

          <label className="flex items-start gap-3 text-sm leading-6 text-gray-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 accent-black"
            />
            <span>
              我已閱讀、瞭解並同意《SustainAI 服務條款暨隱私權政策》之全部內容，並同意遵守本平台之相關規範。
            </span>
          </label>

          <button
            disabled={!checked}
            onClick={acceptTerms}
            className={`mt-6 w-full rounded-lg py-3 font-semibold transition ${
              checked
                ? "bg-black text-white hover:bg-gray-800"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
            }`}
          >
            同意並進入網站
          </button>
        </div>
      </div>
    </main>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={null}>
      <TermsContent />
    </Suspense>
  );
}