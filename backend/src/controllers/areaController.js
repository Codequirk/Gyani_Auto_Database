const Area = require('../models/Area');

exports.listAreas = async (req, res, next) => {
  try {
    const areas = await Area.findAll();
    res.json(areas);
  } catch (error) {
    next(error);
  }
};

exports.getArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await Area.findById(id);
    
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }

    res.json(area);
  } catch (error) {
    next(error);
  }
};

exports.createArea = async (req, res, next) => {
  try {
    const { name, pin_code } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Area name is required' });
    }

    const area = await Area.create({ name, pin_code });
    res.status(201).json(area);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Area already exists' });
    }
    next(error);
  }
};
