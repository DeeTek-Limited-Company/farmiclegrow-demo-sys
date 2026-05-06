'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const cropTypes = [
  'Wheat',
  'Rice',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Soybean',
  'Chickpea',
  'Groundnut',
  'Barley',
  'Lentil',
];

const farmerFormSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters'),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  cropType: z.string().min(1, 'Please select a crop type'),
  farmSize: z.coerce
    .number()
    .positive('Farm size must be positive')
    .max(100, 'Farm size must be less than 100 hectares'),
  expectedYield: z.coerce
    .number()
    .positive('Expected yield must be positive')
    .max(1000, 'Expected yield must be realistic'),
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90, 'Invalid latitude'),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180, 'Invalid longitude'),
});

type FarmerFormValues = z.infer<typeof farmerFormSchema>;

export function FarmerRegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerFormSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '+91-',
      cropType: '',
      farmSize: 2,
      expectedYield: 5,
      latitude: 28.6139,
      longitude: 77.209,
    },
  });

  async function onSubmit(values: FarmerFormValues) {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('[v0] Form submitted:', values);

      form.reset();
      toast.success('Farmer registered successfully!', {
        description: `${values.fullName} has been added to the system.`,
      });
    } catch (error) {
      toast.error('Failed to register farmer', {
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold">Register New Farmer</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter farmer's full name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+91-XXXXXXXXXX"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Crop Type */}
            <FormField
              control={form.control}
              name="cropType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crop Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a crop" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cropTypes.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Farm Size */}
            <FormField
              control={form.control}
              name="farmSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Size (hectares)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 2.5"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Yield */}
            <FormField
              control={form.control}
              name="expectedYield"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Yield (tons)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 5.2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Farm Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latitude */}
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="e.g., 28.6139"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Default: Delhi location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Longitude */}
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="e.g., 77.209"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Default: Delhi location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Registering...
              </>
            ) : (
              'Register Farmer'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
