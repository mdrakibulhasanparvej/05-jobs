-- DropIndex
DROP INDEX "academy"."batches_trade_id_batch_no_key";

-- DropIndex

-- DropIndex

-- DropIndex

-- DropIndex

-- DropIndex

-- AlterTable
ALTER TABLE "academy"."batches" DROP COLUMN "batch_no";

-- AlterTable
ALTER TABLE "academy"."students" DROP COLUMN "shift";

-- AlterTable
ALTER TABLE "academy"."trade_infos" DROP COLUMN "name_bn",
DROP COLUMN "name_en";
