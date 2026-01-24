const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  // First, create 5 areas in Bangalore
  const areas = [
    { id: uuidv4(), name: 'Indiranagar', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Whitefield', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Marathahalli', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'HSR Layout', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'MG Road', created_at: new Date(), updated_at: new Date() },
  ];

  // Insert areas
  const existingAreas = await knex('areas').where('name', 'in', areas.map(a => a.name));
  const areasToInsert = areas.filter(area => !existingAreas.find(a => a.name === area.name));
  
  if (areasToInsert.length > 0) {
    await knex('areas').insert(areasToInsert);
  }

  // Get all 5 areas (including existing and newly created)
  const allAreas = await knex('areas').where('name', 'in', areas.map(a => a.name));

  // Add 10 idle autos to each area (50 total)
  const autos = [];
  allAreas.forEach((area, areaIndex) => {
    for (let i = 1; i <= 10; i++) {
      const autoNumber = `KA${String(areaIndex + 1).padStart(2, '0')}${String(i).padStart(5, '0')}`;
      const ownerNames = ['Ramesh', 'Mohan', 'Suresh', 'Vikram', 'Ajay', 'Ravi', 'Kumar', 'Prakash', 'Arjun', 'Nikhil'];
      
      autos.push({
        id: uuidv4(),
        auto_no: autoNumber,
        owner_name: ownerNames[i - 1],
        area_id: area.id,
        status: 'IDLE',
        notes: `Idle auto in ${area.name}`,
        created_at: new Date(),
        updated_at: new Date(),
        last_updated_at: new Date(),
        deleted_at: null,
      });
    }
  });

  // Insert autos only if they don't already exist
  const existingAutos = await knex('autos').where('status', 'IDLE');
  const autosToInsert = autos.filter(auto => !existingAutos.find(a => a.auto_no === auto.auto_no));

  if (autosToInsert.length > 0) {
    await knex('autos').insert(autosToInsert);
    console.log(`✓ Added ${autosToInsert.length} idle autos across ${allAreas.length} areas`);
  } else {
    console.log('✓ Autos already exist, skipping insertion');
  }
};
