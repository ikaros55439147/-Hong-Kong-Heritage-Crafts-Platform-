import { Metadata } from 'next';
import PerformanceDashboard from '@/components/performance/PerformanceDashboard';

export const metadata: Metadata = {
  title: 'Performance Benchmarking - Admin Dashboard',
  description: 'Monitor and optimize system performance with comprehensive benchmarking tools',
};

export default function PerformancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PerformanceDashboard />
    </div>
  );
}