-- Existing installations were baselined before currentVehicleId existed.
-- Fresh baseline installations already contain this column and index.
-- Additive only: preserve existing users and vehicles; never reset/backfill selection.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "EndUser" ADD COLUMN IF NOT EXISTS "currentVehicleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "EndUser_currentVehicleId_key" ON "EndUser"("currentVehicleId");
COMMIT;
