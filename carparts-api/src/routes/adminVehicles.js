const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');
const prisma = new PrismaClient();

router.use(adminAuth);

// PATCH /api/admin/vehicles/:id
router.patch('/:id', async (req, res) => {
  try {
    const { make, model, generation, year, engine, licensePlate, vin } = req.body;
    const data = {};
    if (make !== undefined) data.make = make;
    if (model !== undefined) data.model = model;
    if (generation !== undefined) data.generation = generation;
    if (year !== undefined) data.year = parseInt(year);
    if (engine !== undefined) data.engine = engine;
    if (licensePlate !== undefined) data.licensePlate = licensePlate;
    if (vin !== undefined) data.vin = vin;

    const vehicle = await prisma.vehicleProfile.update({
      where: { id: req.params.id },
      data,
    });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;