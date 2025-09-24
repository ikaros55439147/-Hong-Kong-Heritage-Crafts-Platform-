import { Metadata } from 'next';
import { SecurityAuditDashboard } from '@/components/security/SecurityAuditDashboard';

export const metadata: Metadata = {
  title: 'Security Audit - Admin Dashboard',
  description: 'Comprehensive security audit and compliance checking dashboard',
};

export default function SecurityAuditPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SecurityAuditDashboard />
    </div>
  );
}