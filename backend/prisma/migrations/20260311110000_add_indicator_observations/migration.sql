CREATE TABLE "IndicatorObservation" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT,
    "source" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "district" TEXT,
    "region" TEXT,
    "periodLabel" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3),
    "numerator" DOUBLE PRECISION,
    "denominator" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicatorObservation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IndicatorObservation"
ADD CONSTRAINT "IndicatorObservation_importJobId_fkey"
FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "IndicatorObservation_indicator_periodDate_idx"
ON "IndicatorObservation"("indicator", "periodDate");

CREATE INDEX "IndicatorObservation_locationName_indicator_idx"
ON "IndicatorObservation"("locationName", "indicator");
