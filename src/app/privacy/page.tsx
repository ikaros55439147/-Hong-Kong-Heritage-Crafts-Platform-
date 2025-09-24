'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              香港弱勢行業傳承平台
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                返回首頁
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">私隱政策</h1>
          <p className="text-sm text-gray-600 mb-8">最後更新：2024年12月22日</p>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. 資料收集</h2>
              <p className="text-gray-700 mb-4">
                我們收集以下類型的個人資料：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>註冊資料：姓名、電子郵件地址、電話號碼</li>
                <li>個人檔案資料：技能、經驗、作品集</li>
                <li>交易資料：付款資訊、訂單記錄</li>
                <li>使用資料：瀏覽記錄、搜索歷史</li>
                <li>技術資料：IP地址、瀏覽器類型、設備資訊</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. 資料使用</h2>
              <p className="text-gray-700 mb-4">
                我們使用您的個人資料用於：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>提供和改善我們的服務</li>
                <li>處理您的註冊和交易</li>
                <li>與您溝通服務相關事宜</li>
                <li>個性化您的使用體驗</li>
                <li>防止欺詐和確保安全</li>
                <li>遵守法律義務</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. 資料分享</h2>
              <p className="text-gray-700 mb-4">
                我們不會出售您的個人資料。我們可能在以下情況下分享您的資料：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>獲得您的明確同意</li>
                <li>與服務提供商分享以提供服務</li>
                <li>遵守法律要求或法院命令</li>
                <li>保護我們的權利和安全</li>
                <li>業務轉讓或合併</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. 資料安全</h2>
              <p className="text-gray-700 mb-4">
                我們採取適當的技術和組織措施保護您的個人資料：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>使用SSL加密傳輸敏感資料</li>
                <li>定期更新安全系統和軟件</li>
                <li>限制員工訪問個人資料</li>
                <li>定期進行安全審核</li>
                <li>建立資料洩露應對程序</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. 您的權利</h2>
              <p className="text-gray-700 mb-4">
                根據適用的私隱法律，您有以下權利：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>查閱您的個人資料</li>
                <li>更正不準確的資料</li>
                <li>刪除您的個人資料</li>
                <li>限制資料處理</li>
                <li>資料可攜性</li>
                <li>反對資料處理</li>
                <li>撤回同意</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookie政策</h2>
              <p className="text-gray-700 mb-4">
                我們使用Cookie和類似技術來：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>記住您的偏好設置</li>
                <li>分析網站使用情況</li>
                <li>提供個性化內容</li>
                <li>改善網站性能</li>
              </ul>
              <p className="text-gray-700 mt-4">
                您可以通過瀏覽器設置管理Cookie偏好。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. 資料保留</h2>
              <p className="text-gray-700">
                我們只會在必要期間保留您的個人資料。具體保留期間取決於資料類型和使用目的。
                當資料不再需要時，我們會安全地刪除或匿名化處理。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. 兒童私隱</h2>
              <p className="text-gray-700">
                我們的服務不針對13歲以下兒童。如果我們發現收集了兒童的個人資料，
                我們會立即刪除相關資料。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. 政策更新</h2>
              <p className="text-gray-700">
                我們可能會不時更新此私隱政策。重大變更會通過電子郵件或網站通知您。
                請定期查看此頁面以了解最新政策。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. 聯絡我們</h2>
              <p className="text-gray-700 mb-4">
                如果您對此私隱政策有任何問題或疑慮，請聯絡我們：
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>電子郵件：</strong> privacy@hk-heritage-crafts.com<br />
                  <strong>電話：</strong> +852 1234 5678<br />
                  <strong>地址：</strong> 香港中環皇后大道中1號傳承大廈10樓
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              此私隱政策符合香港《個人資料（私隱）條例》及其他適用法律的要求。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}