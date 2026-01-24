exports.seed = async function (knex) {
  // Update areas with pin codes
  const areaUpdates = [
    { name: 'Indiranagar', pin_code: '560038' },
    { name: 'Whitefield', pin_code: '560066' },
    { name: 'Marathahalli', pin_code: '560037' },
    { name: 'HSR Layout', pin_code: '560034' },
    { name: 'MG Road', pin_code: '560001' },
    { name: 'Koramangala', pin_code: '560034' },
  ];

  // Update each area with pin code
  for (const area of areaUpdates) {
    await knex('areas')
      .where('name', area.name)
      .update({ pin_code: area.pin_code });
  }

  console.log('✓ Added pin codes to all areas');
};
