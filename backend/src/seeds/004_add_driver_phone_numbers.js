exports.seed = async function (knex) {
  // Generate fake Indian phone numbers for drivers
  const generatePhoneNumber = () => {
    const prefixes = ['98', '97', '96', '95', '94', '93', '92', '91']; // Indian mobile prefixes
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `+91${prefix}${randomDigits}`;
  };

  // Get all autos
  const autos = await knex('autos');
  
  if (autos.length === 0) {
    console.log('✓ No autos to add phone numbers to');
    return;
  }

  // Update each auto with a fake phone number
  let updated = 0;
  for (const auto of autos) {
    await knex('autos')
      .where('id', auto.id)
      .update({ 
        driver_phone: generatePhoneNumber(),
        updated_at: new Date()
      });
    updated++;
  }

  console.log(`✓ Added/Updated phone numbers for ${updated} autos`);
};
