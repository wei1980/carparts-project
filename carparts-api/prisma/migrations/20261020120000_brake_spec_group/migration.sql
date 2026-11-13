-- 新增煞車件共用規格群組（跨廠牌對應的共同鍵）
--
-- 背景：brake_parts / brake_part_fitment / brake_part_spec 等 5 張表已存在並已回填
-- EBC 資料（2,467 零件 / 56,394 筆適用關係 / 11,904 筆規格），但缺少「共用規格群組」
-- 這個概念 —— 不同廠牌的零件無法因為規格相同而連結。
--
-- brake_spec：同一組物理規格（位置+碟徑+碟厚+碟型+卡鉗）只會有一筆，
--             各廠牌零件只要規格相同就連到同一筆 → 可互查對應零件。
-- brake_part_spec_group：零件 ↔ 共用規格群組（多對多，一顆來令片可對應多組碟規格）。
--
-- 本 migration 僅新增這 2 張表，不修改既有的 5 張煞車表。

CREATE TABLE "brake_spec" (
    "id" SERIAL NOT NULL,
    "spec_key" TEXT NOT NULL,
    "position" TEXT,
    "disc_diameter_mm" INTEGER,
    "disc_thickness_mm" INTEGER,
    "disc_style" TEXT,
    "caliper_make" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brake_spec_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brake_part_spec_group" (
    "id" SERIAL NOT NULL,
    "brake_part_id" INTEGER NOT NULL,
    "brake_spec_id" INTEGER NOT NULL,

    CONSTRAINT "brake_part_spec_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brake_spec_spec_key_key" ON "brake_spec"("spec_key");
CREATE INDEX "brake_spec_position_disc_diameter_mm_idx" ON "brake_spec"("position", "disc_diameter_mm");
CREATE INDEX "brake_spec_disc_diameter_mm_disc_thickness_mm_idx" ON "brake_spec"("disc_diameter_mm", "disc_thickness_mm");
CREATE INDEX "brake_spec_caliper_make_idx" ON "brake_spec"("caliper_make");

CREATE UNIQUE INDEX "brake_part_spec_group_brake_part_id_brake_spec_id_key" ON "brake_part_spec_group"("brake_part_id", "brake_spec_id");
CREATE INDEX "brake_part_spec_group_brake_spec_id_idx" ON "brake_part_spec_group"("brake_spec_id");

ALTER TABLE "brake_part_spec_group" ADD CONSTRAINT "brake_part_spec_group_brake_part_id_fkey"
    FOREIGN KEY ("brake_part_id") REFERENCES "brake_parts"(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brake_part_spec_group" ADD CONSTRAINT "brake_part_spec_group_brake_spec_id_fkey"
    FOREIGN KEY ("brake_spec_id") REFERENCES "brake_spec"(id) ON DELETE CASCADE ON UPDATE CASCADE;
