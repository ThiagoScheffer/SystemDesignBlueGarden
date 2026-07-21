import type { CapacityEstimate, CapacityWorksheet } from './types';

const finite = (value: number) => (Number.isFinite(value) ? value : 0);
const round = (value: number) => Math.round(value * 100) / 100;

export function validateWorksheet(worksheet: CapacityWorksheet): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(worksheet)) {
    if (!Number.isFinite(value) || value < 0)
      errors.push(`${key} must be nonnegative.`);
  }
  if (worksheet.readPercent > 100)
    errors.push('Read percentage must be between 0 and 100.');
  if (worksheet.peakMultiplier < 1)
    errors.push('Peak multiplier must be at least 1.');
  if (worksheet.replicationFactor < 1)
    errors.push('Replication factor must be at least 1.');
  return errors;
}

export function calculateCapacity(
  worksheet: CapacityWorksheet,
): CapacityEstimate {
  const actionsPerDay = finite(
    worksheet.activeUsers * worksheet.actionsPerUserPerDay,
  );
  const averageRps = actionsPerDay / 86_400;
  const peakRps = averageRps * worksheet.peakMultiplier;
  const readRatio = Math.min(100, worksheet.readPercent) / 100;
  const dailyStorageGB =
    (actionsPerDay * worksheet.averagePayloadKB) / 1_048_576;
  return {
    averageRps: round(averageRps),
    peakRps: round(peakRps),
    readRps: round(peakRps * readRatio),
    writeRps: round(peakRps * (1 - readRatio)),
    dailyStorageGB: round(dailyStorageGB),
    retainedStorageGB: round(
      dailyStorageGB * worksheet.retentionDays * worksheet.replicationFactor,
    ),
    monthlyTrafficGB: round(dailyStorageGB * 30),
  };
}
