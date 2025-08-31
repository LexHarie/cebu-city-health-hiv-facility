import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedUsers() {
  console.log('Seeding users and user roles...')
  
  // Get facilities and roles for reference
  const facilities = await prisma.facility.findMany()
  const roles = await prisma.role.findMany()
  
  const cchd = facilities.find(f => f.code === 'CCHD')
  const vsmmc = facilities.find(f => f.code === 'VSMMC')
  const ccmc = facilities.find(f => f.code === 'CCMC')
  
  if (!cchd || !vsmmc || !ccmc) {
    throw new Error('Required facilities not found. Please run facility seeds first.')
  }
  
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]))
  
  const users = [
    // Default Development User
    {
      email: 'lexthegreat223@gmail.com',
      displayName: 'Development User',
      phone: '+639171234566',
      facilityId: cchd.id,
      roles: ['DIRECTOR']
    },
    
    // System Administrator (DIRECTOR)
    {
      email: 'admin@cebu-health.gov.ph',
      displayName: 'System Administrator',
      phone: '+639171234567',
      facilityId: cchd.id,
      roles: ['DIRECTOR']
    },
    
    // Facility Administrators
    {
      email: 'admin.cchd@cebu-health.gov.ph',
      displayName: 'CCHD Administrator',
      phone: '+639171234568',
      facilityId: cchd.id,
      roles: ['ADMIN']
    },
    {
      email: 'admin.vsmmc@cebu-health.gov.ph',
      displayName: 'VSMMC Administrator',
      phone: '+639171234569',
      facilityId: vsmmc.id,
      roles: ['ADMIN']
    },
    
    // Physicians
    {
      email: 'dr.santos@cebu-health.gov.ph',
      displayName: 'Dr. Maria Santos',
      phone: '+639171234570',
      facilityId: cchd.id,
      roles: ['PHYSICIAN']
    },
    {
      email: 'dr.reyes@vsmmc.gov.ph',
      displayName: 'Dr. Juan Reyes',
      phone: '+639171234571',
      facilityId: vsmmc.id,
      roles: ['PHYSICIAN']
    },
    
    // Nurses
    {
      email: 'nurse.cruz@cebu-health.gov.ph',
      displayName: 'Nurse Jane Cruz',
      phone: '+639171234572',
      facilityId: cchd.id,
      roles: ['NURSE']
    },
    {
      email: 'nurse.garcia@vsmmc.gov.ph',
      displayName: 'Nurse Rosa Garcia',
      phone: '+639171234573',
      facilityId: vsmmc.id,
      roles: ['NURSE']
    },
    {
      email: 'nurse.lopez@ccmc.gov.ph',
      displayName: 'Nurse Carlos Lopez',
      phone: '+639171234574',
      facilityId: ccmc.id,
      roles: ['NURSE']
    },
    
    // Case Managers
    {
      email: 'cm.torres@cebu-health.gov.ph',
      displayName: 'Case Manager Ana Torres',
      phone: '+639171234575',
      facilityId: cchd.id,
      roles: ['CASE_MANAGER']
    },
    {
      email: 'cm.mendoza@vsmmc.gov.ph',
      displayName: 'Case Manager Luis Mendoza',
      phone: '+639171234576',
      facilityId: vsmmc.id,
      roles: ['CASE_MANAGER']
    },
    
    // Encoders
    {
      email: 'encoder.dela.cruz@cebu-health.gov.ph',
      displayName: 'Data Encoder Maria Dela Cruz',
      phone: '+639171234577',
      facilityId: cchd.id,
      roles: ['ENCODER']
    },
    {
      email: 'encoder.flores@vsmmc.gov.ph',
      displayName: 'Data Encoder Pedro Flores',
      phone: '+639171234578',
      facilityId: vsmmc.id,
      roles: ['ENCODER']
    },
    {
      email: 'encoder.aquino@ccmc.gov.ph',
      displayName: 'Data Encoder Sofia Aquino',
      phone: '+639171234579',
      facilityId: ccmc.id,
      roles: ['ENCODER']
    },
    
    // Pharmacists
    {
      email: 'pharmacist.ramos@cebu-health.gov.ph',
      displayName: 'Pharmacist Miguel Ramos',
      phone: '+639171234580',
      facilityId: cchd.id,
      roles: ['PHARMACIST']
    },
    {
      email: 'pharmacist.valencia@vsmmc.gov.ph',
      displayName: 'Pharmacist Elena Valencia',
      phone: '+639171234581',
      facilityId: vsmmc.id,
      roles: ['PHARMACIST']
    },
    
    // Data Analyst (system-wide access)
    {
      email: 'analyst@cebu-health.gov.ph',
      displayName: 'Data Analyst Roberto Kim',
      phone: '+639171234582',
      facilityId: cchd.id,
      roles: ['DATA_ANALYST']
    },
    
    // Multi-role users (common in smaller facilities)
    {
      email: 'staff.dual@ccmc.gov.ph',
      displayName: 'Multi-role Staff Angela Lim',
      phone: '+639171234583',
      facilityId: ccmc.id,
      roles: ['NURSE', 'CASE_MANAGER']
    },
    {
      email: 'staff.pharmnurse@ccmc.gov.ph',
      displayName: 'Nurse-Pharmacist Jose Tan',
      phone: '+639171234584',
      facilityId: ccmc.id,
      roles: ['NURSE', 'PHARMACIST']
    }
  ]

  // Create users and assign roles
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        displayName: userData.displayName,
        phone: userData.phone,
        facilityId: userData.facilityId
      },
      create: {
        email: userData.email,
        displayName: userData.displayName,
        phone: userData.phone,
        facilityId: userData.facilityId
      }
    })

    // Assign roles to user
    for (const roleName of userData.roles) {
      const roleId = roleMap[roleName]
      if (!roleId) {
        console.warn(`⚠️ Role '${roleName}' not found, skipping for user ${userData.email}`)
        continue
      }

      await prisma.userRole.upsert({
        where: { 
          userId_roleId: { 
            userId: user.id, 
            roleId: roleId 
          } 
        },
        update: {},
        create: {
          userId: user.id,
          roleId: roleId
        }
      })
    }
    
    console.log(`✓ Created user: ${userData.displayName} (${userData.roles.join(', ')})`)
  }
  
  console.log(`✅ Seeded ${users.length} users with role assignments`)
}

if (require.main === module) {
  seedUsers()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}