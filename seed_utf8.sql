INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '1 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='1 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E87', 2004, 2011
    FROM models WHERE name='1 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='1 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E87' AND year_from=2004 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='1 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E87' AND model_id=(SELECT id FROM models WHERE name='1 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '130i',
        2004,
        2011,
        'N52',
        2996,
        265,
        '自然進氣',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E90', 2005, 2012
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E90' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E90' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '320i',
        2005,
        2012,
        'N46',
        1995,
        150,
        '自然進氣',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E90', 2007, 2010
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E90' AND year_from=2007 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E90' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '335i',
        2007,
        2010,
        'N54',
        2979,
        306,
        '雙渦輪增壓',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F30', 2012, 2018
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F30' AND year_from=2012 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F30' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '320i',
        2012,
        2018,
        'B48',
        1998,
        184,
        '渦輪增壓',
        'RWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F30', 2015, 2019
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F30' AND year_from=2015 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F30' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '340i',
        2015,
        2019,
        'B58',
        2998,
        326,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G20', 2019, 2023
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G20' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G20' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '330i',
        2019,
        2023,
        'B48B20',
        1998,
        258,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G20', 2019, 2023
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G20' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G20' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M340i',
        2019,
        2023,
        'B58B30',
        2998,
        387,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '5 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='5 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E60', 2003, 2010
    FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E60' AND year_from=2003 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E60' AND model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '530i',
        2003,
        2010,
        'N52',
        2996,
        258,
        '自然進氣',
        'RWD',
        '雙A臂',
        '整體式多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '5 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='5 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F10', 2010, 2016
    FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F10' AND year_from=2010 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F10' AND model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '535i',
        2010,
        2016,
        'N55',
        2979,
        306,
        '渦輪增壓',
        'RWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '5 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='5 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G30', 2017, 2023
    FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G30' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G30' AND model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '540i',
        2017,
        2023,
        'B58',
        2998,
        340,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '5 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='5 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G30', 2017, 2023
    FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G30' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G30' AND model_id=(SELECT id FROM models WHERE name='5 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M550i',
        2017,
        2023,
        'N63',
        4395,
        530,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '7 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='7 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F01', 2008, 2015
    FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F01' AND year_from=2008 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F01' AND model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '750i',
        2008,
        2015,
        'N63',
        4395,
        450,
        '雙渦輪增壓',
        'RWD',
        '雙接頭彈簧柱',
        '整體式多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '7 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='7 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G11', 2015, 2022
    FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G11' AND year_from=2015 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G11' AND model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '740i',
        2015,
        2022,
        'B58',
        2998,
        326,
        '渦輪增壓',
        'RWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '7 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='7 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G11', 2016, 2022
    FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G11' AND year_from=2016 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G11' AND model_id=(SELECT id FROM models WHERE name='7 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M760i',
        2016,
        2022,
        'N74',
        6592,
        610,
        '雙渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F25', 2010, 2017
    FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F25' AND year_from=2010 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F25' AND model_id=(SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'xDrive35i',
        2010,
        2017,
        'N55',
        2979,
        306,
        '渦輪增壓',
        'AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G01', 2017, 2023
    FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G01' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G01' AND model_id=(SELECT id FROM models WHERE name='X3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X3 M40i',
        2017,
        2023,
        'B58',
        2998,
        360,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E70', 2006, 2013
    FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E70' AND year_from=2006 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E70' AND model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'xDrive50i',
        2006,
        2013,
        'N63',
        4395,
        408,
        '雙渦輪增壓',
        'AWD',
        '雙A臂',
        '整體式多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F15', 2013, 2018
    FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F15' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F15' AND model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X5 M',
        2013,
        2018,
        'S63',
        4395,
        575,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G05', 2018, 2023
    FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G05' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G05' AND model_id=(SELECT id FROM models WHERE name='X5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X5 M50i',
        2018,
        2023,
        'N63',
        4395,
        530,
        '雙渦輪增壓',
        'AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Z4' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='Z4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E89', 2009, 2016
    FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E89' AND year_from=2009 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E89' AND model_id=(SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'Z4 sDrive35i',
        2009,
        2016,
        'N54',
        2979,
        306,
        '雙渦輪增壓',
        'RWD',
        '麥花臣',
        '中央控制臂',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Z4' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='Z4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G29', 2018, 2023
    FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G29' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G29' AND model_id=(SELECT id FROM models WHERE name='Z4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'Z4 M40i',
        2018,
        2023,
        'B58',
        2998,
        340,
        '渦輪增壓',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'i3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='i3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'I01', 2013, 2022
    FROM models WHERE name='i3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='i3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='I01' AND year_from=2013 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='i3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='I01' AND model_id=(SELECT id FROM models WHERE name='i3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'i3',
        2013,
        2022,
        '電動',
        NULL,
        170,
        '電動',
        'RWD',
        '麥花臣',
        '拖曳臂',
        '純電',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'i8' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='i8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'I12', 2014, 2020
    FROM models WHERE name='i8' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='i8' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='I12' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='i8' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='I12' AND model_id=(SELECT id FROM models WHERE name='i8' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'i8',
        2014,
        2020,
        'B38',
        1499,
        362,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'iX' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='iX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'I20', 2021, 2023
    FROM models WHERE name='iX' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='iX' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='I20' AND year_from=2021 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='iX' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='I20' AND model_id=(SELECT id FROM models WHERE name='iX' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'iX xDrive50',
        2021,
        2023,
        '電動',
        NULL,
        523,
        '電動',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '純電',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E90', 2007, 2013
    FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E90' AND year_from=2007 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E90' AND model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M3',
        2007,
        2013,
        'S65',
        3999,
        420,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F80', 2014, 2018
    FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F80' AND year_from=2014 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F80' AND model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M3',
        2014,
        2018,
        'S55',
        2979,
        431,
        '雙渦輪增壓',
        'RWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M3' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G80', 2020, 2023
    FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G80' AND year_from=2020 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G80' AND model_id=(SELECT id FROM models WHERE name='M3' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M3 Competition',
        2020,
        2023,
        'S58',
        2993,
        510,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F10', 2011, 2016
    FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F10' AND year_from=2011 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F10' AND model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M5',
        2011,
        2016,
        'S63',
        4395,
        560,
        '雙渦輪增壓',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F90', 2017, 2023
    FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F90' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F90' AND model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M5 Competition',
        2017,
        2023,
        'S63',
        4395,
        625,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X3 M' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X3 M');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F97', 2019, 2023
    FROM models WHERE name='X3 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X3 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F97' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X3 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F97' AND model_id=(SELECT id FROM models WHERE name='X3 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X3 M Competition',
        2019,
        2023,
        'S58',
        2993,
        510,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X5 M' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X5 M');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F85', 2013, 2018
    FROM models WHERE name='X5 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X5 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F85' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X5 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F85' AND model_id=(SELECT id FROM models WHERE name='X5 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X5 M',
        2013,
        2018,
        'S63',
        4395,
        575,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X6 M' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X6 M');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F96', 2019, 2023
    FROM models WHERE name='X6 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X6 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F96' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X6 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F96' AND model_id=(SELECT id FROM models WHERE name='X6 M' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X6 M Competition',
        2019,
        2023,
        'S63',
        4395,
        625,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '2 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='2 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F44', 2020, 2023
    FROM models WHERE name='2 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='2 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F44' AND year_from=2020 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='2 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F44' AND model_id=(SELECT id FROM models WHERE name='2 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M235i xDrive',
        2020,
        2023,
        'B48',
        1998,
        306,
        '渦輪增壓',
        'AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '4 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='4 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F32', 2014, 2020
    FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F32' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F32' AND model_id=(SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '440i',
        2014,
        2020,
        'B58',
        2998,
        326,
        '渦輪增壓',
        'RWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '4 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='4 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G22', 2020, 2023
    FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G22' AND year_from=2020 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G22' AND model_id=(SELECT id FROM models WHERE name='4 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M440i',
        2020,
        2023,
        'B58B30',
        2998,
        387,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '6 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='6 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G32', 2017, 2020
    FROM models WHERE name='6 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='6 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G32' AND year_from=2017 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='6 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G32' AND model_id=(SELECT id FROM models WHERE name='6 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        '640i GT',
        2017,
        2020,
        'B58',
        2998,
        340,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '8 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='8 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G15', 2018, 2023
    FROM models WHERE name='8 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='8 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G15' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='8 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G15' AND model_id=(SELECT id FROM models WHERE name='8 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M850i',
        2018,
        2023,
        'N63',
        4395,
        530,
        '雙渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X4' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G02', 2018, 2023
    FROM models WHERE name='X4' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G02' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X4' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G02' AND model_id=(SELECT id FROM models WHERE name='X4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X4 M40i',
        2018,
        2023,
        'B58',
        2998,
        360,
        '渦輪增壓',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'X7' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='X7');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G07', 2018, 2023
    FROM models WHERE name='X7' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X7' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G07' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X7' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G07' AND model_id=(SELECT id FROM models WHERE name='X7' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'X7 M50i',
        2018,
        2023,
        'N63',
        4395,
        530,
        '雙渦輪增壓',
        'AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'i4' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='i4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G26', 2021, 2023
    FROM models WHERE name='i4' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='i4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G26' AND year_from=2021 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='i4' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G26' AND model_id=(SELECT id FROM models WHERE name='i4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'i4 M50',
        2021,
        2023,
        '電動',
        NULL,
        544,
        '電動',
        'AWD',
        '雙接頭彈簧柱',
        '多連桿',
        '純電',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M4' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G82', 2022, 2023
    FROM models WHERE name='M4' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G82' AND year_from=2022 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M4' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G82' AND model_id=(SELECT id FROM models WHERE name='M4' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M4 CSL',
        2022,
        2023,
        'S58',
        2993,
        550,
        '雙渦輪增壓',
        'RWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'M5' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='M5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F90', 2021, 2022
    FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='F90' AND year_from=2021 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='F90' AND model_id=(SELECT id FROM models WHERE name='M5' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M5 CS',
        2021,
        2022,
        'S63',
        4395,
        635,
        '雙渦輪增壓',
        'AWD',
        '雙A臂(M款)',
        '多連桿(M款)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, 'XM' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='XM');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'G09', 2023, 2023
    FROM models WHERE name='XM' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XM' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='G09' AND year_from=2023 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XM' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='G09' AND model_id=(SELECT id FROM models WHERE name='XM' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'XM Label Red',
        2023,
        2023,
        'S68',
        4395,
        748,
        '雙渦輪增壓+PHEV',
        'AWD',
        '雙A臂(主動式)',
        '多連桿(主動式)',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'BMW');

    INSERT INTO models (make_id, name)
    SELECT id, '3 Series' FROM makes WHERE name = 'BMW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='BMW') AND name='3 Series');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'E46', 2003, 2004
    FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) AND name='E46' AND year_from=2003 AND year_to=2004);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')),
        (SELECT id FROM generations WHERE name='E46' AND model_id=(SELECT id FROM models WHERE name='3 Series' AND make_id=(SELECT id FROM makes WHERE name='BMW')) LIMIT 1),
        'M3 CSL',
        2003,
        2004,
        'S54',
        3246,
        360,
        '自然進氣',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'C-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='C-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W203', 2004, 2007
    FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W203' AND year_from=2004 AND year_to=2007);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W203' AND model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'C200',
        2004,
        2007,
        'M271',
        1796,
        163,
        '機械增壓',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'KOMPRESSOR';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'C-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='C-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W204', 2008, 2014
    FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W204' AND year_from=2008 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W204' AND model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'C250',
        2008,
        2014,
        'M271',
        1796,
        204,
        '渦輪增壓',
        'RWD',
        '三連桿',
        '多連桿',
        '汽油',
        'BlueEFFICIENCY';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'C-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='C-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W205', 2015, 2021
    FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W205' AND year_from=2015 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W205' AND model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'C200',
        2015,
        2021,
        'M274',
        1991,
        184,
        '渦輪增壓',
        'RWD',
        '多連桿',
        '多連桿',
        '汽油',
        'ECO Start/Stop';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'C-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='C-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W206', 2021, 2025
    FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W206' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W206' AND model_id=(SELECT id FROM models WHERE name='C-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'C200',
        2021,
        2025,
        'M254',
        1499,
        204,
        '渦輪增壓',
        'RWD',
        '多連桿',
        '多連桿',
        '汽油',
        '48V EQ Boost';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'E-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='E-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W211', 2004, 2009
    FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W211' AND year_from=2004 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W211' AND model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'E200K',
        2004,
        2009,
        'M271',
        1796,
        163,
        '機械增壓',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '氣壓懸吊(選配)';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'E-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='E-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W212', 2009, 2016
    FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W212' AND year_from=2009 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W212' AND model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'E250',
        2009,
        2016,
        'M271',
        1796,
        204,
        '渦輪增壓',
        '4MATIC',
        '三連桿',
        '多連桿',
        '汽油',
        'AGILITY CONTROL';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'E-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='E-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W213', 2016, 2023
    FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W213' AND year_from=2016 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W213' AND model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'E200',
        2016,
        2023,
        'M274',
        1991,
        184,
        '渦輪增壓',
        'RWD',
        '多連桿',
        '多連桿',
        '汽油',
        '氣壓懸吊(選配)';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'E-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='E-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W214', 2023, 2025
    FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W214' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W214' AND model_id=(SELECT id FROM models WHERE name='E-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'E200',
        2023,
        2025,
        'M254',
        1999,
        204,
        '渦輪增壓',
        'RWD',
        '多連桿',
        '多連桿',
        '汽油',
        '48V輕油電';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'S-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='S-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W221', 2006, 2013
    FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W221' AND year_from=2006 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W221' AND model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'S350L',
        2006,
        2013,
        'M272',
        3498,
        272,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'AIRMATIC氣壓懸吊';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'S-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='S-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W222', 2014, 2020
    FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W222' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W222' AND model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'S450L',
        2014,
        2020,
        'M276',
        2996,
        367,
        '渦輪增壓',
        '4MATIC',
        '雙A臂',
        '多連桿',
        '汽油',
        'MAGIC BODY CONTROL';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'S-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='S-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W223', 2021, 2025
    FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W223' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W223' AND model_id=(SELECT id FROM models WHERE name='S-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'S500L',
        2021,
        2025,
        'M256',
        2999,
        435,
        '渦輪增壓',
        '4MATIC',
        '雙A臂',
        '多連桿',
        '汽油',
        '48V+ISG整合式啟動發電機';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLC' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLC');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X253', 2015, 2022
    FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X253' AND year_from=2015 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X253' AND model_id=(SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLC200',
        2015,
        2022,
        'M274',
        1991,
        184,
        '渦輪增壓',
        '4MATIC',
        '麥花臣',
        '多連桿',
        '汽油',
        '越野模式';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLC' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLC');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X254', 2022, 2025
    FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X254' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X254' AND model_id=(SELECT id FROM models WHERE name='GLC' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLC300e',
        2022,
        2025,
        'M254',
        1999,
        313,
        '渦輪增壓',
        '4MATIC',
        '多連桿',
        '多連桿',
        '插電混動',
        '31.2kWh電池';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLE' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLE');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W166', 2015, 2019
    FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W166' AND year_from=2015 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W166' AND model_id=(SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLE350d',
        2015,
        2019,
        'OM642',
        2987,
        258,
        '渦輪增壓',
        '4MATIC',
        '雙A臂',
        '多連桿',
        '柴油',
        'ADS主動懸吊';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLE' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLE');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W167', 2019, 2025
    FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W167' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W167' AND model_id=(SELECT id FROM models WHERE name='GLE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLE450',
        2019,
        2025,
        'M256',
        2999,
        367,
        '渦輪增壓',
        '4MATIC',
        'E-ACTIVE BODY',
        'E-ACTIVE BODY',
        '汽油',
        '48V主動式懸吊';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'A-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='A-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W176', 2012, 2018
    FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W176' AND year_from=2012 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W176' AND model_id=(SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'A180',
        2012,
        2018,
        'M270',
        1595,
        122,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        'MBUX(2018)';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'A-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='A-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W177', 2018, 2025
    FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W177' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W177' AND model_id=(SELECT id FROM models WHERE name='A-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'A200',
        2018,
        2025,
        'M282',
        1332,
        163,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        'MBUX系統';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLA' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLA');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X156', 2014, 2020
    FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X156' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X156' AND model_id=(SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLA200',
        2014,
        2020,
        'M270',
        1595,
        156,
        '渦輪增壓',
        '4MATIC',
        '麥花臣',
        '多連桿',
        '汽油',
        '越野模式';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLA' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLA');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'H247', 2020, 2025
    FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='H247' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='H247' AND model_id=(SELECT id FROM models WHERE name='GLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLA250',
        2020,
        2025,
        'M260',
        1991,
        224,
        '渦輪增壓',
        '4MATIC',
        '麥花臣',
        '多連桿',
        '汽油',
        'MBUX擴增實境';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'GLB' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='GLB');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X247', 2019, 2025
    FROM models WHERE name='GLB' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GLB' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X247' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GLB' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X247' AND model_id=(SELECT id FROM models WHERE name='GLB' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'GLB200',
        2019,
        2025,
        'M282',
        1332,
        163,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '7人座配置';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'G-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='G-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W463', 2004, 2018
    FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W463' AND year_from=2004 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W463' AND model_id=(SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'G500',
        2004,
        2018,
        'M273',
        5461,
        388,
        '自然進氣',
        '4MATIC',
        '固定軸',
        '固定軸',
        '汽油',
        '三差速鎖定';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'G-Class' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='G-Class');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'W464', 2018, 2025
    FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='W464' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='W464' AND model_id=(SELECT id FROM models WHERE name='G-Class' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'G400d',
        2018,
        2025,
        'OM656',
        2925,
        330,
        '渦輪增壓',
        '4MATIC',
        '雙A臂',
        '固定軸',
        '柴油',
        'ECO Start/Stop';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'EQE' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='EQE');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'V295', 2022, 2025
    FROM models WHERE name='EQE' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='EQE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='V295' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='EQE' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='V295' AND model_id=(SELECT id FROM models WHERE name='EQE' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'EQE350+',
        2022,
        2025,
        '電動',
        NULL,
        292,
        '電動',
        'RWD',
        '四連桿',
        '多連桿',
        '純電',
        '90.6kWh電池';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'EQS' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='EQS');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'V297', 2021, 2025
    FROM models WHERE name='EQS' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='EQS' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='V297' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='EQS' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='V297' AND model_id=(SELECT id FROM models WHERE name='EQS' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'EQS450+',
        2021,
        2025,
        '電動',
        NULL,
        333,
        '電動',
        'RWD',
        '四連桿',
        '多連桿',
        '純電',
        '107.8kWh電池';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'AMG GT' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='AMG GT');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C190', 2015, 2023
    FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='C190' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='C190' AND model_id=(SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'AMG GT S',
        2015,
        2023,
        'M178',
        3982,
        522,
        '渦輪增壓',
        'RWD',
        '雙A臂',
        '雙A臂',
        '汽油',
        '乾式油底殼';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'AMG GT' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='AMG GT');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C192', 2023, 2025
    FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='C192' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='C192' AND model_id=(SELECT id FROM models WHERE name='AMG GT' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'AMG GT 63 S',
        2023,
        2025,
        'M177',
        3982,
        639,
        '渦輪增壓',
        '4MATIC+',
        '雙A臂',
        '雙A臂',
        '汽油',
        '主動式後軸轉向';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'CLA' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='CLA');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X118', 2013, 2019
    FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X118' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X118' AND model_id=(SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'CLA200',
        2013,
        2019,
        'M270',
        1595,
        156,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '四門轎跑';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'CLA' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='CLA');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'X118', 2020, 2025
    FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='X118' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='X118' AND model_id=(SELECT id FROM models WHERE name='CLA' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'CLA35 AMG',
        2020,
        2025,
        'M260',
        1991,
        306,
        '渦輪增壓',
        '4MATIC',
        '麥花臣',
        '多連桿',
        '汽油',
        'AMG Performance';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'SL' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='SL');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'R231', 2012, 2020
    FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='R231' AND year_from=2012 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='R231' AND model_id=(SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'SL500',
        2012,
        2020,
        'M278',
        4663,
        435,
        '渦輪增壓',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '主動式液壓車頂';

INSERT INTO makes (name)
    SELECT 'Benz'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Benz');

    INSERT INTO models (make_id, name)
    SELECT id, 'SL' FROM makes WHERE name = 'Benz'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Benz') AND name='SL');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'R232', 2022, 2025
    FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')) AND name='R232' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')),
        (SELECT id FROM generations WHERE name='R232' AND model_id=(SELECT id FROM models WHERE name='SL' AND make_id=(SELECT id FROM makes WHERE name='Benz')) LIMIT 1),
        'SL55 AMG',
        2022,
        2025,
        'M177',
        3982,
        476,
        '渦輪增壓',
        '4MATIC+',
        '雙A臂',
        '多連桿',
        '汽油',
        '主動式後軸轉向';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A4' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B7', 2004, 2008
    FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='B7' AND year_from=2004 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='B7' AND model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A4 1.8T',
        2004,
        2008,
        'EA113',
        1781,
        163,
        '渦輪增壓',
        'FWD',
        '雙A臂',
        '梯型多連桿',
        '汽油',
        'K03渦輪';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A4' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B7', 2006, 2008
    FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='B7' AND year_from=2006 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='B7' AND model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A4 2.0T FSI',
        2006,
        2008,
        'EA113',
        1984,
        200,
        '渦輪增壓',
        'FWD',
        '雙A臂',
        '梯型多連桿',
        '汽油',
        'FSI直噴';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A4' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B8', 2008, 2015
    FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='B8' AND year_from=2008 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='B8' AND model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A4 2.0TFSI',
        2008,
        2015,
        'EA888',
        1984,
        180,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '梯型多連桿',
        '汽油',
        'AVS可變氣門';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A4' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B9', 2015, 2023
    FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='B9' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='B9' AND model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A4 40 TFSI',
        2015,
        2023,
        'EA888 Gen3',
        1984,
        190,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '汽油',
        'B循環技術';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A4' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B10', 2023, 2025
    FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='B10' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='B10' AND model_id=(SELECT id FROM models WHERE name='A4' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A4 45 TFSI',
        2023,
        2025,
        'EA888 Evo4',
        1984,
        265,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '汽油',
        '12V輕油電';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A6' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A6');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C6', 2005, 2011
    FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='C6' AND year_from=2005 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='C6' AND model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A6 2.8 FSI',
        2005,
        2011,
        'BAE',
        2773,
        220,
        '自然進氣',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        'AVS可變氣門';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A6' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A6');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C7', 2011, 2018
    FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='C7' AND year_from=2011 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='C7' AND model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A6 35 TDI',
        2011,
        2018,
        'EA288',
        1968,
        190,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '梯型多連桿',
        '柴油',
        '雙渦輪增壓';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A6' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A6');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C8', 2018, 2025
    FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='C8' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='C8' AND model_id=(SELECT id FROM models WHERE name='A6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A6 45 TFSI',
        2018,
        2025,
        'EA888 Gen3',
        1984,
        245,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '汽油',
        '12V輕油電';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'D4', 2010, 2017
    FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='D4' AND year_from=2010 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='D4' AND model_id=(SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A8L 3.0T',
        2010,
        2017,
        'CRE',
        2995,
        290,
        '機械增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '全鋁合金車身';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'D5', 2017, 2025
    FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='D5' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='D5' AND model_id=(SELECT id FROM models WHERE name='A8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A8L 55 TFSI',
        2017,
        2025,
        'EA839',
        2995,
        340,
        '渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '48V輕油電';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'TT' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='TT');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8J', 2006, 2014
    FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8J' AND year_from=2006 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8J' AND model_id=(SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'TT 2.0TFSI',
        2006,
        2014,
        'EA113',
        1984,
        200,
        '渦輪增壓',
        'quattro',
        '麥花臣',
        '四連桿',
        '汽油',
        'ASF鋁合金車體';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'TT' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='TT');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8S', 2014, 2023
    FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8S' AND year_from=2014 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8S' AND model_id=(SELECT id FROM models WHERE name='TT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'TT S',
        2014,
        2023,
        'EA888',
        1984,
        310,
        '渦輪增壓',
        'quattro',
        '麥花臣',
        '四連桿',
        '汽油',
        '虛擬座艙';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q5' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8R', 2009, 2017
    FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8R' AND year_from=2009 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8R' AND model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q5 2.0TFSI',
        2009,
        2017,
        'EA888',
        1984,
        180,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '梯型多連桿',
        '汽油',
        'quattro ultra';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q5' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'FY', 2017, 2023
    FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='FY' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='FY' AND model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q5 45 TFSI',
        2017,
        2023,
        'EA888 Gen3',
        1984,
        252,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '汽油',
        '主動氣壓懸吊';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q5' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'FY', 2020, 2025
    FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='FY' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='FY' AND model_id=(SELECT id FROM models WHERE name='Q5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q5 55 TFSI e',
        2020,
        2025,
        'EA888 + PHEV',
        1984,
        367,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '插電混動',
        '17.9kWh電池';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q7' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q7');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4L', 2006, 2015
    FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='4L' AND year_from=2006 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='4L' AND model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q7 3.0 TDI',
        2006,
        2015,
        'ASB',
        2967,
        233,
        '渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '柴油',
        '可調氣壓懸吊';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q7' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q7');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4M', 2015, 2023
    FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='4M' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='4M' AND model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q7 45 TDI',
        2015,
        2023,
        'EA897',
        2967,
        249,
        '渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '柴油',
        '48V輕油電';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q7' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q7');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4M', 2017, 2023
    FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='4M' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='4M' AND model_id=(SELECT id FROM models WHERE name='Q7' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q7 e-tron',
        2017,
        2023,
        'EA888 + PHEV',
        1984,
        367,
        '渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '插電混動',
        'quattro四驅';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'e-tron' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='e-tron');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'GE', 2019, 2025
    FROM models WHERE name='e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='GE' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='GE' AND model_id=(SELECT id FROM models WHERE name='e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'e-tron 55',
        2019,
        2025,
        '電動',
        NULL,
        408,
        '電動',
        'quattro',
        '雙A臂',
        '多連桿',
        '純電',
        '95kWh電池';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'e-tron GT' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='e-tron GT');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'J1', 2021, 2025
    FROM models WHERE name='e-tron GT' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='e-tron GT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='J1' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='e-tron GT' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='J1' AND model_id=(SELECT id FROM models WHERE name='e-tron GT' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'e-tron GT',
        2021,
        2025,
        '電動',
        NULL,
        530,
        '電動',
        'quattro',
        '雙A臂',
        '多連桿',
        '純電',
        '800V架構';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'RS6' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='RS6');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C7', 2013, 2018
    FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='C7' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='C7' AND model_id=(SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'RS6 Avant',
        2013,
        2018,
        'EA824',
        3993,
        560,
        '雙渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '動態駕馭控制';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'RS6' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='RS6');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C8', 2019, 2025
    FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='C8' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='C8' AND model_id=(SELECT id FROM models WHERE name='RS6' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'RS6 Avant',
        2019,
        2025,
        'EA825',
        3996,
        600,
        '雙渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '48V主動防傾桿';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A3' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8P', 2004, 2012
    FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8P' AND year_from=2004 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8P' AND model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A3 1.8T',
        2004,
        2012,
        'EA113',
        1781,
        160,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '四連桿',
        '汽油',
        '橫置引擎';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A3' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8V', 2012, 2020
    FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8V' AND year_from=2012 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8V' AND model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A3 40 TFSI',
        2012,
        2020,
        'EA888',
        1984,
        190,
        '渦輪增壓',
        'quattro',
        '麥花臣',
        '四連桿',
        '汽油',
        '全數位儀表';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A3' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8Y', 2020, 2025
    FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8Y' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8Y' AND model_id=(SELECT id FROM models WHERE name='A3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A3 35 TFSI',
        2020,
        2025,
        'EA211 Evo',
        1498,
        150,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        'MMI觸控系統';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q3' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8U', 2011, 2018
    FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8U' AND year_from=2011 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8U' AND model_id=(SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q3 2.0TFSI',
        2011,
        2018,
        'EA888',
        1984,
        170,
        '渦輪增壓',
        'quattro',
        '麥花臣',
        '四連桿',
        '汽油',
        '越野模式';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q3' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F3', 2018, 2025
    FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='F3' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='F3' AND model_id=(SELECT id FROM models WHERE name='Q3' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q3 45 TFSI',
        2018,
        2025,
        'EA888',
        1984,
        230,
        '渦輪增壓',
        'quattro',
        '麥花臣',
        '四連桿',
        '汽油',
        '虛擬座艙Plus';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'R8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='R8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '42', 2007, 2015
    FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='42' AND year_from=2007 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='42' AND model_id=(SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'R8 4.2 FSI',
        2007,
        2015,
        'BHK',
        4163,
        420,
        '自然進氣',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        'ASF全鋁車身';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'R8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='R8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'Type 4S', 2015, 2023
    FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='Type 4S' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='Type 4S' AND model_id=(SELECT id FROM models WHERE name='R8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'R8 V10 Plus',
        2015,
        2023,
        'EA824',
        5204,
        610,
        '自然進氣',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '全碳纖維車體';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'e-tron FE' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='e-tron FE');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'GE', 2020, 2025
    FROM models WHERE name='e-tron FE' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='e-tron FE' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='GE' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='e-tron FE' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='GE' AND model_id=(SELECT id FROM models WHERE name='e-tron FE' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'e-tron S',
        2020,
        2025,
        '電動',
        NULL,
        435,
        '電動',
        'quattro',
        '雙A臂',
        '多連桿',
        '純電',
        '三馬達系統';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4M', 2018, 2025
    FROM models WHERE name='Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='4M' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='4M' AND model_id=(SELECT id FROM models WHERE name='Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q8 55 TFSI',
        2018,
        2025,
        'EA839',
        2995,
        340,
        '渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '主動四輪轉向';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q4 e-tron' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='Q4 e-tron');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'FZ', 2021, 2025
    FROM models WHERE name='Q4 e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q4 e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='FZ' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q4 e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='FZ' AND model_id=(SELECT id FROM models WHERE name='Q4 e-tron' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'Q4 40 e-tron',
        2021,
        2025,
        '電動',
        NULL,
        204,
        '電動',
        'RWD',
        '麥花臣',
        '多連桿',
        '純電',
        '82kWh電池';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A5' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8T', 2007, 2016
    FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='8T' AND year_from=2007 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='8T' AND model_id=(SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A5 2.0TFSI',
        2007,
        2016,
        'EA888',
        1984,
        180,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '梯型多連桿',
        '汽油',
        '無框車門';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'A5' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='A5');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F5', 2016, 2023
    FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='F5' AND year_from=2016 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='F5' AND model_id=(SELECT id FROM models WHERE name='A5' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'A5 Sportback 45 TFSI',
        2016,
        2023,
        'EA888',
        1984,
        249,
        '渦輪增壓',
        'quattro',
        '五連桿',
        '五連桿',
        '汽油',
        '矩陣式LED';

INSERT INTO makes (name)
    SELECT 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Audi');

    INSERT INTO models (make_id, name)
    SELECT id, 'RS Q8' FROM makes WHERE name = 'Audi'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Audi') AND name='RS Q8');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4M', 2020, 2025
    FROM models WHERE name='RS Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RS Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) AND name='4M' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RS Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')),
        (SELECT id FROM generations WHERE name='4M' AND model_id=(SELECT id FROM models WHERE name='RS Q8' AND make_id=(SELECT id FROM makes WHERE name='Audi')) LIMIT 1),
        'RS Q8',
        2020,
        2025,
        'EA825',
        3996,
        600,
        '雙渦輪增壓',
        'quattro',
        '雙A臂',
        '雙A臂',
        '汽油',
        '主動氣壓懸吊';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2004, 2009
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='5代' AND year_from=2004 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Golf 1.6',
        2004,
        2009,
        'EA111',
        1595,
        102,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2006, 2009
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='5代' AND year_from=2006 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'GTI 2.0T',
        2006,
        2009,
        'EA113',
        1984,
        200,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2009, 2013
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='6代' AND year_from=2009 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Golf 1.4 TSI',
        2009,
        2013,
        'EA111',
        1390,
        122,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '機械+渦輪雙增壓';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2010, 2013
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='6代' AND year_from=2010 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'GTI 2.0T',
        2010,
        2013,
        'EA888',
        1984,
        210,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'XDS電子差速鎖';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2013, 2020
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='7代' AND year_from=2013 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Golf 1.4 TSI',
        2013,
        2020,
        'EA211',
        1395,
        125,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'ACT汽缸休止';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2014, 2020
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='7代' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'GTI 2.0T',
        2014,
        2020,
        'EA888',
        1984,
        230,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'VAQ電子差速器';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2020, 2025
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='8代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Golf 1.5 eTSI',
        2020,
        2025,
        'EA211 EVO',
        1498,
        150,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '48V輕油電';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Golf' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Golf');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2021, 2025
    FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='8代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Golf' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'GTI 2.0T',
        2021,
        2025,
        'EA888 Evo4',
        1984,
        245,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'VDM車輛動態管理';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Passat' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Passat');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B6', 2005, 2011
    FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='B6' AND year_from=2005 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='B6' AND model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Passat 2.0 TDI',
        2005,
        2011,
        'EA189',
        1968,
        140,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '柴油',
        'DPF柴油微粒濾清器';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Passat' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Passat');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B7', 2011, 2015
    FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='B7' AND year_from=2011 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='B7' AND model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Passat 1.8 TSI',
        2011,
        2015,
        'EA888',
        1798,
        160,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Passat' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Passat');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B8', 2015, 2023
    FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='B8' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='B8' AND model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Passat 2.0 TSI',
        2015,
        2023,
        'EA888',
        1984,
        190,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'DCC主動懸吊';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Passat' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Passat');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B9', 2023, 2025
    FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='B9' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='B9' AND model_id=(SELECT id FROM models WHERE name='Passat' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Passat 1.5 eTSI',
        2023,
        2025,
        'EA211 EVO2',
        1498,
        150,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '插電式混合動力';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tiguan' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Tiguan');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2008, 2016
    FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2008 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Tiguan 2.0 TSI',
        2008,
        2016,
        'EA888',
        1984,
        180,
        '渦輪增壓',
        '4MOTION',
        '麥花臣',
        '多連桿',
        '汽油',
        'Haldex五代四驅';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tiguan' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Tiguan');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2016, 2020
    FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='2代' AND year_from=2016 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Tiguan 330 TSI',
        2016,
        2020,
        'EA888',
        1984,
        180,
        '渦輪增壓',
        '4MOTION',
        '麥花臣',
        '多連桿',
        '汽油',
        '4MOTION主動控制';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tiguan' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Tiguan');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2020, 2025
    FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='3代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Tiguan' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Tiguan 1.5 eTSI',
        2020,
        2025,
        'EA211 EVO',
        1498,
        150,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '48V輕油電';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'T-Roc' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='T-Roc');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2018, 2023
    FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'T-Roc 230 TSI',
        2018,
        2023,
        'EA211',
        1395,
        130,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'T-Roc' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='T-Roc');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2021, 2025
    FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='T-Roc' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'T-Roc 330 TSI R-Line',
        2021,
        2025,
        'EA888',
        1984,
        190,
        '渦輪增壓',
        '4MOTION',
        '麥花臣',
        '多連桿',
        '汽油',
        '運動懸吊';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Touran' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Touran');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2004, 2010
    FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2004 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Touran 1.9 TDI',
        2004,
        2010,
        'EA188',
        1896,
        105,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '柴油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Touran' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Touran');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2010, 2015
    FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='2代' AND year_from=2010 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Touran 1.4 TSI',
        2010,
        2015,
        'EA111',
        1390,
        140,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Touran' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Touran');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2015, 2025
    FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='3代' AND year_from=2015 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Touran' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Touran 1.5 TSI',
        2015,
        2025,
        'EA211',
        1498,
        150,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'ACT汽缸休止';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Arteon' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Arteon');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2017, 2025
    FROM models WHERE name='Arteon' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Arteon' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Arteon' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Arteon' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Arteon 330 TSI',
        2017,
        2025,
        'EA888',
        1984,
        190,
        '渦輪增壓',
        '4MOTION',
        '麥花臣',
        '多連桿',
        '汽油',
        'DCC主動懸吊';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'ID.4' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='ID.4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2021, 2025
    FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'ID.4 Pro',
        2021,
        2025,
        'APP310',
        0,
        204,
        '電動',
        'RWD',
        '-',
        '-',
        '純電',
        '77kWh電池組';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'ID.4' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='ID.4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2022, 2025
    FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='ID.4' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'ID.4 GTX',
        2022,
        2025,
        'APP550 x2',
        0,
        299,
        '電動',
        'AWD',
        '-',
        '-',
        '純電',
        '雙馬達四驅';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Caddy' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Caddy');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2004, 2010
    FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='4代' AND year_from=2004 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Caddy 1.6 TDI',
        2004,
        2010,
        'EA189',
        1598,
        102,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '葉片彈簧',
        '柴油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Caddy' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Caddy');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2010, 2020
    FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='5代' AND year_from=2010 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Caddy 1.4 TSI',
        2010,
        2020,
        'EA211',
        1395,
        125,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '複合式懸吊',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Caddy' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Caddy');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2020, 2025
    FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='5代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Caddy' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Caddy Cargo',
        2020,
        2025,
        'EA288 Evo',
        1968,
        122,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '複合式懸吊',
        '柴油',
        'AdBlue系統';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Polo' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Polo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2009, 2017
    FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='5代' AND year_from=2009 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Polo 1.6',
        2009,
        2017,
        'EA111',
        1598,
        105,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '-';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Polo' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Polo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2018, 2025
    FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='6代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Polo' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Polo 230 TSI',
        2018,
        2025,
        'EA211',
        999,
        115,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '1.0三缸引擎';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'Taigo' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='Taigo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2022, 2025
    FROM models WHERE name='Taigo' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Taigo' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Taigo' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Taigo' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'Taigo 1.0 TSI',
        2022,
        2025,
        'EA211',
        999,
        110,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '跨界跑旅設計';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'ID.3' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='ID.3');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2023, 2025
    FROM models WHERE name='ID.3' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ID.3' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ID.3' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='ID.3' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'ID.3 Pro S',
        2023,
        2025,
        'APP310',
        0,
        204,
        '電動',
        'RWD',
        '-',
        '-',
        '純電',
        '58kWh電池組';

INSERT INTO makes (name)
    SELECT 'VW'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'VW');

    INSERT INTO models (make_id, name)
    SELECT id, 'T-Cross' FROM makes WHERE name = 'VW'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='VW') AND name='T-Cross');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2025
    FROM models WHERE name='T-Cross' AND make_id=(SELECT id FROM makes WHERE name='VW')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='T-Cross' AND make_id=(SELECT id FROM makes WHERE name='VW')) AND name='1代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='T-Cross' AND make_id=(SELECT id FROM makes WHERE name='VW')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='T-Cross' AND make_id=(SELECT id FROM makes WHERE name='VW')) LIMIT 1),
        'T-Cross 230 TSI',
        2019,
        2025,
        'EA211',
        999,
        115,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '多功能座椅';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fabia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Fabia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2005, 2007
    FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2005 AND year_to=2007);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Fabia 1.4 MPI',
        2005,
        2007,
        'AUA',
        1390,
        80,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        'ESP電子穩定系統';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fabia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Fabia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2007, 2014
    FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2007 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.4L MPI',
        2007,
        2014,
        'BZG',
        1390,
        75,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        '電子穩定系統(ESC)';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fabia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Fabia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2011, 2015
    FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2011 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Fabia Combi 1.2 TSI',
        2011,
        2015,
        'CBZB',
        1197,
        105,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        'Start-Stop引擎啟停';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fabia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Fabia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2022, 2025
    FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='4代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Fabia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Fabia 1.0 TSI',
        2022,
        2025,
        'CHPA',
        999,
        110,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Matrix LED頭燈';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2005, 2008
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2005 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Octavia 1.6 MPI',
        2005,
        2008,
        'AWL',
        1598,
        102,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '基本安全套件';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2008, 2013
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.8 TSI',
        2008,
        2013,
        'CZCA',
        1798,
        160,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓直噴引擎，DSG雙離合器';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2013, 2020
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='3代' AND year_from=2013 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.4 TSI',
        2013,
        2020,
        'CZEA',
        1395,
        150,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'ACT可變氣缸技術，DSG變速箱';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2019, 2024
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='4代' AND year_from=2019 AND year_to=2024);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.5 TSI e-TEC',
        2019,
        2024,
        'DJYA',
        1498,
        150,
        '渦輪增壓+輕油電',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油+輕油電',
        'Mild Hybrid 48V系統';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2024, 2025
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='5代' AND year_from=2024 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.5 TSI e-TEC',
        2024,
        2025,
        'DPCA',
        1498,
        150,
        '渦輪增壓+輕油電',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油+輕油電',
        'Superb級內裝升級';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Octavia' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Octavia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2024, 2025
    FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='5代' AND year_from=2024 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Octavia' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'RS 2.0 TSI',
        2024,
        2025,
        'DTU',
        1984,
        245,
        '渦輪增壓',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '汽油',
        '性能RS套件，DCC動態底盤控制';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Roomster' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Roomster');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2006, 2010
    FROM models WHERE name='Roomster' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Roomster' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2006 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Roomster' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Roomster' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Roomster 1.4 MPI',
        2006,
        2010,
        'BBZ',
        1390,
        80,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        'MPV多功能空間設計';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Superb' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Superb');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2005, 2008
    FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2005 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Superb 2.0 FSI',
        2005,
        2008,
        'BLR',
        1984,
        150,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '旗艦級舒適座椅';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Superb' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Superb');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2008, 2015
    FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2008 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '2.0 TDI',
        2008,
        2015,
        'CFGB',
        1968,
        170,
        '渦輪增壓柴油',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '柴油',
        '渦輪增壓柴油引擎，DSG雙離合器';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Superb' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Superb');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2015, 2023
    FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='3代' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '2.0 TSI',
        2015,
        2023,
        'CJZA',
        1984,
        280,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓直噴引擎，DSG雙離合器，四輪轉向系統';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Superb' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Superb');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2023, 2025
    FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='4代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Superb' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '2.0 TSI L&K',
        2023,
        2025,
        'DTF',
        1984,
        280,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '豪華L&K版，Matrix LED';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Yeti' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Yeti');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2010, 2015
    FROM models WHERE name='Yeti' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Yeti' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2010 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Yeti' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Yeti' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Yeti 1.2 TSI',
        2010,
        2015,
        'CBZB',
        1197,
        105,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '跨界SUV設計，VarioRail行李架';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Rapid' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Rapid');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2012, 2019
    FROM models WHERE name='Rapid' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Rapid' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2012 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Rapid' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Rapid' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.6L MPI',
        2012,
        2019,
        'CWVA',
        1598,
        110,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        'ESP電子穩定系統';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kodiaq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Kodiaq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2017, 2022
    FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2017 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '2.0 TSI',
        2017,
        2022,
        'CHHB',
        1984,
        180,
        '渦輪增壓',
        '前置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '四輪驅動，電子懸吊管理';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kodiaq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Kodiaq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2023, 2025
    FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Kodiaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '2.0 TSI RS',
        2023,
        2025,
        'DTF',
        1984,
        265,
        '渦輪增壓',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '汽油',
        'RS性能版，DCC自適應懸吊';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Karoq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Karoq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2018, 2022
    FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2018 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.5 TSI',
        2018,
        2022,
        'CZEA',
        1498,
        150,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓引擎，DSG雙離合器';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Karoq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Karoq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2022, 2025
    FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Karoq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.5 TSI',
        2022,
        2025,
        'DPCA',
        1498,
        150,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Simply Clever實用設計';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kamiq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Kamiq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2025
    FROM models WHERE name='Kamiq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kamiq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kamiq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Kamiq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.0 TSI',
        2019,
        2025,
        'DKRF',
        999,
        115,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '城市小型SUV，IQ.DRIVE輔助';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Scala' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Scala');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2022
    FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2019 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.0 TSI',
        2019,
        2022,
        'CZEA',
        999,
        115,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓，DSG雙離合器';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Scala' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Scala');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2023, 2025
    FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='2代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Scala' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        '1.5 TSI',
        2023,
        2025,
        'DJYA',
        1498,
        150,
        '渦輪增壓+輕油電',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油+輕油電',
        'Mild Hybrid';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Enyaq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Enyaq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2021, 2025
    FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Enyaq iV 80',
        2021,
        2025,
        '電動',
        0,
        204,
        '電動',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '純電',
        '77kWh電池，V2L外放電';

INSERT INTO makes (name)
    SELECT 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Skoda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Enyaq' FROM makes WHERE name = 'Skoda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Skoda') AND name='Enyaq');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2023, 2025
    FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) AND name='1代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Enyaq' AND make_id=(SELECT id FROM makes WHERE name='Skoda')) LIMIT 1),
        'Enyaq Coupe RS',
        2023,
        2025,
        '電動',
        0,
        299,
        '電動',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '純電',
        '雙馬達RS版，CCS快充';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代(R50/R53)', 2005, 2006
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第一代(R50/R53)' AND year_from=2005 AND year_to=2006);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第一代(R50/R53)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper',
        2005,
        2006,
        'W11B16A',
        1598,
        115,
        '自然吸氣',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        'Turbo (S型為渦輪)';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代(R50/R53)', 2005, 2006
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第一代(R50/R53)' AND year_from=2005 AND year_to=2006);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第一代(R50/R53)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper S',
        2005,
        2006,
        'W11B16A',
        1598,
        170,
        '渦輪增壓',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        'Turbocharged';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代(R56)', 2007, 2013
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第二代(R56)' AND year_from=2007 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第二代(R56)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper',
        2007,
        2013,
        'N12B16A',
        1598,
        120,
        '自然吸氣',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        'TwinPower Turbo (部分年份)';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代(R56)', 2007, 2013
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第二代(R56)' AND year_from=2007 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第二代(R56)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper S',
        2007,
        2013,
        'N14B16A',
        1598,
        175,
        '渦輪增壓',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        '雙渦輪增壓技術';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Countryman' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Countryman');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'R60', 2011, 2017
    FROM models WHERE name='Mini Countryman' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Countryman' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='R60' AND year_from=2011 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Countryman' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='R60' AND model_id=(SELECT id FROM models WHERE name='Mini Countryman' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Mini Countryman',
        2011,
        2017,
        'N18B16A',
        1598,
        240,
        NULL,
        '四輪驅動',
        '多連桿',
        NULL,
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第三代(F56)', 2014, 2023
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第三代(F56)' AND year_from=2014 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第三代(F56)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper',
        2014,
        2023,
        'B38B15A',
        1499,
        136,
        '渦輪增壓',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        'TwinPower Turbo';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Hatch' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Hatch');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第三代(F56)', 2014, 2023
    FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第三代(F56)' AND year_from=2014 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第三代(F56)' AND model_id=(SELECT id FROM models WHERE name='Mini Hatch' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper S',
        2014,
        2023,
        'B48B20A',
        1998,
        192,
        '渦輪增壓',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '汽油',
        '動態穩定控制系統';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Clubman' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Clubman');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F54', 2015, 2023
    FROM models WHERE name='Mini Clubman' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Clubman' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='F54' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Clubman' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='F54' AND model_id=(SELECT id FROM models WHERE name='Mini Clubman' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Mini Clubman',
        2015,
        2023,
        'B48B20A',
        1998,
        280,
        NULL,
        '前輪/四輪驅動',
        '多連桿',
        NULL,
        '汽油',
        '分離式尾門設計';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Convertible' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Convertible');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F57', 2016, 2023
    FROM models WHERE name='Mini Convertible' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Convertible' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='F57' AND year_from=2016 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Convertible' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='F57' AND model_id=(SELECT id FROM models WHERE name='Mini Convertible' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Mini Convertible',
        2016,
        2023,
        'B48B20A',
        1998,
        280,
        NULL,
        '前輪驅動',
        '多連桿',
        NULL,
        '汽油',
        '電動軟頂';

INSERT INTO makes (name)
    SELECT 'Mini'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mini');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mini Electric' FROM makes WHERE name = 'Mini'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mini') AND name='Mini Electric');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第三代(F56)', 2020, 2023
    FROM models WHERE name='Mini Electric' AND make_id=(SELECT id FROM makes WHERE name='Mini')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mini Electric' AND make_id=(SELECT id FROM makes WHERE name='Mini')) AND name='第三代(F56)' AND year_from=2020 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mini Electric' AND make_id=(SELECT id FROM makes WHERE name='Mini')),
        (SELECT id FROM generations WHERE name='第三代(F56)' AND model_id=(SELECT id FROM models WHERE name='Mini Electric' AND make_id=(SELECT id FROM makes WHERE name='Mini')) LIMIT 1),
        'Cooper SE',
        2020,
        2023,
        '電動',
        NULL,
        184,
        '純電動',
        '前輪驅動',
        '麥花臣式',
        '多連桿',
        '電動',
        '純電車款';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '997', 2005, 2012
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='997' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='997' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2005,
        2012,
        'M97.01',
        3600,
        345,
        '自然進氣',
        '後置後驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PASM，PDK雙離合器';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '997', 2005, 2012
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='997' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='997' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera S',
        2005,
        2012,
        'M97.01',
        3600,
        385,
        '自然進氣',
        '後置後驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PASM，PDK雙離合器';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '997', 2006, 2012
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='997' AND year_from=2006 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='997' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Turbo',
        2006,
        2012,
        'M97.70',
        3600,
        480,
        '渦輪增壓',
        '後置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '雙渦輪增壓，PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '991', 2012, 2019
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='991' AND year_from=2012 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='991' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2012,
        2019,
        'MA1.02',
        3700,
        370,
        '自然進氣',
        '後置後驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '991', 2012, 2019
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='991' AND year_from=2012 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='991' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera 4S',
        2012,
        2019,
        'MA1.02',
        3700,
        420,
        '自然進氣',
        '後置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PASM，PDK，電子限滑差速器';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '991', 2013, 2019
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='991' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='991' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'GT3',
        2013,
        2019,
        'MA1.20',
        3800,
        475,
        '自然進氣',
        '後置後驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '賽車化懸吊，輕量化設計';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '992', 2019, 2025
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='992' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='992' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2019,
        2025,
        'MA2.20',
        2981,
        385,
        '雙渦輪增壓',
        '後置後驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '最新PASM，PDK雙離合器';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '911' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='911');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '992', 2020, 2025
    FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='992' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='992' AND model_id=(SELECT id FROM models WHERE name='911' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Turbo S',
        2020,
        2025,
        'MA2.20',
        2981,
        650,
        '雙渦輪增壓',
        '後置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PDK，PASM，陶瓷碳纖維煞車系統';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Boxster' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Boxster');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '987', 2005, 2012
    FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='987' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='987' AND model_id=(SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2005,
        2012,
        'M97.02',
        2687,
        245,
        '自然進氣',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        '中置引擎，PASM懸吊';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Boxster' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Boxster');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '981', 2012, 2016
    FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='981' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='981' AND model_id=(SELECT id FROM models WHERE name='Boxster' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2012,
        2016,
        'MA1.10',
        2981,
        265,
        '自然進氣',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayman' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayman');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '987', 2005, 2012
    FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='987' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='987' AND model_id=(SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2005,
        2012,
        'M97.02',
        2687,
        245,
        '自然進氣',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayman' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayman');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '981', 2012, 2016
    FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='981' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='981' AND model_id=(SELECT id FROM models WHERE name='Cayman' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Carrera',
        2012,
        2016,
        'MA1.10',
        2981,
        265,
        '自然進氣',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayenne' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayenne');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2003, 2010
    FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='1代' AND year_from=2003 AND year_to=2010);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '3.2L V6',
        2003,
        2010,
        'MZ1',
        3198,
        250,
        '自然進氣',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PTM四輪驅動系統';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayenne' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayenne');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2010, 2017
    FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='2代' AND year_from=2010 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '3.6L V6',
        2010,
        2017,
        'MA1',
        3596,
        300,
        '自然進氣',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PTM';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayenne' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayenne');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2017, 2025
    FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='3代' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Cayenne' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '3.0L Turbo',
        2017,
        2025,
        'MA2',
        2995,
        340,
        '渦輪增壓',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PTM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Cayenne Coupe' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Cayenne Coupe');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2025
    FROM models WHERE name='Cayenne Coupe' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Cayenne Coupe' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='1代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Cayenne Coupe' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Cayenne Coupe' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '3.0L Turbo',
        2019,
        2025,
        'MA2',
        2995,
        340,
        '渦輪增壓',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PTM';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Macan' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Macan');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2014, 2021
    FROM models WHERE name='Macan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Macan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='1代' AND year_from=2014 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Macan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Macan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '2.0L Turbo',
        2014,
        2021,
        'EA888',
        1984,
        252,
        '渦輪增壓',
        '前置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'PASM，PTM';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Panamera' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Panamera');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2009, 2016
    FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='1代' AND year_from=2009 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '4.8L V8',
        2009,
        2016,
        'M48.00',
        4800,
        400,
        '自然進氣',
        '前置後驅/四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Panamera' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Panamera');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2017, 2021
    FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='2代' AND year_from=2017 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Panamera' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '2.9L V6 Twin Turbo',
        2017,
        2021,
        'MA2',
        2894,
        330,
        '雙渦輪增壓',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '718' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='718');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '982', 2016, 2020
    FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='982' AND year_from=2016 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='982' AND model_id=(SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Cayman S',
        2016,
        2020,
        'MA2.20',
        2981,
        350,
        '渦輪增壓',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, '718' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='718');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '982', 2016, 2020
    FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='982' AND year_from=2016 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='982' AND model_id=(SELECT id FROM models WHERE name='718' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        'Boxster S',
        2016,
        2020,
        'MA2.20',
        2981,
        350,
        '渦輪增壓',
        '中置後驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'PASM，PDK';

INSERT INTO makes (name)
    SELECT 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Porsche');

    INSERT INTO models (make_id, name)
    SELECT id, 'Taycan' FROM makes WHERE name = 'Porsche'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Porsche') AND name='Taycan');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2025
    FROM models WHERE name='Taycan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Taycan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) AND name='1代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Taycan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Taycan' AND make_id=(SELECT id FROM makes WHERE name='Porsche')) LIMIT 1),
        '4S',
        2019,
        2025,
        '電動馬達',
        NULL,
        420,
        '電動',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '純電',
        '800V電池，PTM，電子懸吊系統';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2004, 2008
    FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='2代' AND year_from=2004 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus 2.0',
        2004,
        2008,
        'Duratec-HE',
        1999,
        145,
        '自然進氣',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '反置式引擎';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2011, 2015
    FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='3代' AND year_from=2011 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus TDCi',
        2011,
        2015,
        'Duratorq TDCi',
        1560,
        115,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '柴油',
        'DPF系統';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2015, 2018
    FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='4代' AND year_from=2015 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus 1.5T',
        2015,
        2018,
        'EcoBoost',
        1499,
        180,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '缸內直噴';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4.5代', 2018, 2022
    FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='4.5代' AND year_from=2018 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='4.5代' AND model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus ST-Line',
        2018,
        2022,
        'EcoBoost',
        1499,
        182,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'Co-Pilot360';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2022, 2025
    FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='5代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Focus' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus ST',
        2022,
        2025,
        'EcoBoost',
        1999,
        280,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '電子限滑差速器';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kuga' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Kuga');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2013, 2016
    FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='2代' AND year_from=2013 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Kuga 2.0T',
        2013,
        2016,
        'EcoBoost',
        1999,
        242,
        '渦輪增壓',
        'AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '智慧型四驅';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kuga' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Kuga');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2020, 2025
    FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='3代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Kuga 180',
        2020,
        2025,
        'EcoBoost',
        1499,
        180,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '輕量化車體';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kuga' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Kuga');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2020, 2025
    FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='3代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Kuga' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Kuga ST-Line',
        2020,
        2025,
        'EcoBoost',
        1999,
        250,
        '渦輪增壓',
        'AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '運動化懸吊';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mondeo' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Mondeo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2007, 2014
    FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='4代' AND year_from=2007 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Mondeo 2.0T',
        2007,
        2014,
        'Duratec-HE',
        1999,
        203,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '歐規底盤';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mondeo' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Mondeo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2015, 2022
    FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='5代' AND year_from=2015 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Mondeo Hybrid',
        2015,
        2022,
        'Atkinson',
        1999,
        187,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '多連桿',
        '油電混合',
        '鋰電池組';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mondeo' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Mondeo');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2023, 2025
    FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='6代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Mondeo' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Mondeo Wagon',
        2023,
        2025,
        'EcoBoost',
        1999,
        253,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '歐洲進口';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fiesta' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Fiesta');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2008, 2013
    FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='6代' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Fiesta 1.6',
        2008,
        2013,
        'Duratec',
        1596,
        120,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '歐洲設計';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fiesta' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Fiesta');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2014, 2022
    FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='7代' AND year_from=2014 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='Fiesta' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Fiesta 1.0T',
        2014,
        2022,
        'EcoBoost',
        999,
        125,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '三缸引擎';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Ranger' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Ranger');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2012, 2019
    FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='3代' AND year_from=2012 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Ranger 3.2',
        2012,
        2019,
        'Duratorq',
        3198,
        200,
        '渦輪增壓',
        '4WD',
        '雙A臂',
        '葉片彈簧',
        '柴油',
        '電子加力箱';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Ranger' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Ranger');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2019, 2025
    FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='4代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Ranger' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Ranger Wildtrak',
        2019,
        2025,
        'EcoBlue',
        1997,
        213,
        '渦輪增壓',
        '4WD',
        '雙A臂',
        '葉片彈簧',
        '柴油',
        '地形管理系統';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tourneo Custom' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Tourneo Custom');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2014, 2023
    FROM models WHERE name='Tourneo Custom' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tourneo Custom' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='2代' AND year_from=2014 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tourneo Custom' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Tourneo Custom' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Tourneo Custom',
        2014,
        2023,
        'Duratorq',
        2198,
        130,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '葉片彈簧',
        '柴油',
        '商旅設定';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tourneo Connect' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Tourneo Connect');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2022, 2025
    FROM models WHERE name='Tourneo Connect' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tourneo Connect' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='2代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tourneo Connect' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Tourneo Connect' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Tourneo Connect',
        2022,
        2025,
        'EcoBoost',
        1499,
        125,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '5+2人座';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mustang' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Mustang');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2015, 2023
    FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='5代' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Mustang 2.3T',
        2015,
        2023,
        'EcoBoost',
        2261,
        290,
        '渦輪增壓',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '運動化懸吊';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Mustang' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Mustang');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2024, 2025
    FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='6代' AND year_from=2024 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Mustang' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Mustang Dark Horse',
        2024,
        2025,
        'Coyote',
        5038,
        500,
        '自然進氣',
        'RWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '賽道調校';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Escape' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Escape');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2004, 2008
    FROM models WHERE name='Escape' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Escape' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='2代' AND year_from=2004 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Escape' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Escape' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Escape 2.3',
        2004,
        2008,
        'Duratec',
        2261,
        153,
        '自然進氣',
        '4WD',
        '麥花臣',
        '雙連桿',
        '汽油',
        '適時四驅';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'EcoSport' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='EcoSport');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2014, 2022
    FROM models WHERE name='EcoSport' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='EcoSport' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='1代' AND year_from=2014 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='EcoSport' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='EcoSport' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'EcoSport 1.5',
        2014,
        2022,
        'Dragon',
        1498,
        112,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力樑',
        '汽油',
        '都會SUV';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'KUGA PHEV' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='KUGA PHEV');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2022, 2025
    FROM models WHERE name='KUGA PHEV' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='KUGA PHEV' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='3代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='KUGA PHEV' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='KUGA PHEV' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Kuga PHEV',
        2022,
        2025,
        'EcoBoost PHEV',
        1499,
        225,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '插電混動',
        '14.4kWh電池';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Focus Active' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Focus Active');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2022, 2025
    FROM models WHERE name='Focus Active' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Focus Active' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='5代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Focus Active' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Focus Active' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Focus Active',
        2022,
        2025,
        'EcoBoost',
        1499,
        182,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '跨界加高';

INSERT INTO makes (name)
    SELECT 'Ford'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Ford');

    INSERT INTO models (make_id, name)
    SELECT id, 'Explorer' FROM makes WHERE name = 'Ford'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Ford') AND name='Explorer');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2023, 2025
    FROM models WHERE name='Explorer' AND make_id=(SELECT id FROM makes WHERE name='Ford')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Explorer' AND make_id=(SELECT id FROM makes WHERE name='Ford')) AND name='6代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Explorer' AND make_id=(SELECT id FROM makes WHERE name='Ford')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Explorer' AND make_id=(SELECT id FROM makes WHERE name='Ford')) LIMIT 1),
        'Explorer',
        2023,
        2025,
        'EcoBoost',
        2997,
        365,
        '渦輪增壓',
        '4WD',
        '雙A臂',
        '多連桿',
        '汽油',
        '後驅平台';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S40' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S40');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2004, 2012
    FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2004 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S40 2.0L T4',
        2004,
        2012,
        'B4204T11',
        1984,
        145,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Drive-E引擎，ESC';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S40' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S40');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2004, 2012
    FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2004 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S40 2.5T',
        2004,
        2012,
        'B5254T7',
        2521,
        230,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Turbo高性能版';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2000, 2009
    FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2000 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S60 2.4L',
        2000,
        2009,
        'B5244S',
        2435,
        140,
        '自然進氣',
        '前置前驅/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2010, 2018
    FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2010 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S60 T5',
        2010,
        2018,
        'B4204T27',
        1969,
        245,
        '渦輪增壓',
        '前置前驅/四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'Drive-E';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2010, 2018
    FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2010 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S60 T6',
        2010,
        2018,
        'B6304T37',
        2953,
        304,
        '渦輪增壓',
        '前置四驅',
        '雙叉臂',
        '多連桿',
        '汽油',
        'Polestar';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2019, 2025
    FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='3代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S60 T8 Polestar',
        2019,
        2025,
        'B4204T43',
        1969,
        415,
        '渦輪增壓+機械增壓+電動',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '油電混合',
        'Polestar Engineered';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2019, 2025
    FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='3代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='S60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S60 B5',
        2019,
        2025,
        'B4204T28',
        1969,
        250,
        '渦輪增壓+48V輕油電',
        '前輪驅動/四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        '48V輕油電系統，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S80' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S80');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2006, 2016
    FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2006 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S80 3.2',
        2006,
        2016,
        'B6324S',
        3192,
        238,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S80' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S80');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2006, 2016
    FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2006 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S80' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S80 T6',
        2006,
        2016,
        'B6304T',
        2953,
        285,
        '渦輪增壓',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '汽油',
        'AWD系統';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'S90' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='S90');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2016, 2025
    FROM models WHERE name='S90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2016 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='S90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'S90 B5',
        2016,
        2025,
        'B4204T28',
        1969,
        250,
        '渦輪增壓+48V輕油電',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        '48V輕油電系統，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'V50' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='V50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2004, 2012
    FROM models WHERE name='V50' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='V50' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2004 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='V50' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='V50' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'V50 2.4i',
        2004,
        2012,
        'B5244S5',
        2435,
        170,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'V60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='V60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2010, 2018
    FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2010 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'V60 T5',
        2010,
        2018,
        'B4204T7',
        1999,
        240,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Drive-E';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'V60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='V60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2019, 2025
    FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='V60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'V60 B5',
        2019,
        2025,
        'B4204T28',
        1969,
        250,
        '渦輪增壓+48V輕油電',
        '前輪驅動/四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        '48V輕油電系統，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'V70' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='V70');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2000, 2007
    FROM models WHERE name='V70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='V70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='3代' AND year_from=2000 AND year_to=2007);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='V70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='V70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'V70 2.5T',
        2000,
        2007,
        'B5254T2',
        2521,
        210,
        '渦輪增壓',
        '前置前驅/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2008, 2017
    FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2008 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC60 3.0 T6',
        2008,
        2017,
        'B6304T43',
        2953,
        304,
        '渦輪增壓',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '汽油',
        'AWD系統';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2019, 2025
    FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC60 B4',
        2019,
        2025,
        'B4204T5',
        1969,
        197,
        '渦輪增壓+48V輕油電',
        '前輪驅動',
        '雙A臂',
        '多連桿',
        '汽油',
        '48V輕油電系統，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2019, 2025
    FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC60 B5',
        2019,
        2025,
        'B4204T28',
        1969,
        250,
        '渦輪增壓+48V輕油電',
        '四輪驅動',
        '雙A臂',
        '多連桿',
        '汽油',
        '48V輕油電系統，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC60' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2017, 2025
    FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='XC60' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC60 T8 Recharge',
        2017,
        2025,
        'B4204T48',
        1969,
        400,
        '渦輪增壓+電動',
        '四輪驅動',
        '雙A臂',
        '多連桿',
        '油電混合',
        '插電混合動力，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC70' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC70');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2007, 2016
    FROM models WHERE name='XC70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2007 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='XC70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC70 3.2',
        2007,
        2016,
        'B6324S',
        3192,
        238,
        '自然進氣',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '汽油',
        'AWD系統';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC90' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC90');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2002, 2014
    FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2002 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC90 2.5T',
        2002,
        2014,
        'B5254T2',
        2521,
        210,
        '渦輪增壓',
        '前置前驅/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC90' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC90');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2015, 2025
    FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2015 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='XC90' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC90 T8 Recharge',
        2015,
        2025,
        'B4204T48',
        1969,
        400,
        '渦輪增壓+電動',
        '四輪驅動',
        '雙A臂',
        '多連桿',
        '油電混合',
        '插電混合動力，Pilot Assist';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC40' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC40');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2018, 2025
    FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC40 B4',
        2018,
        2025,
        'B420T5',
        1969,
        197,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Mild Hybrid';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'XC40' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='XC40');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2021, 2025
    FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='XC40' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'XC40 Recharge',
        2021,
        2025,
        '電動',
        NULL,
        408,
        '電動',
        '四輪驅動',
        '麥花臣',
        '多連桿',
        '純電',
        '雙電動馬達，78kWh電池';

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'C30' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='C30');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2006, 2013
    FROM models WHERE name='C30' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C30' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='1代' AND year_from=2006 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C30' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='C30' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'C30 2.4i',
        2006,
        2013,
        'B5244S4',
        2435,
        170,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        NULL;

INSERT INTO makes (name)
    SELECT 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Volvo');

    INSERT INTO models (make_id, name)
    SELECT id, 'C70' FROM makes WHERE name = 'Volvo'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Volvo') AND name='C70');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2006, 2013
    FROM models WHERE name='C70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) AND name='2代' AND year_from=2006 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='C70' AND make_id=(SELECT id FROM makes WHERE name='Volvo')) LIMIT 1),
        'C70 T5',
        2006,
        2013,
        'B5244T7',
        2521,
        230,
        '渦輪增壓',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '硬頂敞篷';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, '86' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='86');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'ZN6', 2012, 2020
    FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='ZN6' AND year_from=2012 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='ZN6' AND model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Toyota 86 標準版',
        2012,
        2020,
        'FA20',
        1998,
        200,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        '水平對臥引擎，輕量化車身，運動化懸吊，TRD套件（部分車型）';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, '86' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='86');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'ZN6', 2012, 2020
    FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='ZN6' AND year_from=2012 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='ZN6' AND model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Toyota 86 GT',
        2012,
        2020,
        'FA20',
        1998,
        200,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        '運動化懸吊，電子穩定控制，增強煞車系統';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, '86' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='86');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'ZN8', 2020, 2025
    FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='ZN8' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='ZN8' AND model_id=(SELECT id FROM models WHERE name='86' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Toyota 86 改款版',
        2020,
        2025,
        'FA24',
        2362,
        235,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        '改良FA24引擎，增強懸吊系統，安全輔助系統';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Altis' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Altis');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '9代', 2004, 2007
    FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='9代' AND year_from=2004 AND year_to=2007);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='9代' AND model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Altis 1.8J',
        2004,
        2007,
        '1ZZ-FE',
        1794,
        132,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Altis' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Altis');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '10代', 2008, 2013
    FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='10代' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='10代' AND model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Altis 1.8E',
        2008,
        2013,
        '2ZR-FE',
        1798,
        140,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Dual VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Altis' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Altis');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '11代', 2014, 2019
    FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='11代' AND year_from=2014 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='11代' AND model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Altis 1.8尊爵',
        2014,
        2019,
        '2ZR-FE',
        1798,
        140,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Super CVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Altis' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Altis');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '12代', 2019, 2023
    FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='12代' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='12代' AND model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Altis 1.8油電',
        2019,
        2023,
        '2ZR-FXE',
        1798,
        122,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '油電混合',
        'THS II';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Altis' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Altis');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '12代', 2021, 2025
    FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='12代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='12代' AND model_id=(SELECT id FROM models WHERE name='Corolla Altis' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Altis GR Sport',
        2021,
        2025,
        'M15A-FKS',
        1490,
        140,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '雙A臂',
        '汽油',
        '1.5三缸';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Camry' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Camry');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2006, 2011
    FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='5代' AND year_from=2006 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Camry 2.0G',
        2006,
        2011,
        '1AZ-FE',
        1998,
        147,
        '自然進氣',
        'FWD',
        '麥花臣',
        '雙連桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Camry' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Camry');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2012, 2017
    FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='6代' AND year_from=2012 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Camry 2.5Q',
        2012,
        2017,
        '2AR-FE',
        2494,
        181,
        '自然進氣',
        'FWD',
        '麥花臣',
        '雙連桿',
        '汽油',
        'Dual VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Camry' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Camry');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2018, 2023
    FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='7代' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Camry 2.5 Hybrid',
        2018,
        2023,
        'A25A-FXS',
        2487,
        178,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '油電混合',
        'THS II';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Camry' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Camry');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2023, 2025
    FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='8代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Camry' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Camry 2.5油電旗艦',
        2023,
        2025,
        'A25A-FXS',
        2487,
        222,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '油電混合',
        '新THS';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'RAV4' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='RAV4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2006, 2012
    FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='3代' AND year_from=2006 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'RAV4 2.4G',
        2006,
        2012,
        '2AZ-FE',
        2362,
        170,
        '自然進氣',
        '4WD',
        '麥花臣',
        '雙連桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'RAV4' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='RAV4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2013, 2018
    FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='4代' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'RAV4 2.5 4WD',
        2013,
        2018,
        '2AR-FE',
        2494,
        180,
        '自然進氣',
        '4WD',
        '麥花臣',
        '雙連桿',
        '汽油',
        'Valvematic';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'RAV4' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='RAV4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2019, 2025
    FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='5代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'RAV4 2.5 Adventure',
        2019,
        2025,
        'A25A-FKS',
        2487,
        207,
        '自然進氣',
        '4WD',
        '麥花臣',
        '雙A臂',
        '汽油',
        'Dynamic Force';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'RAV4' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='RAV4');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2019, 2025
    FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='5代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='RAV4' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'RAV4 Hybrid',
        2019,
        2025,
        'A25A-FXS',
        2487,
        222,
        '阿特金森循環',
        'E-Four',
        '麥花臣',
        '雙A臂',
        '油電混合',
        'E-Four四驅';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Yaris' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Yaris');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2006, 2014
    FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2006 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Yaris 1.5G',
        2006,
        2014,
        '1NZ-FE',
        1497,
        109,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Yaris' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Yaris');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2014, 2020
    FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='2代' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Yaris 1.5豪華',
        2014,
        2020,
        '1NZ-FE',
        1497,
        109,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Super CVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Yaris' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Yaris');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2020, 2025
    FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='3代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Yaris' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Yaris GR Sport',
        2020,
        2025,
        'M15A-FKS',
        1490,
        107,
        '渦輪增壓',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        '1.5三缸';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Vios' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Vios');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2003, 2007
    FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2003 AND year_to=2007);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Vios 1.5E',
        2003,
        2007,
        '1NZ-FE',
        1497,
        109,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Vios' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Vios');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2008, 2013
    FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='2代' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Vios 1.5雅緻',
        2008,
        2013,
        '1NZ-FE',
        1497,
        109,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Dual VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Vios' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Vios');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2014, 2023
    FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='3代' AND year_from=2014 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Vios 1.5豪華',
        2014,
        2023,
        '2NR-FE',
        1496,
        107,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Super CVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Vios' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Vios');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2023, 2025
    FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='4代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Vios' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Vios 1.5油電',
        2023,
        2025,
        'M15A-FXE',
        1490,
        116,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '扭力桿',
        '油電混合',
        '新THS';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Prius' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Prius');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2009, 2015
    FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='3代' AND year_from=2009 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Prius 1.8',
        2009,
        2015,
        '2ZR-FXE',
        1798,
        136,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '扭力桿',
        '油電混合',
        'THS II';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Prius' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Prius');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2016, 2022
    FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='4代' AND year_from=2016 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Prius 1.8',
        2016,
        2022,
        '2ZR-FXE',
        1798,
        122,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '油電混合',
        'THS III';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Prius' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Prius');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2023, 2025
    FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='5代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Prius' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Prius PHEV',
        2023,
        2025,
        'A25A-FXS',
        2487,
        223,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '插電混動',
        '13.6kWh電池';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Alphard' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Alphard');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2009, 2015
    FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='2代' AND year_from=2009 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Alphard 3.5',
        2009,
        2015,
        '2GR-FE',
        3456,
        275,
        '自然進氣',
        'FWD',
        '麥花臣',
        '雙連桿',
        '汽油',
        'Dual VVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Alphard' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Alphard');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2015, 2023
    FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='3代' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Alphard 2.5油電',
        2015,
        2023,
        '2AR-FXE',
        2494,
        152,
        '阿特金森循環',
        '4WD',
        '麥花臣',
        '雙連桿',
        '油電混合',
        'E-Four';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Alphard' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Alphard');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2023, 2025
    FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='4代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Alphard' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Alphard 2.5油電',
        2023,
        2025,
        'A25A-FXS',
        2487,
        190,
        '阿特金森循環',
        '4WD',
        '麥花臣',
        '雙連桿',
        '油電混合',
        '新THS';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Sienta' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Sienta');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2016, 2022
    FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2016 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Sienta 1.8',
        2016,
        2022,
        '2ZR-FE',
        1798,
        140,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        'Super CVT-i';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Sienta' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Sienta');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2022, 2025
    FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='2代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Sienta' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Sienta 1.8油電',
        2022,
        2025,
        'M18A-FXE',
        1798,
        140,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '扭力桿',
        '油電混合',
        '新THS';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Cross' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Cross');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2020, 2025
    FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Corolla Cross油電',
        2020,
        2025,
        'M20A-FXS',
        1987,
        145,
        '阿特金森循環',
        'E-Four',
        '麥花臣',
        '扭力桿',
        '油電混合',
        'E-Four';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Corolla Cross' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Corolla Cross');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2023, 2025
    FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Corolla Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Corolla Cross GR Sport',
        2023,
        2025,
        'M20A-FKS',
        1987,
        170,
        '自然進氣',
        'FWD',
        '麥花臣',
        '扭力桿',
        '汽油',
        '2.0 Dynamic Force';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Crown' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Crown');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '16代', 2023, 2025
    FROM models WHERE name='Crown' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Crown' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='16代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Crown' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='16代' AND model_id=(SELECT id FROM models WHERE name='Crown' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Crown Crossover',
        2023,
        2025,
        'A25A-FXS',
        2487,
        234,
        '阿特金森循環',
        'E-Four',
        '麥花臣',
        '多連桿',
        '油電混合',
        'Direct4四驅';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Hilux' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Hilux');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2019, 2025
    FROM models WHERE name='Hilux' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Hilux' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='8代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Hilux' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Hilux' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Hilux 2.8',
        2019,
        2025,
        '1GD-FTV',
        2755,
        204,
        '渦輪增壓',
        '4WD',
        '雙A臂',
        '葉片彈簧',
        '柴油',
        'DPF+SCR';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Granvia' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Granvia');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2025
    FROM models WHERE name='Granvia' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Granvia' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2019 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Granvia' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Granvia' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Granvia 2.8',
        2019,
        2025,
        '1GD-FTV',
        2755,
        176,
        '渦輪增壓',
        'RWD',
        '麥花臣',
        '葉片彈簧',
        '柴油',
        '9人座設定';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'bZ4X' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='bZ4X');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2022, 2025
    FROM models WHERE name='bZ4X' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='bZ4X' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='bZ4X' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='bZ4X' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'bZ4X',
        2022,
        2025,
        '電動',
        NULL,
        218,
        '電動',
        'AWD',
        '麥花臣',
        '雙A臂',
        '純電',
        '71.4kWh電池';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'C-HR' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='C-HR');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2017, 2023
    FROM models WHERE name='C-HR' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='C-HR' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='C-HR' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='C-HR' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'C-HR 1.8油電',
        2017,
        2023,
        '2ZR-FXE',
        1798,
        122,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '雙A臂',
        '油電混合',
        'THS II';

INSERT INTO makes (name)
    SELECT 'Toyota'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Toyota');

    INSERT INTO models (make_id, name)
    SELECT id, 'Yaris Cross' FROM makes WHERE name = 'Toyota'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Toyota') AND name='Yaris Cross');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2023, 2025
    FROM models WHERE name='Yaris Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Yaris Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) AND name='1代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Yaris Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Yaris Cross' AND make_id=(SELECT id FROM makes WHERE name='Toyota')) LIMIT 1),
        'Yaris Cross油電',
        2023,
        2025,
        'M15A-FXE',
        1490,
        116,
        '阿特金森循環',
        'FWD',
        '麥花臣',
        '扭力桿',
        '油電混合',
        '新THS';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代(FD1–FD3)', 2006, 2011
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='8代(FD1–FD3)' AND year_from=2006 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='8代(FD1–FD3)' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic 1.8',
        2006,
        2011,
        'R18A1',
        1799,
        140,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'SOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2006, 2011
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='8代' AND year_from=2006 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic 2.0 Type S',
        2006,
        2011,
        'K20Z3',
        1998,
        200,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '9代(FA1–FA5)', 2012, 2016
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='9代(FA1–FA5)' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='9代(FA1–FA5)' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic 1.8',
        2012,
        2016,
        'R18Z1',
        1798,
        141,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'SOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '9代', 2012, 2016
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='9代' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='9代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic 2.0',
        2012,
        2016,
        'K20Z3',
        1998,
        155,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '10代', 2016, 2021
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='10代' AND year_from=2016 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='10代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic 1.5 Turbo',
        2016,
        2021,
        'L15B7',
        1498,
        174,
        '渦輪增壓',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC VTEC Turbo';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '10代', 2017, 2021
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='10代' AND year_from=2017 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='10代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic Type R',
        2017,
        2021,
        'K20C1',
        1996,
        306,
        '渦輪增壓',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC VTEC Turbo';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '11代', 2022, 2025
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='11代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='11代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic e:HEV',
        2022,
        2025,
        'LFA1',
        1993,
        184,
        '阿特金森循環+電動',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Civic' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Civic');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '11代', 2023, 2025
    FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='11代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='11代' AND model_id=(SELECT id FROM models WHERE name='Civic' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Civic Type R',
        2023,
        2025,
        'K20C1',
        1996,
        315,
        '渦輪增壓',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC VTEC Turbo';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2003, 2008
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='7代' AND year_from=2003 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 2.4',
        2003,
        2008,
        'K24A4',
        2354,
        190,
        '自然進氣',
        '前置前驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8th (CL7–CM1)', 2008, 2013
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='8th (CL7–CM1)' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='8th (CL7–CM1)' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 2.4',
        2008,
        2013,
        'K24Z2',
        2354,
        180,
        '自然進氣',
        '前置前驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '8代', 2008, 2013
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='8代' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='8代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 3.5',
        2008,
        2013,
        'J35Z2',
        3471,
        271,
        '自然進氣',
        '前置前驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'DOHC VTEC V6';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '9代', 2013, 2019
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='9代' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='9代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 2.4',
        2013,
        2019,
        'K24W1',
        2356,
        188,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '9代', 2013, 2019
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='9代' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='9代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 3.5',
        2013,
        2019,
        'J35Y1',
        3471,
        276,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC VTEC V6';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '10代', 2018, 2025
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='10代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='10代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 1.5 Turbo',
        2018,
        2025,
        'L15BE',
        1498,
        192,
        '渦輪增壓',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'DOHC VTEC Turbo';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Accord' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Accord');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '10代', 2018, 2025
    FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='10代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='10代' AND model_id=(SELECT id FROM models WHERE name='Accord' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Accord 2.0 Hybrid',
        2018,
        2025,
        'LFA1',
        1993,
        212,
        '阿特金森循環+電動',
        '前置前驅',
        '麥弗遜',
        '多連桿',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'CR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='CR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2007, 2011
    FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='3代' AND year_from=2007 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'CR-V 2.4',
        2007,
        2011,
        'K24Z1',
        2354,
        170,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'Real Time 4WD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'CR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='CR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2012, 2016
    FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='4代' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'CR-V 2.4',
        2012,
        2016,
        'R24A1',
        2354,
        190,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'Real Time AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'CR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='CR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2017, 2022
    FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='5代' AND year_from=2017 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'CR-V 1.5 Turbo',
        2017,
        2022,
        'L15BE',
        1498,
        193,
        '渦輪增壓',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'Real Time AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'CR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='CR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2023, 2025
    FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='6代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='CR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'CR-V e:HEV',
        2023,
        2025,
        'LFA1',
        1993,
        204,
        '阿特金森循環+電動',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fit' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Fit');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2008, 2014
    FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='2代' AND year_from=2008 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Fit 1.5',
        2008,
        2014,
        'L15A7',
        1497,
        120,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'SOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fit' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Fit');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2014, 2020
    FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='3代' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Fit 1.5',
        2014,
        2020,
        'L15B1',
        1497,
        130,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Fit' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Fit');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2020, 2025
    FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='4代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Fit' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Fit e:HEV',
        2020,
        2025,
        'LFA1',
        1498,
        123,
        '阿特金森循環+電動',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'HR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='HR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2015, 2021
    FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='1代' AND year_from=2015 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'HR-V 1.8',
        2015,
        2021,
        'L18A',
        1799,
        143,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'SOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'HR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='HR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2022, 2025
    FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='2代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'HR-V e:HEV',
        2022,
        2025,
        'L15ZF',
        1498,
        131,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'HR-V' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='HR-V');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2022, 2025
    FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='2代' AND year_from=2022 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='HR-V' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'HR-V 1.5 Turbo',
        2022,
        2025,
        'L15C',
        1498,
        177,
        '渦輪增壓',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'VTEC Turbo';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Odyssey' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Odyssey');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2004, 2013
    FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='4代' AND year_from=2004 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Odyssey 2.4',
        2004,
        2013,
        'K24A',
        2354,
        160,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Odyssey' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Odyssey');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2014, 2020
    FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='5代' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Odyssey 2.4',
        2014,
        2020,
        'K24W',
        2354,
        175,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Odyssey' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Odyssey');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2021, 2025
    FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='6代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='Odyssey' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Odyssey e:HEV',
        2021,
        2025,
        'LFA1',
        1993,
        215,
        '阿特金森循環+電動',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'City' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='City');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2008, 2014
    FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='5代' AND year_from=2008 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'City 1.5',
        2008,
        2014,
        'L15A7',
        1497,
        120,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'SOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'City' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='City');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2014, 2020
    FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='6代' AND year_from=2014 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'City 1.5',
        2014,
        2020,
        'L15B',
        1497,
        121,
        '自然進氣',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '汽油',
        'DOHC i-VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'City' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='City');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '7代', 2020, 2025
    FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='7代' AND year_from=2020 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='7代' AND model_id=(SELECT id FROM models WHERE name='City' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'City e:HEV',
        2020,
        2025,
        'LFA1',
        1498,
        126,
        '阿特金森循環+電動',
        '前置前驅',
        '麥弗遜',
        '扭力梁',
        '油電混合',
        'e:HEV油電系統';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'S2000' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='S2000');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'AP2', 2005, 2009
    FROM models WHERE name='S2000' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='S2000' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='AP2' AND year_from=2005 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='S2000' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='AP2' AND model_id=(SELECT id FROM models WHERE name='S2000' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'S2000',
        2005,
        2009,
        'F22C',
        2157,
        237,
        '自然進氣',
        '後置後驅',
        '雙A臂',
        '雙A臂',
        '汽油',
        'DOHC VTEC';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Legend' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Legend');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2005, 2012
    FROM models WHERE name='Legend' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Legend' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='4代' AND year_from=2005 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Legend' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Legend' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Legend 3.5',
        2005,
        2012,
        'J35A',
        3471,
        295,
        '自然進氣',
        '前置四驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'SH-AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Pilot' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Pilot');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2005, 2008
    FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='1代' AND year_from=2005 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Pilot 3.5',
        2005,
        2008,
        'J35A9',
        3471,
        244,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'VTM-4 AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Pilot' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Pilot');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2009, 2015
    FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='2代' AND year_from=2009 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Pilot 3.5',
        2009,
        2015,
        'J35Z4',
        3471,
        250,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'VTM-4 AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Pilot' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Pilot');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2016, 2022
    FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='3代' AND year_from=2016 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Pilot 3.5',
        2016,
        2022,
        'J35Y6',
        3471,
        280,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'i-VTM4 AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Pilot' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Pilot');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2023, 2025
    FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='4代' AND year_from=2023 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='Pilot' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Pilot 3.5',
        2023,
        2025,
        'J35Y7',
        3471,
        285,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'i-VTM4 AWD';

INSERT INTO makes (name)
    SELECT 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Honda');

    INSERT INTO models (make_id, name)
    SELECT id, 'Element' FROM makes WHERE name = 'Honda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Honda') AND name='Element');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2005, 2011
    FROM models WHERE name='Element' AND make_id=(SELECT id FROM makes WHERE name='Honda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Element' AND make_id=(SELECT id FROM makes WHERE name='Honda')) AND name='1代' AND year_from=2005 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Element' AND make_id=(SELECT id FROM makes WHERE name='Honda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='Element' AND make_id=(SELECT id FROM makes WHERE name='Honda')) LIMIT 1),
        'Element 2.4',
        2005,
        2011,
        'K24A4',
        2354,
        156,
        '自然進氣',
        '前置四驅',
        '麥弗遜',
        '多連桿',
        '汽油',
        'Real Time 4WD';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'G35' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='G35');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2003, 2006
    FROM models WHERE name='G35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='G35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2003 AND year_to=2006);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='G35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='G35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'G35',
        2003,
        2006,
        'VQ35DE',
        3498,
        280,
        '自然進氣',
        'RWD/4WD',
        '雙A臂',
        '多連桿',
        '汽油',
        'VVEL、主動式轉向系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'G37' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='G37');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2007, 2013
    FROM models WHERE name='G37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='G37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2007 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='G37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='G37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'G37',
        2007,
        2013,
        'VQ37VHR',
        3696,
        330,
        '自然進氣',
        'RWD/4WD',
        '雙A臂',
        '多連桿',
        '汽油',
        'VVEL、主動式轉向系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q50' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='Q50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2013, 2018
    FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'Q50',
        2013,
        2018,
        '2.0T/3.5L VQ35HR/VQ37VHR',
        NULL,
        NULL,
        '渦輪增壓/自然進氣',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'Direct Adaptive Steering';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q50' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='Q50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2019, 2023
    FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='Q50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'Q50',
        2019,
        2023,
        'V6 3.0T VR30DDTT',
        2997,
        NULL,
        '雙渦輪增壓',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'VC-Turbo可變壓縮比引擎';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'QX50' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='QX50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2008, 2017
    FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2008 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'QX50',
        2008,
        2017,
        'VQ35HR',
        3498,
        325,
        '自然進氣',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '全時四驅系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'QX50' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='QX50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2018, 2025
    FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='QX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'QX50',
        2018,
        2025,
        'VC-Turbo VR30DDTT',
        2997,
        268,
        '可變壓縮比渦輪增壓',
        'RWD/AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'VC-Turbo、ProPILOT駕駛輔助';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'QX60' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='QX60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2013, 2020
    FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2013 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'QX60',
        2013,
        2020,
        'VQ35DE',
        3498,
        265,
        '自然進氣',
        'FWD/AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        '豪華座艙科技';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'QX60' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='QX60');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2021, 2025
    FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='QX60' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'QX60',
        2021,
        2025,
        'VQ35DE',
        3498,
        295,
        '自然進氣',
        'FWD/AWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'ProPILOT智能駕駛輔助';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'FX35' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='FX35');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2003, 2008
    FROM models WHERE name='FX35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='FX35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2003 AND year_to=2008);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='FX35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='FX35' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'FX35',
        2003,
        2008,
        'VQ35DE',
        3498,
        280,
        '自然進氣',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '主動懸吊系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'FX37' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='FX37');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2009, 2012
    FROM models WHERE name='FX37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='FX37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2009 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='FX37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='FX37' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'FX37',
        2009,
        2012,
        'VQ37VHR',
        3696,
        325,
        '自然進氣',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '主動懸吊系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'FX50' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='FX50');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第二代', 2009, 2013
    FROM models WHERE name='FX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='FX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第二代' AND year_from=2009 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='FX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第二代' AND model_id=(SELECT id FROM models WHERE name='FX50' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'FX50',
        2009,
        2013,
        'VQ50VHR',
        5000,
        390,
        '自然進氣',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        '主動懸吊系統';

INSERT INTO makes (name)
    SELECT 'Infiniti'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Infiniti');

    INSERT INTO models (make_id, name)
    SELECT id, 'Q70' FROM makes WHERE name = 'Infiniti'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Infiniti') AND name='Q70');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '第一代', 2014, 2019
    FROM models WHERE name='Q70' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Q70' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) AND name='第一代' AND year_from=2014 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Q70' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')),
        (SELECT id FROM generations WHERE name='第一代' AND model_id=(SELECT id FROM models WHERE name='Q70' AND make_id=(SELECT id FROM makes WHERE name='Infiniti')) LIMIT 1),
        'Q70',
        2014,
        2019,
        'VQ37VHR/VR30DDTT',
        NULL,
        NULL,
        '自然進氣/渦輪增壓',
        'RWD/AWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'Direct Adaptive Steering';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'IS' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='IS');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2006, 2013
    FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='2代' AND year_from=2006 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'IS250',
        2006,
        2013,
        '4GR-FSE',
        2499,
        204,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'VVT-i、直噴';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'IS' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='IS');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2013, 2020
    FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='3代' AND year_from=2013 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='IS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'IS300',
        2013,
        2020,
        '8AR-FTS',
        2494,
        245,
        '渦輪增壓',
        'RWD/四驅',
        '雙A臂',
        '多連桿',
        '汽油',
        '渦輪增壓、直噴';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'ES' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='ES');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2006, 2012
    FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='5代' AND year_from=2006 AND year_to=2012);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'ES350',
        2006,
        2012,
        '2GR-FE',
        3456,
        275,
        '自然進氣',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'ES' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='ES');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '6代', 2012, 2018
    FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='6代' AND year_from=2012 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='6代' AND model_id=(SELECT id FROM models WHERE name='ES' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'ES300h',
        2012,
        2018,
        '2AR-FXE+電動',
        2494,
        200,
        '自然進氣＋電動',
        'FWD',
        '麥花臣',
        '多連桿',
        '油電混合',
        'VVT-i、Hybrid Synergy Drive';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'RX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='RX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2008, 2015
    FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='3代' AND year_from=2008 AND year_to=2015);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'RX350',
        2008,
        2015,
        '2GR-FE',
        3456,
        270,
        '自然進氣',
        '四驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'RX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='RX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2015, 2022
    FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='4代' AND year_from=2015 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='RX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'RX450h',
        2015,
        2022,
        '2GR-FXE+電動',
        3456,
        308,
        '自然進氣＋電動',
        '四驅',
        '雙A臂',
        '多連桿',
        '油電混合',
        '混合動力系統';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'LS' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='LS');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '4代', 2006, 2017
    FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='4代' AND year_from=2006 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='4代' AND model_id=(SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'LS460',
        2006,
        2017,
        'UR-Series V8',
        4608,
        385,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'VVT-i、氣缸停用';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'LS' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='LS');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '5代', 2017, 2023
    FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='5代' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='5代' AND model_id=(SELECT id FROM models WHERE name='LS' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'LS500h',
        2017,
        2023,
        '2UR-FXE+電動',
        3456,
        354,
        '自然進氣＋電動',
        '四驅',
        '雙A臂',
        '多連桿',
        '油電混合',
        'Lexus Multi Stage Hybrid';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'NX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='NX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2014, 2021
    FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='1代' AND year_from=2014 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'NX300h',
        2014,
        2021,
        '2AR-FXE+電動',
        2494,
        194,
        '自然進氣＋電動',
        '前驅/四驅',
        '麥花臣',
        '多連桿',
        '油電混合',
        'Hybrid Synergy Drive';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'NX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='NX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2021, 2025
    FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='2代' AND year_from=2021 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='NX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'NX350',
        2021,
        2025,
        'T24A-FTS',
        2487,
        279,
        '渦輪增壓',
        '前驅/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '渦輪增壓、直噴';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'UX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='UX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2018, 2025
    FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='1代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'UX200',
        2018,
        2025,
        'M20A-FKS',
        1987,
        171,
        '自然進氣',
        '前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'VVT-i';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'UX' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='UX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2018, 2025
    FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='1代' AND year_from=2018 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='UX' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'UX250h',
        2018,
        2025,
        '2ZR-FXE+電動',
        1798,
        184,
        '自然進氣＋電動',
        '前驅',
        '多連桿',
        NULL,
        'Hybrid Synergy Drive',
        NULL;

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'LC' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='LC');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2017, 2025
    FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='1代' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'LC500',
        2017,
        2025,
        '2UR-GSE',
        4969,
        471,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'V8自然進氣';

INSERT INTO makes (name)
    SELECT 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Lexus');

    INSERT INTO models (make_id, name)
    SELECT id, 'LC' FROM makes WHERE name = 'Lexus'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Lexus') AND name='LC');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2017, 2025
    FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) AND name='1代' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='LC' AND make_id=(SELECT id FROM makes WHERE name='Lexus')) LIMIT 1),
        'LC500h',
        2017,
        2025,
        '2UR-GSE+電動',
        3456,
        359,
        '自然進氣＋電動',
        'RWD',
        '雙A臂',
        '多連桿',
        '油電混合',
        '多階段混合動力';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'BM系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='BM系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2013, 2019
    FROM models WHERE name='BM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='BM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='2代' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='BM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='BM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'Mazda3',
        2013,
        2019,
        'Skyactiv-G 2.0',
        1998,
        155,
        '自然進氣',
        'FWD',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'BP系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='BP系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2019, 2023
    FROM models WHERE name='BP系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='BP系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='3代' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='BP系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='BP系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'Mazda3',
        2019,
        2023,
        'Skyactiv-G 2.0',
        1998,
        162,
        '自然進氣',
        'FWD/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv-X 壓燃引擎';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'GJ系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='GJ系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2012, 2018
    FROM models WHERE name='GJ系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GJ系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='2代' AND year_from=2012 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GJ系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='GJ系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'Mazda6',
        2012,
        2018,
        'Skyactiv-G 2.5',
        2488,
        190,
        '自然進氣',
        'FWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'GL系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='GL系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2018, 2023
    FROM models WHERE name='GL系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GL系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='3代' AND year_from=2018 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GL系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='GL系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'Mazda6',
        2018,
        2023,
        'Skyactiv-G 2.5',
        2488,
        194,
        '自然進氣',
        'FWD/四驅',
        '雙A臂',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'KE系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='KE系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2012, 2017
    FROM models WHERE name='KE系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='KE系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='1代' AND year_from=2012 AND year_to=2017);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='KE系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='KE系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'CX-5',
        2012,
        2017,
        'Skyactiv-G 2.0',
        1998,
        155,
        '自然進氣',
        '四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'KF系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='KF系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '2代', 2017, 2023
    FROM models WHERE name='KF系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='KF系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='2代' AND year_from=2017 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='KF系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='2代' AND model_id=(SELECT id FROM models WHERE name='KF系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'CX-5',
        2017,
        2023,
        'Skyactiv-G 2.5',
        2488,
        190,
        '自然進氣',
        '四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'DM系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='DM系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2019, 2023
    FROM models WHERE name='DM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='DM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='1代' AND year_from=2019 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='DM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='DM系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'CX-30',
        2019,
        2023,
        'Skyactiv-G 2.0',
        1998,
        156,
        '自然進氣',
        '四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'DK系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='DK系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '1代', 2015, 2020
    FROM models WHERE name='DK系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='DK系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='1代' AND year_from=2015 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='DK系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='1代' AND model_id=(SELECT id FROM models WHERE name='DK系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'CX-3',
        2015,
        2020,
        'Skyactiv-G 2.0',
        1998,
        148,
        '自然進氣',
        '四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Mazda'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Mazda');

    INSERT INTO models (make_id, name)
    SELECT id, 'ND系列' FROM makes WHERE name = 'Mazda'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Mazda') AND name='ND系列');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, '3代', 2015, 2023
    FROM models WHERE name='ND系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='ND系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) AND name='3代' AND year_from=2015 AND year_to=2023);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='ND系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')),
        (SELECT id FROM generations WHERE name='3代' AND model_id=(SELECT id FROM models WHERE name='ND系列' AND make_id=(SELECT id FROM makes WHERE name='Mazda')) LIMIT 1),
        'MX-5',
        2015,
        2023,
        'Skyactiv-G 2.0',
        1998,
        184,
        '自然進氣',
        'RWD',
        '雙A臂',
        '多連桿',
        '汽油',
        'Skyactiv技術';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tiida' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Tiida');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C11', 2005, 2011
    FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='C11' AND year_from=2005 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='C11' AND model_id=(SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Tiida',
        2005,
        2011,
        'MR16DE',
        1598,
        110,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        '可變氣門正時CVTC';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Tiida' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Tiida');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'C12', 2011, 2019
    FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='C12' AND year_from=2011 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='C12' AND model_id=(SELECT id FROM models WHERE name='Tiida' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Tiida',
        2011,
        2019,
        'MR18DE',
        1798,
        131,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '扭力樑',
        '汽油',
        'Xtronic CVT變速系統';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Sentra' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Sentra');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'B17', 2013, 2019
    FROM models WHERE name='Sentra' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Sentra' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='B17' AND year_from=2013 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Sentra' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='B17' AND model_id=(SELECT id FROM models WHERE name='Sentra' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Sentra',
        2013,
        2019,
        'MRA8DE',
        1997,
        144,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Xtronic CVT，VVEL技術';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Altima' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Altima');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'L33', 2013, 2018
    FROM models WHERE name='Altima' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Altima' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='L33' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Altima' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='L33' AND model_id=(SELECT id FROM models WHERE name='Altima' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Altima',
        2013,
        2018,
        'MRA8DE',
        2495,
        182,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Xtronic CVT，VVEL，智能全輪驅動';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'X-Trail' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='X-Trail');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'T31', 2007, 2013
    FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='T31' AND year_from=2007 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='T31' AND model_id=(SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'X-Trail',
        2007,
        2013,
        'MR20DE',
        1997,
        141,
        '自然進氣',
        '前置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'ALL MODE 4x4-i 智能四輪驅動';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'X-Trail' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='X-Trail');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'T32', 2013, 2021
    FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='T32' AND year_from=2013 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='T32' AND model_id=(SELECT id FROM models WHERE name='X-Trail' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'X-Trail',
        2013,
        2021,
        'MR20DD',
        2488,
        171,
        '自然進氣',
        '前置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'ALL MODE 4x4-i，ProPILOT駕駛輔助';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Juke' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Juke');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'F15', 2010, 2019
    FROM models WHERE name='Juke' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Juke' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='F15' AND year_from=2010 AND year_to=2019);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Juke' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='F15' AND model_id=(SELECT id FROM models WHERE name='Juke' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Juke',
        2010,
        2019,
        'MR16DDT',
        1618,
        190,
        '渦輪增壓',
        '前置前驅/四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Turbo增壓引擎，DSC動態穩定控制';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Murano' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Murano');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'Z51', 2009, 2014
    FROM models WHERE name='Murano' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Murano' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='Z51' AND year_from=2009 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Murano' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='Z51' AND model_id=(SELECT id FROM models WHERE name='Murano' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Murano',
        2009,
        2014,
        'VQ35DE',
        3498,
        265,
        '自然進氣',
        '前置四驅',
        '麥花臣',
        '多連桿',
        '汽油',
        '智能全輪驅動系統，VVEL';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'Kicks' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='Kicks');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'P15', 2017, 2025
    FROM models WHERE name='Kicks' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Kicks' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='P15' AND year_from=2017 AND year_to=2025);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Kicks' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='P15' AND model_id=(SELECT id FROM models WHERE name='Kicks' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'Kicks',
        2017,
        2025,
        'HR16DE',
        1598,
        120,
        '自然進氣',
        '前置前驅',
        '麥花臣',
        '多連桿',
        '汽油',
        'Xtronic CVT，智能安全輔助系統';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, 'GT-R' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='GT-R');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'R35', 2008, 2022
    FROM models WHERE name='GT-R' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='GT-R' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='R35' AND year_from=2008 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='GT-R' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='R35' AND model_id=(SELECT id FROM models WHERE name='GT-R' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        'GT-R',
        2008,
        2022,
        'VR38DETT',
        3799,
        NULL,
        '雙渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        'VR38DETT雙渦輪增壓引擎，ATTESA E-TS四輪驅動，Brembo煞車系統，電子懸吊控制';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, '350Z' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='350Z');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'Z33', 2003, 2009
    FROM models WHERE name='350Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='350Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='Z33' AND year_from=2003 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='350Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='Z33' AND model_id=(SELECT id FROM models WHERE name='350Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        '350Z',
        2003,
        2009,
        'VQ35DE',
        3498,
        280,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        'VQ35DE自然進氣V6引擎，Brembo制動系統（部分車型），多連桿懸吊';

INSERT INTO makes (name)
    SELECT 'Nissan'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Nissan');

    INSERT INTO models (make_id, name)
    SELECT id, '370Z' FROM makes WHERE name = 'Nissan'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Nissan') AND name='370Z');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'Z34', 2009, 2020
    FROM models WHERE name='370Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='370Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) AND name='Z34' AND year_from=2009 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='370Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')),
        (SELECT id FROM generations WHERE name='Z34' AND model_id=(SELECT id FROM models WHERE name='370Z' AND make_id=(SELECT id FROM makes WHERE name='Nissan')) LIMIT 1),
        '370Z',
        2009,
        2020,
        'VQ37VHR',
        3696,
        328,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        'VQ37VHR高轉速自然進氣V6引擎，VVEL，Brembo制動系統，運動化懸吊';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Impreza' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Impreza');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'GD', 2006, 2011
    FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='GD' AND year_from=2006 AND year_to=2011);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='GD' AND model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        'WRX STI',
        2006,
        2011,
        ' EJ20',
        1994,
        300,
        '渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Impreza' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Impreza');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'GR', 2011, 2014
    FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='GR' AND year_from=2011 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='GR' AND model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        'WRX STI',
        2011,
        2014,
        ' EJ25',
        2457,
        305,
        '渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Impreza' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Impreza');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'GV/GP', 2012, 2016
    FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='GV/GP' AND year_from=2012 AND year_to=2016);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='GV/GP' AND model_id=(SELECT id FROM models WHERE name='Impreza' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0i',
        2012,
        2016,
        ' FB20',
        1995,
        156,
        '自然進氣',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD，Lineartronic CVT';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Forester' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Forester');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'SH', 2008, 2013
    FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='SH' AND year_from=2008 AND year_to=2013);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='SH' AND model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0XT',
        2008,
        2013,
        ' EJ20',
        1994,
        237,
        '渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD，渦輪增壓水平對臥引擎';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Forester' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Forester');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'SJ', 2013, 2018
    FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='SJ' AND year_from=2013 AND year_to=2018);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='SJ' AND model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0i',
        2013,
        2018,
        ' FB20',
        1995,
        150,
        '自然進氣',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD，EyeSight駕駛輔助系統';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Forester' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Forester');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'SK', 2018, 2022
    FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='SK' AND year_from=2018 AND year_to=2022);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='SK' AND model_id=(SELECT id FROM models WHERE name='Forester' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0i-L',
        2018,
        2022,
        ' FB20',
        1995,
        156,
        '自然進氣',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD，EyeSight系統，X-MODE越野模式';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Legacy' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Legacy');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'BP', 2005, 2009
    FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='BP' AND year_from=2005 AND year_to=2009);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='BP' AND model_id=(SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0GT',
        2005,
        2009,
        ' EJ20',
        1994,
        280,
        '渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        'Symmetrical AWD，渦輪增壓引擎';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'Legacy' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='Legacy');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'BL', 2009, 2014
    FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='BL' AND year_from=2009 AND year_to=2014);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='BL' AND model_id=(SELECT id FROM models WHERE name='Legacy' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.5i',
        2009,
        2014,
        ' EJ25',
        2457,
        170,
        '自然進氣',
        '四輪驅動',
        '雙叉臂',
        '多連桿',
        '汽油',
        'Symmetrical AWD，EyeSight系統';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'WRX' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='WRX');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'VAB', 2014, 2021
    FROM models WHERE name='WRX' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='WRX' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='VAB' AND year_from=2014 AND year_to=2021);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='WRX' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='VAB' AND model_id=(SELECT id FROM models WHERE name='WRX' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        'WRX STI',
        2014,
        2021,
        ' EJ25',
        2457,
        305,
        '渦輪增壓',
        '四輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        'Symmetrical AWD，Driver Controlled Center Differential';

INSERT INTO makes (name)
    SELECT 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM makes WHERE name = 'Subaru');

    INSERT INTO models (make_id, name)
    SELECT id, 'BRZ' FROM makes WHERE name = 'Subaru'
    AND NOT EXISTS (SELECT 1 FROM models WHERE make_id=(SELECT id FROM makes WHERE name='Subaru') AND name='BRZ');

    INSERT INTO generations (model_id, name, year_from, year_to)
    SELECT id, 'ZN6', 2012, 2020
    FROM models WHERE name='BRZ' AND make_id=(SELECT id FROM makes WHERE name='Subaru')
    AND NOT EXISTS (SELECT 1 FROM generations WHERE model_id=(SELECT id FROM models WHERE name='BRZ' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) AND name='ZN6' AND year_from=2012 AND year_to=2020);

    INSERT INTO vehicle_variants (model_id, generation_id, variant_name, year_from, year_to, engine_code, displacement_cc, power_ps, intake_type, drive_type, front_suspension, rear_suspension, fuel_type, special_tech)
    SELECT 
        (SELECT id FROM models WHERE name='BRZ' AND make_id=(SELECT id FROM makes WHERE name='Subaru')),
        (SELECT id FROM generations WHERE name='ZN6' AND model_id=(SELECT id FROM models WHERE name='BRZ' AND make_id=(SELECT id FROM makes WHERE name='Subaru')) LIMIT 1),
        '2.0L',
        2012,
        2020,
        ' FA20',
        1998,
        200,
        '自然進氣',
        '後輪驅動',
        '雙叉臂',
        '雙叉臂',
        '汽油',
        '水平對臥引擎，輕量化車身，運動化懸吊';