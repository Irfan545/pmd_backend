// import { PrismaClient } from '@prisma/client';
// import * as fs from 'fs';
// import * as path from 'path';

// const prisma = new PrismaClient();

// async function importCategories() {
//   try {
//     // Read the JSON file
//     const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../client/src/categoryData/HomePageCategoies.json'), 'utf-8'));

//     async function createCategory(category: any, parentId: number | null = null, level: number = 0) {
//       // Create or update the category
//       const existingCategory = await prisma.category.findFirst({
//         where: {
//           name: category.name,
//           parentId: parentId,
//           type: 'home_page'
//         }
//       });

//       const createdCategory = await prisma.category.upsert({
//         where: {
//           id: existingCategory?.id ?? -1
//         },
//         update: {
//           name: category.name,
//           parentId: parentId,
//           type: 'home_page'
//         },
//         create: {
//           name: category.name,
//           parentId: parentId,
//           type: 'home_page'
//         }
//       });

//       // Log the created category with its level
//       console.log(`${'-'.repeat(level * 2)}Created/Updated category: ${category.name} (ID: ${createdCategory.id}, Parent: ${parentId})`);

//       // Recursively create subcategories
//       if (category.subcategories && category.subcategories.length > 0) {
//         console.log(`${'-'.repeat(level * 2)}Processing ${category.subcategories.length} subcategories for ${category.name}`);
//         for (const subCategory of category.subcategories) {
//           await createCategory(subCategory, createdCategory.id, level + 1);
//         }
//       }

//       return createdCategory;
//     }

//     // First, clear existing categories
//     await prisma.category.deleteMany({
//       where: {
//         type: 'home_page'
//       }
//     });
//     console.log('Cleared existing categories');

//     // Process each main category
//     for (const category of jsonData) {
//       await createCategory(category);
//     }

//     // Verify the Additives categories
//     const maintenanceCategory = await prisma.category.findFirst({
//       where: { name: 'Maintenance', type: 'home_page' },
//       include: {
//         subcategories: {
//           include: {
//             subcategories: {
//               include: {
//                 subcategories: true
//               }
//             }
//           }
//         }
//       }
//     });

//     console.log('\nVerifying Maintenance category structure:');
//     console.log(JSON.stringify(maintenanceCategory, null, 2));

//     console.log('Categories imported successfully');
//   } catch (error) {
//     console.error('Error importing categories:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// importCategories(); 