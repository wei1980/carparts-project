// prisma/seeds/seed_admin.js
// 建立預設管理員帳號
// 執行：node prisma/seeds/seed_admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始建立預設管理員帳號...\n');

  // 預設管理員資料
  const admins = [
    {
      phone: '0900000000',
      password: 'Admin@123456',
      company_name: '車大師系統管理員',
      contact_person: '系統管理員',
      address: '台北市信義區',
      line_id: '@cardmaster_admin',
      role: 'ADMIN',
      is_approved: true,
      is_active: true,
      is_garage: false,
      garage_name: '車大師總部',
    },
    {
      phone: '0911111111',
      password: 'Admin@123456',
      company_name: '車大師測試管理員',
      contact_person: '測試管理員',
      address: '新北市板橋區',
      line_id: '@cardmaster_test',
      role: 'ADMIN',
      is_approved: true,
      is_active: true,
      is_garage: false,
      garage_name: '測試環境',
    }
  ];

  for (const admin of admins) {
    try {
      // 檢查是否已存在
      const existing = await prisma.workshop.findFirst({
        where: { phone: admin.phone }
      });

      if (existing) {
        console.log(`⚠️ 管理員 ${admin.phone} 已存在，跳過建立`);
        continue;
      }

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(admin.password, salt);

      await prisma.workshop.create({
        data: {
          email: `admin_${admin.phone}@cardmaster.com`,
          password_hash,
          company_name: admin.company_name,
          contact_person: admin.contact_person,
          phone: admin.phone,
          address: admin.address,
          line_id: admin.line_id,
          role: admin.role,
          is_approved: admin.is_approved,
          is_active: admin.is_active,
          is_garage: admin.is_garage,
          garage_name: admin.garage_name,
        }
      });

      console.log(`✅ 管理員建立成功：${admin.phone} (${admin.company_name})`);
      console.log(`   密碼：${admin.password}`);
      console.log(`   角色：${admin.role}`);
      console.log('');

    } catch (error) {
      console.error(`❌ 建立管理員 ${admin.phone} 失敗：`, error.message);
    }
  }

  // 顯示所有管理員
  const allAdmins = await prisma.workshop.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      phone: true,
      company_name: true,
      role: true,
      is_approved: true,
      is_active: true,
      created_at: true
    }
  });

  console.log('\n📋 目前所有管理員：');
  console.table(allAdmins);

  console.log('\n✅ 管理員種子資料建立完成！');
}

main()
  .catch((e) => {
    console.error('💥 執行失敗：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });