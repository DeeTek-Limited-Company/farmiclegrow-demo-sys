import { describe, expect, it } from "vitest";

import { buildInternalTraceViewModel } from "@/lib/trace/internal-trace";

describe("internal trace mapper", () => {
  it("builds a full trust chain from cultivation through logistics", () => {
    const view = buildInternalTraceViewModel({
      batch: {
        batchId: "FG-2026-COWP-0001",
        crop: "Cowpea",
        quantity: 12.5,
        harvestDate: new Date("2026-05-20T00:00:00.000Z"),
        createdAt: new Date("2026-05-22T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        qrCode: "/org/afro-pulse/trace/FG-2026-COWP-0001",
        publicTraceVisibility: "PUBLIC",
        organization: { name: "Afro Pulse", slug: "afro-pulse" },
        farmer: {
          fullName: "Ama Mensah",
          cooperativeName: "North Farmers Union",
          certificationStatus: "Organic",
          qualityScore: 88,
          community: {
            name: "Tamale South",
            district: { name: "Tamale", region: { name: "Northern" } },
          },
          certifications: [{ id: "cert-1", name: "Global GAP" }],
        },
        productionRecord: {
          season: "2026 Major",
          cropVariety: "Songotra",
          farmingMethod: "Regenerative",
          status: "HARVESTED",
          plantingDate: new Date("2026-02-10T00:00:00.000Z"),
          actualHarvestDate: new Date("2026-05-20T00:00:00.000Z"),
          expectedYieldTon: 14,
          actualYieldTon: 12.5,
        },
        plantingActivities: [
          {
            id: "plant-1",
            plantingDate: new Date("2026-02-10T00:00:00.000Z"),
            seedSource: "Savanna Seeds",
            seedBatchNumber: "SEED-778",
            seedQuantityUsed: 18,
            spacingUsed: "40 x 20 cm",
            germinationRate: 94,
            fieldOfficerName: "Kojo",
          },
        ],
        fieldActivities: [
          {
            id: "field-1",
            activityType: "Weeding",
            activityDate: new Date("2026-03-04T00:00:00.000Z"),
            inputUsed: "Manual labor",
            quantityApplied: null,
            quantityUnit: null,
            performedBy: "Field Team A",
            supervisorVerified: true,
            notes: "First weeding round completed",
          },
        ],
        inputTraceabilities: [
          {
            id: "input-1",
            inputCategory: "Fertilizer",
            productName: "NPK 15-15-15",
            supplier: "Green Agro",
            batchNumber: "NPK-991",
            quantityUsed: 3,
            quantityUnit: "bags",
            applicationDate: new Date("2026-03-01T00:00:00.000Z"),
          },
        ],
        harvestRecords: [
          {
            id: "harvest-1",
            harvestDate: new Date("2026-05-20T00:00:00.000Z"),
            quantityHarvested: 12.5,
            initialQualityGrade: "A",
            supervisorApproved: true,
            supervisorName: "Abena",
            moistureReading: 11.2,
            qualityTests: [
              {
                id: "quality-1",
                dateTested: new Date("2026-05-21T00:00:00.000Z"),
                moisturePct: 11.2,
                foreignMatterPct: 0.7,
                brokenGrainPct: 0.4,
                aflatoxinTest: "PASS",
                passed: true,
              },
            ],
          },
        ],
        milestones: [
          {
            id: "mile-1",
            type: "PACKAGING",
            status: "COMPLETED",
            location: "Tamale Packhouse",
            timestamp: new Date("2026-05-23T00:00:00.000Z"),
            notes: "25kg sacks sealed",
          },
        ],
        warehouseEntries: [
          {
            id: "warehouse-1",
            warehouseName: "Tamale Hub",
            warehouseLocation: "Tamale",
            dateIn: new Date("2026-05-22T00:00:00.000Z"),
            dateOut: new Date("2026-05-26T00:00:00.000Z"),
            quantityStored: 12.5,
            stackNumber: "A-09",
            temperature: 23.4,
            humidity: 47.1,
          },
        ],
        movementLogs: [
          {
            id: "move-1",
            fromLocation: "Tamale Hub",
            toLocation: "Tema Port",
            dispatchDate: new Date("2026-05-27T00:00:00.000Z"),
            arrivalDate: new Date("2026-05-28T00:00:00.000Z"),
            quantitySent: 12.5,
            quantityReceived: 12.4,
            driverName: "Yaw",
            vehicleNumber: "GT-4421-26",
            conditionOnArrival: "Sealed and dry",
          },
        ],
        salesRecords: [
          {
            id: "sale-1",
            buyerName: "Acme Foods",
            quantitySold: 12.4,
            totalValue: 24000,
            destination: "Accra",
            paymentStatus: "PAID",
            dateSold: new Date("2026-05-29T00:00:00.000Z"),
          },
        ],
      },
    });

    expect(view.productionTrust.summary.season).toBe("2026 Major");
    expect(view.productionTrust.plantingActivities).toHaveLength(1);
    expect(view.productionTrust.fieldActivities[0].activityType).toBe("Weeding");
    expect(view.productionTrust.inputTraceabilities[0].supplier).toBe("Green Agro");
    expect(view.harvestTrust.harvestRecords[0].qualityTests).toHaveLength(1);
    expect(view.postHarvest.warehouseEntries[0].stackNumber).toBe("A-09");
    expect(view.postHarvest.movementLogs[0].vehicleNumber).toBe("GT-4421-26");
    expect(view.commercial.salesRecords[0].buyerName).toBe("Acme Foods");
    expect(view.timeline.map((item) => item.kind)).toEqual([
      "planting",
      "input",
      "field_activity",
      "harvest",
      "quality",
      "warehouse",
      "milestone",
      "movement",
      "sale",
    ]);
  });
});
