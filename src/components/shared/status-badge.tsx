import { FarmerStatus } from '@/lib/mock-data';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: FarmerStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusStyles = (status: FarmerStatus) => {
    switch (status) {
      case 'pending':
        return {
          container: 'bg-[#FEF3C7] text-[#92400E]',
          icon: Clock,
        };
      case 'approved':
        return {
          container: 'bg-[#D1FAE5] text-[#065F46]',
          icon: CheckCircle,
        };
      case 'rejected':
        return {
          container: 'bg-[#FEE2E2] text-[#991B1B]',
          icon: XCircle,
        };
    }
  };

  const styles = getStatusStyles(status);
  const Icon = styles.icon;

  const statusText =
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${styles.container} ${className}`}
    >
      <Icon className="w-4 h-4" />
      {statusText}
    </div>
  );
}
