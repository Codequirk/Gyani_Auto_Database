const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../models/db');
const { v4: uuidv4 } = require('uuid');

// Import schemas directly
const AdminSchema = require('../models/schemas/AdminSchema');
const AreaSchema = require('../models/schemas/AreaSchema');
const AutoSchema = require('../models/schemas/AutoSchema');
const CompanySchema = require('../models/schemas/CompanySchema');
const AssignmentSchema = require('../models/schemas/AssignmentSchema');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting seed...');

    // Clear existing data
    await Promise.all([
      AdminSchema.deleteMany({}),
      AreaSchema.deleteMany({}),
      AutoSchema.deleteMany({}),
      CompanySchema.deleteMany({}),
      AssignmentSchema.deleteMany({}),
    ]);
    console.log('✓ Cleared existing data');

    // Create areas
    const areaIds = {};
    const areaNames = [
      { name: 'Koramangala', pin_code: '560034' },
      { name: 'Jayanagar', pin_code: '560041' },
      { name: 'Indiranagar', pin_code: '560038' },
      { name: 'Whitefield', pin_code: '560066' },
      { name: 'MG Road', pin_code: '560001' }
    ];

    for (const area of areaNames) {
      const id = uuidv4();
      areaIds[area.name] = id;
      const areaDoc = new AreaSchema({
        _id: id,
        id,
        name: area.name,
        pin_code: area.pin_code,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await areaDoc.save();
    }
    console.log('✓ Areas seeded (5 areas)');

    // Create admins
    const admin1Id = uuidv4();
    const admin2Id = uuidv4();

    const hashedPassword1 = await bcrypt.hash('Test1234', 10);
    const hashedPassword2 = await bcrypt.hash('Test1234', 10);

    const admin1 = new AdminSchema({
      _id: admin1Id,
      id: admin1Id,
      name: 'Pragna',
      email: 'pragna@company.com',
      password_hash: hashedPassword1,
      role: 'SUPER_ADMIN',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await admin1.save();

    const admin2 = new AdminSchema({
      _id: admin2Id,
      id: admin2Id,
      name: 'Manager',
      email: 'manager@company.com',
      password_hash: hashedPassword2,
      role: 'ADMIN',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await admin2.save();
    console.log('✓ Admins seeded');

    // Create autos
    const autoIds = {};
    const autos = [
      // Koramangala (15 autos - 10 existing + 5 new IDLE)
      { no: 'KA01AA1001', owner: 'Ramesh Kumar', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1002', owner: 'Sita Sharma', area: 'Koramangala', status: 'ASSIGNED' },
      { no: 'KA01AA1003', owner: 'Raj Patel', area: 'Koramangala', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA1004', owner: 'Priya Singh', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1005', owner: 'Amit Verma', area: 'Koramangala', status: 'ASSIGNED' },
      { no: 'KA01AA1006', owner: 'Neha Gupta', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1007', owner: 'Vikram Reddy', area: 'Koramangala', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA1008', owner: 'Anjali Mishra', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1009', owner: 'Suresh Nair', area: 'Koramangala', status: 'ASSIGNED' },
      { no: 'KA01AA1010', owner: 'Divya Kumar', area: 'Koramangala', status: 'IDLE' },
      // 5 new IDLE autos for Koramangala
      { no: 'KA01AA1011', owner: 'Ravindra Pal', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1012', owner: 'Swathi Desai', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1013', owner: 'Mohan Reddy', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1014', owner: 'Lakshmi Kumar', area: 'Koramangala', status: 'IDLE' },
      { no: 'KA01AA1015', owner: 'Arjun Nair', area: 'Koramangala', status: 'IDLE' },
      
      // Jayanagar (15 autos - 10 existing + 5 new IDLE)
      { no: 'KA01AA2001', owner: 'Mohan Lal', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2002', owner: 'Pooja Desai', area: 'Jayanagar', status: 'ASSIGNED' },
      { no: 'KA01AA2003', owner: 'Arjun Singh', area: 'Jayanagar', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA2004', owner: 'Sneha Kapoor', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2005', owner: 'Rohit Sharma', area: 'Jayanagar', status: 'ASSIGNED' },
      { no: 'KA01AA2006', owner: 'Kavya Nair', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2007', owner: 'Arun Chandra', area: 'Jayanagar', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA2008', owner: 'Deepa Srivastav', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2009', owner: 'Vivek Pandey', area: 'Jayanagar', status: 'ASSIGNED' },
      { no: 'KA01AA2010', owner: 'Isha Bhat', area: 'Jayanagar', status: 'IDLE' },
      // 5 new IDLE autos for Jayanagar
      { no: 'KA01AA2011', owner: 'Pradeep Singh', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2012', owner: 'Ritu Sharma', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2013', owner: 'Harish Kumar', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2014', owner: 'Sunita Roy', area: 'Jayanagar', status: 'IDLE' },
      { no: 'KA01AA2015', owner: 'Vishal Patel', area: 'Jayanagar', status: 'IDLE' },
      
      // Indiranagar (15 autos - 10 existing + 5 new IDLE)
      { no: 'KA01AA3001', owner: 'Kumar Singh', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3002', owner: 'Mira Gupta', area: 'Indiranagar', status: 'ASSIGNED' },
      { no: 'KA01AA3003', owner: 'Sanjay Verma', area: 'Indiranagar', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA3004', owner: 'Riya Rao', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3005', owner: 'Nikhil Joshi', area: 'Indiranagar', status: 'ASSIGNED' },
      { no: 'KA01AA3006', owner: 'Priya Nair', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3007', owner: 'Ashok Kumar', area: 'Indiranagar', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA3008', owner: 'Shruti Malhotra', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3009', owner: 'Rajesh Iyer', area: 'Indiranagar', status: 'ASSIGNED' },
      { no: 'KA01AA3010', owner: 'Anuradha Singh', area: 'Indiranagar', status: 'IDLE' },
      // 5 new IDLE autos for Indiranagar
      { no: 'KA01AA3011', owner: 'Rajesh Kumar', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3012', owner: 'Anjali Gupta', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3013', owner: 'Vikram Singh', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3014', owner: 'Divya Nair', area: 'Indiranagar', status: 'IDLE' },
      { no: 'KA01AA3015', owner: 'Suresh Iyer', area: 'Indiranagar', status: 'IDLE' },
      
      // Whitefield (15 autos - 10 existing + 5 new IDLE)
      { no: 'KA01AA4001', owner: 'Vikram Patel', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4002', owner: 'Sneha Roy', area: 'Whitefield', status: 'ASSIGNED' },
      { no: 'KA01AA4003', owner: 'Aditya Nair', area: 'Whitefield', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA4004', owner: 'Hema Reddy', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4005', owner: 'Siddharth Kapoor', area: 'Whitefield', status: 'ASSIGNED' },
      { no: 'KA01AA4006', owner: 'Swati Sharma', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4007', owner: 'Karthik Shetty', area: 'Whitefield', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA4008', owner: 'Meera Desai', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4009', owner: 'Harsh Verma', area: 'Whitefield', status: 'ASSIGNED' },
      { no: 'KA01AA4010', owner: 'Pooja Srivastav', area: 'Whitefield', status: 'IDLE' },
      // 5 new IDLE autos for Whitefield
      { no: 'KA01AA4011', owner: 'Nikhil Verma', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4012', owner: 'Priya Kapoor', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4013', owner: 'Arjun Patel', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4014', owner: 'Isha Sharma', area: 'Whitefield', status: 'IDLE' },
      { no: 'KA01AA4015', owner: 'Rohan Shetty', area: 'Whitefield', status: 'IDLE' },
      
      // MG Road (15 autos - 10 existing + 5 new IDLE)
      { no: 'KA01AA5001', owner: 'Arjun Mishra', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5002', owner: 'Divya Rao', area: 'MG Road', status: 'ASSIGNED' },
      { no: 'KA01AA5003', owner: 'Rajeev Singh', area: 'MG Road', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA5004', owner: 'Kavya Patel', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5005', owner: 'Sanjiv Kapoor', area: 'MG Road', status: 'ASSIGNED' },
      { no: 'KA01AA5006', owner: 'Neha Roy', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5007', owner: 'Vikas Joshi', area: 'MG Road', status: 'PRE_ASSIGNED' },
      { no: 'KA01AA5008', owner: 'Anita Nair', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5009', owner: 'Rohan Reddy', area: 'MG Road', status: 'ASSIGNED' },
      { no: 'KA01AA5010', owner: 'Seetha Kumar', area: 'MG Road', status: 'IDLE' },
      // 5 new IDLE autos for MG Road
      { no: 'KA01AA5011', owner: 'Sanjay Joshi', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5012', owner: 'Meera Patel', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5013', owner: 'Arun Verma', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5014', owner: 'Seema Singh', area: 'MG Road', status: 'IDLE' },
      { no: 'KA01AA5015', owner: 'Vikram Rao', area: 'MG Road', status: 'IDLE' },
    ];

    for (const auto of autos) {
      const id = uuidv4();
      autoIds[auto.no] = id;
      const autoDoc = new AutoSchema({
        _id: id,
        id,
        auto_no: auto.no,
        owner_name: auto.owner,
        area_id: areaIds[auto.area],
        status: auto.status,
        last_updated_at: new Date(),
        notes: 'Seeded auto',
        created_at: new Date(),
        updated_at: new Date(),
      });
      await autoDoc.save();
    }
    console.log('✓ Autos seeded (75 autos - 15 per area, with 5 IDLE autos each)');

    // Create companies
    const companyIds = {};
    const companies = [
      {
        name: 'Foodies Pvt Ltd',
        contact_person: 'Rajesh Kumar',
        email: 'rajesh@foodies.com',
        phone_number: '9876543210',
        password: 'Company123',
        required: 5,
        area: 'Koramangala',
        days: 7,
        status: 'ACTIVE',
      },
      {
        name: 'DeliverIt',
        contact_person: 'Priya Sharma',
        email: 'priya@deliverit.com',
        phone_number: '9988776655',
        password: 'Company123',
        required: 3,
        area: 'Indiranagar',
        days: 2,
        status: 'ACTIVE',
      },
    ];

    for (const company of companies) {
      const id = uuidv4();
      companyIds[company.name] = id;
      const hashedCompanyPassword = await bcrypt.hash(company.password, 10);
      const companyDoc = new CompanySchema({
        _id: id,
        id,
        name: company.name,
        contact_person: company.contact_person,
        email: company.email,
        phone_number: company.phone_number,
        password_hash: hashedCompanyPassword,
        required_autos: company.required,
        area_id: areaIds[company.area],
        days_requested: company.days,
        status: company.status,
        company_status: 'ACTIVE',
        created_by_admin_id: admin1Id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await companyDoc.save();
    }
    console.log('✓ Companies seeded');

    // Create assignments (1 active assignment with 1 day remaining)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 3);
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate total days (inclusive)
    const timeDiff = endDate - startDate;
    const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    const assignmentId = uuidv4();
    const assignment = new AssignmentSchema({
      _id: assignmentId,
      id: assignmentId,
      auto_id: autoIds['KA01AA2002'],
      company_id: companyIds['DeliverIt'],
      company_name: 'DeliverIt',
      start_date: startDate,
      end_date: endDate,
      days: totalDays,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await assignment.save();
    console.log('✓ Assignments seeded (1 active with 1 day remaining)');

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email: pragna@company.com');
    console.log('   Password: Test1234');
    console.log('   Role: SUPER_ADMIN');
    console.log('\n📋 Company Portal Credentials:');
    console.log('   Email: rajesh@foodies.com');
    console.log('   Password: Company123');
    console.log('   OR');
    console.log('   Email: priya@deliverit.com');
    console.log('   Password: Company123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();
