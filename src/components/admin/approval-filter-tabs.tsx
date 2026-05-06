'use client';

import { FarmerStatus } from '@/lib/mock-data';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface ApprovalFilterTabsProps {
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  activeTab: string;
  onTabChange: (tab: FarmerStatus | 'all') => void;
}

export function ApprovalFilterTabs({
  counts,
  activeTab,
  onTabChange,
}: ApprovalFilterTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        onTabChange(
          value as FarmerStatus | 'all'
        )
      }
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger
          value="all"
          className="flex items-center gap-2"
        >
          All
          <Badge variant="secondary">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="pending"
          className="flex items-center gap-2"
        >
          Pending
          <Badge variant="secondary">
            {counts.pending}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="approved"
          className="flex items-center gap-2"
        >
          Approved
          <Badge variant="secondary">
            {counts.approved}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="rejected"
          className="flex items-center gap-2"
        >
          Rejected
          <Badge variant="secondary">
            {counts.rejected}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
