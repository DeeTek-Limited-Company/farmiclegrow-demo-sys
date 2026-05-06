import { Farmer } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface ProfileCardProps {
  farmer: Farmer;
  onEdit?: () => void;
}

export function ProfileCard({ farmer, onEdit }: ProfileCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Your Profile</CardTitle>
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Full Name</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.fullName}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Phone Number</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.phoneNumber}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Crop Type</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.cropType}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Farm Size</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.farmSize} hectares
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Expected Yield</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.expectedYield} tons
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Location</p>
          <p className="text-lg font-semibold mt-1">
            {farmer.location.latitude.toFixed(2)}, {farmer.location.longitude.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
