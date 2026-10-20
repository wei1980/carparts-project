# 避震器共用車型模板使用指南

## 總覽
- 總模板數: 272
- 總平台數: 116
- 總 SKU: 2203
- 總車型關聯: 3802

## 如何為新避震器零件套用模板

### 步驟 1: 確定底盤平台
根據車型的 Generation (底盤代碼) 查詢 `platform_vehicle_master.csv` 確定 Platform
- 例: Generation=8V, 8P, 1K, 5F, 5E, 8J, 8X, 5P, 1T, 3C, 3T → Platform=VW_MQB 或 VW_PQ35
- 例: Generation=F20, F21, F22, F23, F30, F31, F32, F33, F36 → Platform=BMW_F20/F22/F30/F32
- 例: Generation=W204, W205, S204, S205, C204, C205 → Platform=MB_W204/W205
- 例: Generation=981, 982 → Platform=PORSCHE_981/982

### 步驟 2: 確定關鍵屬性
從車型配置確定:
- Electronic_Suspension: Standard / Electronic (DDC/Magnetic Ride/CDC) / Air Suspension
- Brake_Class: Standard / RS / S / AMG / M / Performance Brake
- Drive_Type: FWD/2WD / AWD/4WD / RWD
- Body_Type: Sedan / Wagon / Convertible / Coupe / Sportback/Hatchback / SUV

### 步驟 3: 查詢模板
在 `suspension_shared_templates.csv` 中篩選:
```python
template = df[
    (df['Platform'] == platform) &
    (df['Electronic_Suspension'] == elec) &
    (df['Brake_Class'] == brake) &
    (df['Drive_Type'] == drive) &
    (df['Body_Type'] == body)
]
```

### 步驟 4: 套用車型清單
模板的 `Model_Configs` 欄位包含所有適用車型配置，直接匯入 `part_vehicle_compatibility`

## 重要模板統計 (Top 20)


### TMPL_ALFA_932_Standard_AMG_FWD_2WD_Sedan
- 平台: ALFA_932
- 電子懸吊: Standard
- 煞車等級: AMG
- 驅動方式: FWD/2WD
- 車身形式: Sedan
- 適用車型數: 1
- 參考 SKU: 11515001
- 適用品牌: 
- 底盤代碼: 932

### TMPL_ALFA_937_Standard_AMG_FWD_2WD_Other
- 平台: ALFA_937
- 電子懸吊: Standard
- 煞車等級: AMG
- 驅動方式: FWD/2WD
- 車身形式: Other
- 適用車型數: 1
- 參考 SKU: 11515003
- 適用品牌: 
- 底盤代碼: 937

### TMPL_ALFA_937_Standard_Standard_FWD_2WD_Other
- 平台: ALFA_937
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Other
- 適用車型數: 1
- 參考 SKU: 11515003
- 適用品牌: 
- 底盤代碼: 937

### TMPL_ALFA_939_Standard_Standard_AWD_4WD_Sedan
- 平台: ALFA_939
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 3
- 參考 SKU: 11515015
- 適用品牌: 
- 底盤代碼: 939

### TMPL_ALFA_939_Standard_Standard_AWD_4WD_Wagon
- 平台: ALFA_939
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Wagon
- 適用車型數: 1
- 參考 SKU: 11515017
- 適用品牌: 
- 底盤代碼: 939

### TMPL_ALFA_940_Standard_Standard_FWD_2WD_Other
- 平台: ALFA_940
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Other
- 適用車型數: 1
- 參考 SKU: 11515024
- 適用品牌: 
- 底盤代碼: 940

### TMPL_ALFA_955_Standard_Standard_FWD_2WD_Other
- 平台: ALFA_955
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Other
- 適用車型數: 1
- 參考 SKU: 11540017
- 適用品牌: 
- 底盤代碼: 955

### TMPL_AUDI_B5_Standard_Standard_FWD_2WD_Sedan
- 平台: AUDI_B5
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Sedan
- 適用車型數: 2
- 參考 SKU: 11510007, 11510047
- 適用品牌: 
- 底盤代碼: B5

### TMPL_AUDI_B5_Standard_S_AWD_4WD_Sedan
- 平台: AUDI_B5
- 電子懸吊: Standard
- 煞車等級: S
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 1
- 參考 SKU: 11510012
- 適用品牌: 
- 底盤代碼: B5

### TMPL_AUDI_B8_Standard_Standard_AWD_4WD_Sedan
- 平台: AUDI_B8
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 2
- 參考 SKU: 115800AP, 115800AQ
- 適用品牌: 
- 底盤代碼: B8

### TMPL_AUDI_B8_Standard_Standard_FWD_2WD_Sedan
- 平台: AUDI_B8
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Sedan
- 適用車型數: 2
- 參考 SKU: 115800AE, 115800AF
- 適用品牌: 
- 底盤代碼: B8

### TMPL_AUDI_B8_Standard_Standard_FWD_2WD_Wagon
- 平台: AUDI_B8
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Wagon
- 適用車型數: 2
- 參考 SKU: 115800AP, 115800AQ
- 適用品牌: 
- 底盤代碼: B8

### TMPL_AUDI_B8_Standard_RS_AWD_4WD_Sportback/
- 平台: AUDI_B8
- 電子懸吊: Standard
- 煞車等級: RS
- 驅動方式: AWD/4WD
- 車身形式: Sportback/Hatchback
- 適用車型數: 1
- 參考 SKU: 11510075
- 適用品牌: 
- 底盤代碼: B8

### TMPL_AUDI_B9_Standard_Standard_AWD_4WD_Sedan
- 平台: AUDI_B9
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 2
- 參考 SKU: 115100BH, 115100BM
- 適用品牌: 
- 底盤代碼: B9

### TMPL_AUDI_B9_Standard_Standard_AWD_4WD_Wagon
- 平台: AUDI_B9
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Wagon
- 適用車型數: 2
- 參考 SKU: 115100AS, 115100BP
- 適用品牌: 
- 底盤代碼: B9

### TMPL_AUDI_B9_Standard_Standard_FWD_2WD_Sedan
- 平台: AUDI_B9
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Sedan
- 適用車型數: 2
- 參考 SKU: 115100AV, 115100BK
- 適用品牌: 
- 底盤代碼: B9

### TMPL_AUDI_C5_Standard_S_AWD_4WD_Sedan
- 平台: AUDI_C5
- 電子懸吊: Standard
- 煞車等級: S
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 1
- 參考 SKU: 11580017
- 適用品牌: 
- 底盤代碼: 4B

### TMPL_AUDI_C5_Standard_Standard_FWD_2WD_Sedan
- 平台: AUDI_C5
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: FWD/2WD
- 車身形式: Sedan
- 適用車型數: 1
- 參考 SKU: 11510009
- 適用品牌: 
- 底盤代碼: 4B

### TMPL_AUDI_C6_Standard_Standard_AWD_4WD_Sedan
- 平台: AUDI_C6
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Sedan
- 適用車型數: 1
- 參考 SKU: 11510059
- 適用品牌: 
- 底盤代碼: 4F

### TMPL_AUDI_C6_Standard_Standard_AWD_4WD_Wagon
- 平台: AUDI_C6
- 電子懸吊: Standard
- 煞車等級: Standard
- 驅動方式: AWD/4WD
- 車身形式: Wagon
- 適用車型數: 1
- 參考 SKU: 11510056
- 適用品牌: 
- 底盤代碼: 4F

## 平台總覽
- **UNKNOWN**: 3429 車型, 1996 SKU | 品牌: (1K, 1KP, 1KM), (Astra-F-Caravan), (F, F-CC, F-Cabrio), (F12, F13, F06), (F20, F21), (F22, F23), (F3
- **VW_PQ35**: 41 車型, 23 SKU | 品牌: *Audi A3 S3 8P,                        Golf 5, 6 GTI 台灣版:                      產品料號 35280020,       
- **VW_MQB**: 29 車型, 10 SKU | 品牌: 
- **MB_W204**: 27 車型, 18 SKU | 品牌: (W204, C204, S204), C-class (W204); 4WD, C-class (W204, C204, S204) 2WD, C-class C63 AMG;, 有電子懸吊, 無電
- **MB_W205**: 22 車型, 16 SKU | 品牌: (W205, C205, S205), C-class  (W205, C205, S205), C-class C63 AMG
- **BMW_F32**: 18 車型, 15 SKU | 品牌: 80, 90; (89), 80, 90; (89Q), Civic; (EM2,EP1,EP2,EP3,EP4,EU5,EU6,EU7,EU8,ES4,ES5,ES6,ES7,ES9,EV1), S
- **VW_PQ34**: 14 車型, 5 SKU | 品牌: 
- **BMW_F22**: 12 車型, 10 SKU | 品牌: 80, 90; (89), 80, 90; (89Q), Bravo; (198), S2; (89Q)
- **VW_PQ46**: 10 車型, 6 SKU | 品牌: 
- **AUDI_MLB_EVO**: 9 車型, 9 SKU | 品牌: 
- **VW_PQ26**: 9 車型, 5 SKU | 品牌: 
- **OTHER_A4**: 8 車型, 5 SKU | 品牌: 
- **AUDI_B8**: 7 車型, 5 SKU | 品牌: 
- **AUDI_B9**: 6 車型, 6 SKU | 品牌: 
- **BMW_E90**: 6 車型, 4 SKU | 品牌: 
- **OTHER_G60**: 5 車型, 5 SKU | 品牌: Golf II, Jetta II; (19E)
- **BMW_F30**: 4 車型, 4 SKU | 品牌: 
- **ALFA_939**: 4 車型, 2 SKU | 品牌: 
- **BMW_F20**: 3 車型, 3 SKU | 品牌: 
- **BMW_E70**: 3 車型, 3 SKU | 品牌: 後軸氣壓車款
- **OTHER_AA**: 3 車型, 1 SKU | 品牌: 
- **OTHER_A1**: 3 車型, 1 SKU | 品牌: 
- **OTHER_1M**: 3 車型, 3 SKU | 品牌: 
- **BMW_E71**: 3 車型, 3 SKU | 品牌: 後軸氣壓車款
- **AUDI_B5**: 3 車型, 3 SKU | 品牌: 
- **OTHER_E39**: 3 車型, 3 SKU | 品牌: 
- **OTHER_DYB**: 3 車型, 3 SKU | 品牌: 
- **AUDI_C5**: 2 車型, 2 SKU | 品牌: 
- **OTHER_9N**: 2 車型, 2 SKU | 品牌: 
- **OTHER_A6**: 2 車型, 2 SKU | 品牌: 
- **OTHER_6K**: 2 車型, 2 SKU | 品牌: 
- **OTHER_6L**: 2 車型, 1 SKU | 品牌: 
- **AUDI_C6**: 2 車型, 2 SKU | 品牌: 
- **OTHER_Z06**: 2 車型, 2 SKU | 品牌: Corvette C5
- **OTHER_R56**: 2 車型, 1 SKU | 品牌: 
- **OTHER_M3**: 2 車型, 2 SKU | 品牌: 
- **OTHER_BK**: 2 車型, 2 SKU | 品牌: 
- **OTHER_BL**: 2 車型, 2 SKU | 品牌: 
- **OTHER_E38**: 2 車型, 2 SKU | 品牌: 
- **OTHER_CD**: 2 車型, 1 SKU | 品牌: 
- **OTHER_M16**: 2 車型, 2 SKU | 品牌: Civic; (EM2,EP1,EP2,EP3,EP4,EU5,EU6,EU7,EU8,ES4,ES5,ES6,ES7,ES9,EV1)
- **OTHER_ETC**: 2 車型, 2 SKU | 品牌: 
- **BMW_E82**: 2 車型, 2 SKU | 品牌: 
- **OTHER_13**: 2 車型, 1 SKU | 品牌: 
- **OTHER_5L**: 2 車型, 2 SKU | 品牌: 
- **OTHER_3U**: 2 車型, 2 SKU | 品牌: 
- **OTHER_192**: 2 車型, 2 SKU | 品牌: 
- **OTHER_198**: 2 車型, 2 SKU | 品牌: 
- **OTHER_S93**: 2 車型, 2 SKU | 品牌: 
- **BMW_E36**: 2 車型, 2 SKU | 品牌: 
- **ALFA_937**: 2 車型, 1 SKU | 品牌: 
- **BMW_E46**: 2 車型, 2 SKU | 品牌: 
- **OTHER_R55**: 2 車型, 1 SKU | 品牌: 
- **OTHER_8U**: 1 車型, 1 SKU | 品牌: 
- **OTHER_312**: 1 車型, 1 SKU | 品牌: 
- **OTHER_207**: 1 車型, 1 SKU | 品牌: 
- **OTHER_6Y**: 1 車型, 1 SKU | 品牌: 
- **OTHER_5N**: 1 車型, 1 SKU | 品牌: 
- **OTHER_5Z**: 1 車型, 1 SKU | 品牌: 
- **OTHER_6ES**: 1 車型, 1 SKU | 品牌: 
- **OTHER_182**: 1 車型, 1 SKU | 品牌: 
- **OTHER_176**: 1 車型, 1 SKU | 品牌: 
- **MB_W203**: 1 車型, 1 SKU | 品牌: 
- **OTHER_188**: 1 車型, 1 SKU | 品牌: 
- **OTHER_199**: 1 車型, 1 SKU | 品牌: 
- **OTHER_19E**: 1 車型, 1 SKU | 品牌: 
- **OTHER_1F**: 1 車型, 1 SKU | 品牌: 
- **OTHER_1L**: 1 車型, 1 SKU | 品牌: 
- **ALFA_940**: 1 車型, 1 SKU | 品牌: 
- **ALFA_932**: 1 車型, 1 SKU | 品牌: 
- **AUDI_D2**: 1 車型, 1 SKU | 品牌: 
- **ALFA_955**: 1 車型, 1 SKU | 品牌: 
- **OTHER_3R**: 1 車型, 1 SKU | 品牌: 
- **OTHER_DY**: 1 車型, 1 SKU | 品牌: 
- **OTHER_DBY**: 1 車型, 1 SKU | 品牌: 
- **OTHER_E61**: 1 車型, 1 SKU | 品牌: 
- **OTHER_DNW**: 1 車型, 1 SKU | 品牌: 
- **OTHER_C1**: 1 車型, 1 SKU | 品牌: 
- **OTHER_BWY**: 1 車型, 1 SKU | 品牌: 
- **OTHER_C43**: 1 車型, 1 SKU | 品牌: C-class (W202); (H0, 202)
- **OTHER_DC2**: 1 車型, 1 SKU | 品牌: 
- **OTHER_C06**: 1 車型, 1 SKU | 品牌: 
- **OTHER_AB1**: 1 車型, 1 SKU | 品牌: 
- **OTHER_A7**: 1 車型, 1 SKU | 品牌: 
- **OTHER_KL1J**: 1 車型, 1 SKU | 品牌: 
- **OTHER_JD**: 1 車型, 1 SKU | 品牌: 
- **OTHER_JA8**: 1 車型, 1 SKU | 品牌: 
- **OTHER_J96**: 1 車型, 1 SKU | 品牌: 
- **OTHER_GDH**: 1 車型, 1 SKU | 品牌: 
- **OTHER_FN2**: 1 車型, 1 SKU | 品牌: 
- **OTHER_F34**: 1 車型, 1 SKU | 品牌: 
- **OTHER_F10**: 1 車型, 1 SKU | 品牌: 
- **OTHER_E60**: 1 車型, 1 SKU | 品牌: 
- **OTHER_F06**: 1 車型, 1 SKU | 品牌: 
- **OTHER_F01**: 1 車型, 1 SKU | 品牌: 
- **OTHER_E81**: 1 車型, 1 SKU | 品牌: 
- **OTHER_R50**: 1 車型, 1 SKU | 品牌: 
- **OTHER_M539**: 1 車型, 1 SKU | 品牌: 
- **OTHER_M10**: 1 車型, 1 SKU | 品牌: Bravo; (198)
- **OTHER_M346**: 1 車型, 1 SKU | 品牌: 
- **OTHER_T5**: 1 車型, 1 SKU | 品牌: 
- **OTHER_S4**: 1 車型, 1 SKU | 品牌: 
- **OTHER_RU8**: 1 車型, 1 SKU | 品牌: 
- **OTHER_R59**: 1 車型, 1 SKU | 品牌: 
- **OTHER_R58**: 1 車型, 1 SKU | 品牌: 
- **OTHER_NZ**: 1 車型, 1 SKU | 品牌: 
- **OTHER_PDE**: 1 車型, 1 SKU | 品牌: 
- **OTHER_T98**: 1 車型, 1 SKU | 品牌: 
- **OTHER_Z34**: 1 車型, 1 SKU | 品牌: 
- **OTHER_Z33**: 1 車型, 1 SKU | 品牌: 
- **OTHER_Z3**: 1 車型, 1 SKU | 品牌: 
- **OTHER_W12**: 1 車型, 1 SKU | 品牌: A8; (D2)
- **OTHER_T98C**: 1 車型, 1 SKU | 品牌: 
- **OTHER_V6**: 1 車型, 1 SKU | 品牌: Clio 2; (6)
- **OTHER_Z85**: 1 車型, 1 SKU | 品牌: 
- **OTHER_Z89**: 1 車型, 1 SKU | 品牌: 

## 注意事項
1. **電子懸吊 (DDC/PASM/Magnetic Ride) 必須區分** - 有/無電子懸吊通常不同 SKU
2. **高性能煞車 (RS/S/AMG/M) 必須區分** - 卡鉗間隙、安裝耳不同
3. **前軸重/剎車盤尺寸** - 同平台不同引擎可能前軸重不同，需確認 Max_Weight 範圍
4. **底盤號斷點** - 同年份可能有 Facelift 前後規格差異
5. **市場差異** - 歐規/美規/亞規可能規格不同

## 模板維護
- 新增車型時：更新 `platform_vehicle_master.csv` 並重新生成模板
- 新增 SKU 時：更新 `sku_template_mapping.csv`
- 發現衝突時：標記模板需人工審核
