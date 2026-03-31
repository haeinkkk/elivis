-- Drop non-unique index on name (replaced by unique constraint)
DROP INDEX IF EXISTS "Team_name_idx";

-- Create unique constraint on team display name
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
