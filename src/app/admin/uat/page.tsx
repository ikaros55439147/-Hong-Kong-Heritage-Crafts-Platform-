import { Metadata } from 'next'
import UATDashboard from '@/components/uat/UATDashboard'

export const metadata: Metadata = {
  title: '用戶驗收測試 - 管理後台',
  description: '用戶驗收測試執行和反饋管理儀表板'
}

export default function UATPage() {
  return <UATDashboard />
}