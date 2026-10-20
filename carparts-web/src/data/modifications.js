// src/data/modifications.js
// 此為前端靜態資料，未來可改為後端 API 獲取
// key 對應資料庫 vehicleModifications.category / partType（舊 key 透過 ModificationEditor 的 KEY_ALIAS 自動轉換）
export const modificationCategories = [
  {
    name: '排氣系統',
    key: 'exhaust',
    parts: [
      {
        name: '當派 / 頭段',
        key: 'downpipe',
        brands: [
          { name: 'Akrapovic', models: ['Downpipe', 'Evolution'] },
          { name: 'Milltek', models: ['Sport', 'Race'] },
          { name: 'HJS', models: ['T304', '76mm'] },
        ],
      },
      {
        name: '中尾段排氣管',
        key: 'catback',
        brands: [
          { name: 'Akrapovic', models: ['Slip-On', 'Evolution'] },
          { name: 'Milltek', models: ['Sport', 'Race'] },
          { name: 'Remus', models: ['Sport', 'Sportback'] },
        ],
      },
      {
        name: '高流量觸媒',
        key: 'catalyst',
        brands: [
          { name: 'HJS', models: ['200 Cell', '300 Cell'] },
          { name: 'Milltek', models: ['High-Flow Cat'] },
          { name: 'Akrapovic', models: ['Catalyst'] },
        ],
      },
      {
        name: '電子閥門控制器',
        key: 'valve_controller',
        brands: [
          { name: 'Akrapovic', models: ['EVO Valve'] },
          { name: 'Armytrix', models: ['Valve Controller'] },
          { name: 'FLAG-R', models: ['Valve Max'] },
        ],
      },
      {
        name: '尾飾管',
        key: 'exhaust_tips',
        brands: [
          { name: 'Akrapovic', models: ['Carbon Tip'] },
          { name: 'Remus', models: ['Trapezoid'] },
          { name: 'Eisenmann', models: ['Sport Tip'] },
        ],
      },
    ],
  },
  {
    name: '進氣與動力系統',
    key: 'intake',
    parts: [
      {
        name: '進氣套件 / 集氣箱',
        key: 'intake_kit',
        brands: [
          { name: 'K&N', models: ['69-Series', '57-Series'] },
          { name: 'AFE', models: ['Momentum', 'Magnum'] },
          { name: 'Eventuri', models: ['Carbon Intake'] },
        ],
      },
      {
        name: '大容量中冷器',
        key: 'intercooler',
        brands: [
          { name: 'Forge', models: ['FMIC', 'Stealth'] },
          { name: 'Wagner', models: ['Race Intercooler'] },
          { name: 'Mishimoto', models: ['MM Intercooler'] },
        ],
      },
      {
        name: '強化進氣金屬管',
        key: 'charge_pipe',
        brands: [
          { name: 'Forge', models: ['Charge Pipe'] },
          { name: 'Wagner', models: ['Charge Pipe'] },
          { name: 'IE', models: ['Charge Pipe'] },
        ],
      },
      {
        name: '高流量原廠替換空濾',
        key: 'drop_in_filter',
        brands: [
          { name: 'K&N', models: ['Drop-In'] },
          { name: 'BMC', models: ['DIA'] },
          { name: 'Pipercross', models: ['Panel Filter'] },
        ],
      },
      {
        name: 'ECU 內寫電腦',
        key: 'ecu_tune',
        brands: [
          { name: 'DTA', models: ['S60', 'S80'] },
          { name: 'COBB', models: ['Accessport'] },
          { name: 'Unitronic', models: ['Stage 1', 'Stage 2'] },
        ],
      },
    ],
  },
  {
    name: '煞車系統',
    key: 'brake',
    parts: [
      {
        name: '多活塞卡鉗套組',
        key: 'caliper',
        brands: [
          { name: 'AP Racing', models: ['CP9660', 'CP9665', 'CP9449', 'CP9200'] },
          { name: 'Brembo', models: ['GT6', 'GT4', 'M4', 'Pista'] },
          { name: 'Alcon', models: ['CR6', 'CR4'] },
        ],
      },
      {
        name: '加大/浮動煞車碟盤',
        key: 'brake_disc',
        brands: [
          { name: 'DBA', models: ['T3 5000', 'T2'] },
          { name: 'AP Racing', models: ['380mm', '362mm'] },
          { name: 'Brembo', models: ['Gran Turismo'] },
        ],
      },
      {
        name: '競技/高摩擦係數來令片',
        key: 'brake_pads',
        brands: [
          { name: 'Ferodo', models: ['DS2500', 'DS3000', 'DS1.11'] },
          { name: 'Pagid', models: ['RSL29', 'RSL1'] },
          { name: 'Endless', models: ['MX72', 'CC-Rg'] },
        ],
      },
      {
        name: '金屬煞車油管',
        key: 'brake_lines',
        brands: [
          { name: 'Goodridge', models: ['G-Stop'] },
          { name: 'HEL', models: ['Performance'] },
          { name: 'DBC', models: ['Street'] },
        ],
      },
    ],
  },
  {
    name: '懸吊與底盤系統',
    key: 'suspension',
    parts: [
      {
        name: '高低軟硬可調絞牙避震器',
        key: 'coilovers',
        brands: [
          { name: 'Ohlins', models: ['DFV', 'TTX'] },
          { name: 'KW', models: ['V3', 'Clubsport'] },
          { name: 'Bilstein', models: ['B16', 'B14'] },
          { name: 'BC Racing', models: ['BR', 'ER'] },
        ],
      },
      {
        name: '降車身短彈簧',
        key: 'lowering_springs',
        brands: [
          { name: 'Eibach', models: ['Pro-Kit', 'Sportline'] },
          { name: 'H&R', models: ['Sport', 'Super Sport'] },
        ],
      },
      {
        name: '強化防傾桿',
        key: 'sway_bars',
        brands: [
          { name: 'H&R', models: ['Anti Roll Bar'] },
          { name: 'Whiteline', models: ['Sway Bar'] },
          { name: 'Eibach', models: ['Anti Roll Bar'] },
        ],
      },
      {
        name: '引擎室拉桿 / 底盤井字架',
        key: 'strut_bars',
        brands: [
          { name: 'Whiteline', models: ['Strut Bar'] },
          { name: 'Hardrace', models: ['Candy Bar'] },
          { name: 'Eibach', models: ['Strut Bar'] },
        ],
      },
    ],
  },
  {
    name: '輪框與胎圈系',
    key: 'wheels_tires',
    parts: [
      {
        name: '輕量化鍛造/鑄造輪框',
        key: 'wheels',
        brands: [
          { name: 'Rays', models: ['TE37', 'CE28', 'RE30'] },
          { name: 'BBS', models: ['LM', 'CH-R', 'RI-A'] },
          { name: 'Enkei', models: ['RPF1', 'NT03'] },
        ],
      },
      {
        name: '半熱熔/性能跑胎',
        key: 'tires',
        brands: [
          { name: 'Michelin', models: ['PS4S', 'Cup 2'] },
          { name: 'Continental', models: ['SportContact 7'] },
          { name: 'Toyo', models: ['R888R'] },
        ],
      },
      {
        name: '輪轂墊片 / 輪胎螺絲套件',
        key: 'spacers',
        brands: [
          { name: 'H&R', models: ['Wheel Spacer'] },
          { name: 'BONOSS', models: ['Forged Spacer'] },
          { name: 'Sparco', models: ['Spacer'] },
        ],
      },
    ],
  },
];
