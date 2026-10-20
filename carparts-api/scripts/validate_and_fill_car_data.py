#!/usr/bin/env python3
"""
驗證並補全 Makes_20260827.csv 從第 4171 行開始的車型資料
檢查項目：(1)年份 (2)車型 Model (3)世代 (4)引擎
檢查是否有缺少年份的車型資料，如有缺少請填上
修改好的把時間改成修改的日期 (2026-08-28)
"""

import csv
import re
from datetime import datetime
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional
import sys

@dataclass
class CarRecord:
    """車型資料記錄"""
    line_num: int
    make: str
    year: str
    model: str
    generation: str
    engine: str
    displacement: str
    horsepower: str
    drive: str
    transmission: str
    doors_seats: str
    power_type: str
    cylinders: str
    compression_ratio: str
    bore: str
    stroke: str
    weight: str
    wheel: str
    front_tire: str
    front_suspension: str
    rear_tire: str
    rear_suspension: str
    intake: str
    torque: str
    dimensions: str
    raw_line: str = ""
    
    @property
    def key(self) -> tuple:
        """分組鍵：品牌 + 車型 + 世代"""
        return (self.make.strip(), self.model.strip(), self.generation.strip())
    
    @property
    def year_int(self) -> Optional[int]:
        try:
            return int(self.year.strip())
        except (ValueError, AttributeError):
            return None
    
    def is_placeholder(self) -> bool:
        """檢查是否為待確認/佔位資料"""
        placeholder_indicators = ['待確認', '-', 'na', 'NA', 'N/A', '?', '']
        for f in [self.engine, self.displacement, self.horsepower]:
            if f and f.strip() in placeholder_indicators:
                return True
        return False

def parse_csv_line(line: str, line_num: int) -> Optional[CarRecord]:
    """解析 CSV 行"""
    if not line.strip() or line.strip().startswith('//'):
        return None
    
    # 使用 csv 模組正確解析（處理逗號在欄位內的情況）
    try:
        reader = csv.reader([line])
        fields = next(reader)
    except Exception:
        # 退回簡單分割
        fields = line.split(',')
    
    # 確保有足夠欄位 (共 24 個欄位)
    while len(fields) < 24:
        fields.append('')
    
    return CarRecord(
        line_num=line_num,
        make=fields[0] if len(fields) > 0 else '',
        year=fields[1] if len(fields) > 1 else '',
        model=fields[2] if len(fields) > 2 else '',
        generation=fields[3] if len(fields) > 3 else '',
        engine=fields[4] if len(fields) > 4 else '',
        displacement=fields[5] if len(fields) > 5 else '',
        horsepower=fields[6] if len(fields) > 6 else '',
        drive=fields[7] if len(fields) > 7 else '',
        transmission=fields[8] if len(fields) > 8 else '',
        doors_seats=fields[9] if len(fields) > 9 else '',
        power_type=fields[10] if len(fields) > 10 else '',
        cylinders=fields[11] if len(fields) > 11 else '',
        compression_ratio=fields[12] if len(fields) > 12 else '',
        bore=fields[13] if len(fields) > 13 else '',
        stroke=fields[14] if len(fields) > 14 else '',
        weight=fields[15] if len(fields) > 15 else '',
        wheel=fields[16] if len(fields) > 16 else '',
        front_tire=fields[17] if len(fields) > 17 else '',
        front_suspension=fields[18] if len(fields) > 18 else '',
        rear_tire=fields[19] if len(fields) > 19 else '',
        rear_suspension=fields[20] if len(fields) > 20 else '',
        intake=fields[21] if len(fields) > 21 else '',
        torque=fields[22] if len(fields) > 22 else '',
        dimensions=fields[23] if len(fields) > 23 else '',
        raw_line=line
    )

def record_to_csv_row(record: CarRecord) -> list:
    """將記錄轉回 CSV 行"""
    return [
        record.make, record.year, record.model, record.generation,
        record.engine, record.displacement, record.horsepower,
        record.drive, record.transmission, record.doors_seats,
        record.power_type, record.cylinders, record.compression_ratio,
        record.bore, record.stroke, record.weight, record.wheel,
        record.front_tire, record.front_suspension, record.rear_tire,
        record.rear_suspension, record.intake, record.torque, record.dimensions
    ]

def load_data(filepath: str, start_line: int = 4171) -> list:
    """載入資料，從指定行開始"""
    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        for line_num, row in enumerate(reader, 1):
            if line_num < start_line:
                continue
            if not row or not any(field.strip() for field in row):
                continue
            if row[0].strip().startswith('//'):
                continue
            # 重組為原始行
            raw_line = ','.join(row)
            record = parse_csv_line(raw_line, line_num)
            if record and record.make:
                records.append(record)
    return records

def analyze_year_gaps(records: list) -> dict:
    """分析每個車型的年份缺口"""
    grouped = defaultdict(list)
    for r in records:
        if r.year_int is not None:
            grouped[r.key].append(r)
    
    gaps = {}
    for key, group in grouped.items():
        years = sorted([r.year_int for r in group if r.year_int])
        if not years:
            continue
        min_year, max_year = min(years), max(years)
        expected_years = set(range(min_year, max_year + 1))
        actual_years = set(years)
        missing = sorted(expected_years - actual_years)
        if missing:
            gaps[key] = {
                'records': group,
                'min_year': min_year,
                'max_year': max_year,
                'missing_years': missing,
                'sample_record': group[0]
            }
    return gaps

def validate_data(records: list) -> list:
    """驗證資料正確性"""
    issues = []
    for r in records:
        # 1. 年份格式檢查
        if r.year_int is None and r.year.strip():
            issues.append(f"行 {r.line_num}: 年份格式異常 '{r.year}'")
        
        # 2. 引擎代碼檢查
        if r.engine and r.engine.strip() in ['待確認', '-', '?', '']:
            issues.append(f"行 {r.line_num}: 引擎資料待確認 '{r.engine}'")
        
        # 3. 世代資料檢查
        if not r.generation or r.generation.strip() in ['待確認', '-', '?', '']:
            issues.append(f"行 {r.line_num}: 世代資料缺失或待確認")
        
        # 4. 馬力/排氣量合理性檢查
        if r.horsepower and r.displacement:
            try:
                hp = int(re.search(r'(\d+)', r.horsepower).group(1)) if re.search(r'(\d+)', r.horsepower) else 0
                disp = int(re.search(r'(\d+)', r.displacement).group(1)) if re.search(r'(\d+)', r.displacement) else 0
                if hp > 0 and disp > 0:
                    ratio = hp / disp * 1000
                    if ratio > 200:  # 比功率過高可能有誤
                        issues.append(f"行 {r.line_num}: 馬力/排氣量比異常 {hp}hp/{disp}cc")
            except Exception:
                pass
    return issues

def fill_missing_years(gaps: dict, all_records: list) -> list:
    """根據現有資料填補缺失年份"""
    new_records = []
    
    for key, info in gaps.items():
        make, model, generation = key
        sample = info['sample_record']
        missing_years = info['missing_years']
        
        # 找出最完整的參考記錄（非佔位資料）
        ref_records = [r for r in info['records'] if not r.is_placeholder()]
        if not ref_records:
            ref_records = info['records']
        
        # 使用最接近年份的記錄作為模板
        for missing_year in missing_years:
            # 找最接近的年份記錄
            closest = min(ref_records, key=lambda r: abs((r.year_int or 0) - missing_year))
            
            # 建立新記錄
            new_record = CarRecord(
                line_num=0,  # 稍後重新編號
                make=make,
                year=str(missing_year),
                model=model,
                generation=generation,
                engine=closest.engine,
                displacement=closest.displacement,
                horsepower=closest.horsepower,
                drive=closest.drive,
                transmission=closest.transmission,
                doors_seats=closest.doors_seats,
                power_type=closest.power_type,
                cylinders=closest.cylinders,
                compression_ratio=closest.compression_ratio,
                bore=closest.bore,
                stroke=closest.stroke,
                weight=closest.weight,
                wheel=closest.wheel,
                front_tire=closest.front_tire,
                front_suspension=closest.front_suspension,
                rear_tire=closest.rear_tire,
                rear_suspension=closest.rear_suspension,
                intake=closest.intake,
                torque=closest.torque,
                dimensions=closest.dimensions
            )
            new_records.append(new_record)
            print(f"  [補全] {make} {model} ({generation}) {missing_year}年 - 參考 {closest.year}年資料")
    
    return new_records

def main():
    input_file = r"C:\carparts\carparts-api\media\Data\Makes_20260827.csv"
    output_file = r"C:\carparts\carparts-api\media\Data\Makes_20260828.csv"
    start_line = 4171
    
    print(f"載入資料從第 {start_line} 行...")
    records = load_data(input_file, start_line)
    print(f"共載入 {len(records)} 筆資料")
    
    # 驗證資料
    print("\n=== 資料驗證 ===")
    issues = validate_data(records)
    if issues:
        print(f"發現 {len(issues)} 個問題（顯示前 50 個）:")
        for issue in issues[:50]:
            print(f"  {issue}")
    else:
        print("基本驗證通過")
    
    # 分析年份缺口
    print("\n=== 年份缺口分析 ===")
    gaps = analyze_year_gaps(records)
    print(f"發現 {len(gaps)} 個車型有年份缺口")
    
    for key, info in sorted(gaps.items(), key=lambda x: (x[0][0], x[0][1], x[0][2])):
        make, model, gen = key
        missing = info['missing_years']
        print(f"  {make} {model} ({gen}): {info['min_year']}-{info['max_year']} 缺少年份 {missing}")
    
    # 填補缺失年份
    print("\n=== 填補缺失年份 ===")
    new_records = fill_missing_years(gaps, records)
    print(f"新增 {len(new_records)} 筆記錄")
    
    # 合併並排序
    all_records = records + new_records
    all_records.sort(key=lambda r: (r.make, r.model, r.generation, r.year_int or 0))
    
    # 重新編號
    for i, r in enumerate(all_records):
        r.line_num = start_line + i
    
    # 讀取原始檔案的前 4170 行（含標題）
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    header_and_before = lines[:start_line - 1]  # 第 1-4170 行
    
    # 寫入新檔案
    print(f"\n寫入新檔案: {output_file}")
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        
        # 寫入標題與前 4170 行
        for line in header_and_before:
            if line.strip() and not line.strip().startswith('//'):
                try:
                    row = next(csv.reader([line]))
                    writer.writerow(row)
                except Exception:
                    f.write(line)
            else:
                f.write(line)
        
        # 寫入處理後的資料
        for r in all_records:
            writer.writerow(record_to_csv_row(r))
    
    # 更新檔案名稱中的日期（選擇性：也可以在檔案內加入修改日期註記）
    print(f"\n完成！輸出檔案: Makes_20260828.csv")
    print(f"原始筆數: {len(records)}")
    print(f"新增筆數: {len(new_records)}")
    print(f"總筆數: {len(all_records)}")
    
    # 產生報告
    report_file = r"C:\carparts\carparts-api\scripts\validation_report_20260828.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"車型資料驗證與補全報告\n")
        f.write(f"處理日期: 2026-08-28\n")
        f.write(f"來源檔案: Makes_20260827.csv\n")
        f.write(f"輸出檔案: Makes_20260828.csv\n")
        f.write(f"處理範圍: 第 {start_line} 行至結尾\n")
        f.write(f"原始筆數: {len(records)}\n")
        f.write(f"新增筆數: {len(new_records)}\n")
        f.write(f"總筆數: {len(all_records)}\n")
        f.write(f"發現問題: {len(issues)} 項\n")
        f.write(f"年份缺口車型: {len(gaps)} 個\n\n")
        
        if issues:
            f.write("=== 資料問題清單 ===\n")
            for issue in issues:
                f.write(f"{issue}\n")
        
        f.write("\n=== 年份缺口補全明細 ===\n")
        for key, info in sorted(gaps.items(), key=lambda x: (x[0][0], x[0][1], x[0][2])):
            make, model, gen = key
            missing = info['missing_years']
            f.write(f"{make} {model} ({gen}): {info['min_year']}-{info['max_year']} 缺少 {missing}\n")
    
    print(f"報告已儲存: {report_file}")

if __name__ == "__main__":
    main()