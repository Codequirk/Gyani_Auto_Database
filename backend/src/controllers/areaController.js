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

exports.updateArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, pin_code } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Area name is required' });
    }

    const area = await Area.findById(id);
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }

    const updatedArea = await Area.update(id, { name, pin_code });
    res.json(updatedArea);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Area already exists' });
    }
    next(error);
  }
};

exports.deleteArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmed } = req.body; // Check if user confirmed deletion

    const area = await Area.findById(id);
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }

    // Check if autos exist in this area
    const autos = await Area.getAutosInArea(id);
    
    if (autos.length > 0 && !confirmed) {
      // Return confirmation prompt
      return res.status(200).json({
        requiresConfirmation: true,
        message: `This area has ${autos.length} auto(s). Deleting this area will also delete all associated autos and assignments. Are you sure?`,
        autoCount: autos.length
      });
    }

    // Delete area with all associated autos and assignments
    const deletedCount = await Area.deleteWithAutos(id);
    
    if (deletedCount === 0) {
      return res.status(400).json({ error: 'Failed to delete area' });
    }

    res.json({ 
      message: `Area "${area.name}" and ${autos.length} auto(s) deleted successfully`,
      deletedAutosCount: autos.length
    });
  } catch (error) {
    console.error('[AREA DELETE] Error:', error);
    next(error);
  }
};
