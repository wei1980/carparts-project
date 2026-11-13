// prisma/seeds/create_admin.js
// 建立預設管理員帳號
// 執行：node prisma/seeds/create_admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 建立預設管理員帳號...\n');

  // 預設管理員資料（可透過環境變數覆蓋）
  const adminData = {
    email: process.env.ADMIN_EMAIL || 'admin@carparts.example.com',
    phone: process.env.ADMIN_PHONE || '0900000000',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    company_name: process.env.ADMIN_COMPANY || '車大師系統管理',
    contact_person: '系統管理員',
    role: 'ADMIN',
    is_approved: true,
    is_active: true,
    is_garage: false,
  };

  try {
    // 檢查是否已存在 (使用 findFirst，因為 phone 不是 unique 欄位)
    const existing = await prisma.workshop.findFirst({
      where: { phone: adminData.phone }
    });

    if (existing) {
      if (existing.role === 'ADMIN') {
        console.log('✅ 管理員帳號已存在，跳過建立');
        console.log(`   Email: ${existing.email}`);
        console.log(`   Phone: ${existing.phone}`);
        return;
      } else {
        console.log('⚠️ 該手機號碼已被註冊但非管理員角色，更新角色...');
        await prisma.workshop.update({
          where: { phone: adminData.phone },
          data: { role: 'ADMIN', is_approved: true, is_active: true }
        });
        console.log('✅ 已更新為管理員角色');
        return;
      }
    }

    // 雜湊密碼
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminData.password, salt);

    // 建立管理員
    const admin = await prisma.workshop.create({
      data: {
        email: adminData.email,
        password_hash: passwordHash,
        company_name: adminData.company_name,
        contact_person: adminData.contact_person,
        phone: adminData.phone,
        address: '系統預設地址',
        line_id: '@carparts_admin',
        role: adminData.role,
        is_approved: adminData.is_approved,
        is_active: adminData.is_active,
        is_garage: adminData.is_garage,
        garage_name: '車大師管理後台',
        garage_phone: adminData.phone,
      }
    });

    console.log('✅ 管理員帳號建立成功！');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Phone: ${admin.phone}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`\n🔐 預設密碼: ${adminData.password}`);
    console.log('⚠️ 請立即登入後修改密碼！');

  } catch (error) {
    console.error('❌ 建立失敗:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('💥 腳本執行失敗:', e);
    process.exit(1);
  });