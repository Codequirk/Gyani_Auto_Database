const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function (knex) {
  // Clear existing data
  await knex('assignments').del();
  await knex('payments').del();
  await knex('company_tickets').del();
  await knex('autos').del();
  await knex('companies').del();
  await knex('admins').del();
  await knex('areas').del();

  const adminId1 = uuidv4();
  const areaId1 = uuidv4();
  const autoId1 = uuidv4();
  const autoId2 = uuidv4();
  const companyId1 = uuidv4();
  const assignmentId1 = uuidv4();
  const ticketId1 = uuidv4();

  // Insert areas
  await knex('areas').insert([
    { id: areaId1, name: 'Koramangala', created_at: new Date(), updated_at: new Date() },
  ]);

  // Insert admins
  const hashedPassword = await bcrypt.hash('Test1234', 10);
  await knex('admins').insert([
    {
      id: adminId1,
      name: 'Pragna',
      email: 'pragna@company.com',
      password_hash: hashedPassword,
      role: 'SUPER_ADMIN',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Insert autos
  await knex('autos').insert([
    {
      id: autoId1,
      auto_no: 'KA01AA1001',
      owner_name: 'Ramesh',
      area_id: areaId1,
      status: 'IDLE',
      created_at: new Date(),
      updated_at: new Date(),
      last_updated_at: new Date(),
    },
    {
      id: autoId2,
      auto_no: 'KA01AA1002',
      owner_name: 'Mohan',
      area_id: areaId1,
      status: 'IN_BUSINESS',
      created_at: new Date(),
      updated_at: new Date(),
      last_updated_at: new Date(),
    },
  ]);

  // Insert companies
  const companyPassword = await bcrypt.hash('Company1234', 10);
  await knex('companies').insert([
    {
      id: companyId1,
      name: 'ABC Transport',
      email: 'abc.transport@company.com',
      password_hash: companyPassword,
      contact_person: 'John Manager',
      phone_number: '+91-9876543210',
      emails: JSON.stringify(['abc.transport@company.com']),
      phone_numbers: JSON.stringify(['+91-9876543210']),
      required_autos: 2,
      area_id: areaId1,
      days_requested: 30,
      status: 'ACTIVE',
      company_status: 'APPROVED',
      created_by_admin_id: adminId1,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Insert assignments
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  await knex('assignments').insert([
    {
      id: assignmentId1,
      auto_id: autoId1,
      company_id: companyId1,
      start_date: today,
      end_date: endDate,
      status: 'ACTIVE',
      days: 30,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Insert payments
  await knex('payments').insert([
    {
      id: uuidv4(),
      auto_id: autoId1,
      company_id: companyId1,
      ticket_id: assignmentId1,
      cost_per_day: 500,
      total_days: 30,
      total_cost: 15000,
      payment_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  // Insert company tickets
  await knex('company_tickets').insert([
    {
      id: ticketId1,
      company_id: companyId1,
      autos_required: 2,
      days_required: 30,
      start_date: today,
      area_id: areaId1,
      area_name: 'Koramangala',
      notes: 'Initial company registration ticket',
      ticket_status: 'APPROVED',
      approved_by_admin_id: adminId1,
      admin_notes: 'Approved for testing',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  console.log(' Seed completed!');
};
