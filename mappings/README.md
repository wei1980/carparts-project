# 車大師廠牌與車型映射表說明

## 目錄結構
```
C:\carparts\mappings\
├── make_mapping.csv      # 廠牌名稱映射
├── model_mapping.csv     # 車型名稱映射
└── README.md             # 本說明檔
```

---

## 檔案說明

### 1. make_mapping.csv
**用途**：將零件 CSV 的廠牌名稱映射到車型庫的廠牌名稱

| 欄位 | 說明 |
|------|------|
| `parts_make` | 零件 CSV 中的廠牌名稱 (如 `Acura`) |
| `vehicle_make` | 車型庫中對應的廠牌名稱 (如 `Honda`) |
| `notes` | 備註說明映射關係 |

**使用方式**：
```python
import csv
make_map = {}
with open('make_mapping.csv', 'r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        make_map[row['parts_make']] = row['vehicle_make']

# 使用
vehicle_make = make_map.get(part_make, part_make)
```

---

### 2. model_mapping.csv
**用途**：將零件 CSV 的原始車型字串精確映射到車型庫的 Model + Generation

| 欄位 | 說明 |
|------|------|
| `parts_make` | 零件 CSV 廠牌 |
| `parts_model_raw` | 零件 CSV 原始車型字串 (如 `A3, (8L)`) |
| `vehicle_make` | 目標廠牌 |
| `vehicle_model` | 目標車型 (如 `A3`) |
| `vehicle_generation` | 目標世代 (如 `8L`) |
| `year_start` | 起始年份 |
| `year_end` | 結束年份 |
| `confidence` | 信心度 (high/medium/low) |

**使用方式**：
```python
import csv
model_map = {}
with open('model_mapping.csv', 'r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        key = (row['parts_make'], row['parts_model_raw'])
        model_map[key] = row

# 使用
key = (part.make, part.model_raw)
if key in model_map:
    mapping = model_map[key]
    vehicle_make = mapping['vehicle_make']
    vehicle_model = mapping['vehicle_model']
    vehicle_generation = mapping['vehicle_generation']
```

---

## 整合到匯入腳本

修改 `import_parts_vehicles.py` 中的 `find_matching_vehicles` 函數：

```python
def load_mappings():
    """載入映射表"""
    make_map = {}
    with open(r'C:\carparts\mappings\make_mapping.csv', 'r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            make_map[row['parts_make']] = row['vehicle_make']
    
    model_map = {}
    with open(r'C:\carparts\mappings\model_mapping.csv', 'r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            key = (row['parts_make'], row['parts_model_raw'])
            model_map[key] = row
    
    return make_map, model_map

# 在 find_matching_vehicles 開頭加入
def find_matching_vehicles(part: Part, vehicle_index: dict, make_map: dict, model_map: dict) -> list[VehicleVariant]:
    # 1. 廠牌映射
    mapped_make = make_map.get(part.make, part.make)
    part_make = mapped_make.lower()
    
    # 2. 精確車型映射
    key = (part.make, part.model_raw)
    if key in model_map:
        mapping = model_map[key]
        part_model = normalize_model_name(mapping['vehicle_model']).lower()
        part_gen = mapping['vehicle_generation'].lower()
        # 直接使用映射結果比對，跳過解析
        ...
```

---

## 擴充建議

| 優先級 | 廠牌 | 現狀 | 需補充 |
|--------|------|------|--------|
| 高 | Seat, Skoda, Fiat, Opel | 車型庫無資料 | 需補入 VW/Stellantis 旗下車型 |
| 高 | Renault, Peugeot, Citroen | 車型庫無資料 | 需補入 Renault/Stellantis 車型 |
| 高 | Toyota, Lexus, Honda, Acura | 車型庫無資料 | 需補入日系車型 |
| 高 | Hyundai, Kia, Genesis | 車型庫無資料 | 需補入韓系車型 |
| 高 | Volvo, Jaguar, Land Rover | 車型庫無資料 | 需補入 Geely/JLR 車型 |
| 中 | Cadillac, Chevrolet, Dodge | 對應 GM/Stellantis | 需補入美系車型 |
| 中 | Subaru, Suzuki, Mazda | 車型庫無資料 | 需補入車型 |
| 低 | 豪華跑車 (Ferrari, Lamborghini 等) | 極少數據 | 可標記不支援 |

---

## 維護指引

1. **新增映射**：直接編輯 CSV 檔案，保持 UTF-8 with BOM 編碼
2. **驗證映射**：執行匯入腳本時觀察 `confidence=low` 的匹配結果
3. **版本控制**：建議將 mappings 目錄納入 Git 版控
4. **定期同步**：車型庫更新後，需同步檢查 model_mapping.csv

---

*最後更新：2026-09-05*