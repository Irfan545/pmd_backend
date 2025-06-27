import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface NewCategory {
  id: string;
  name: string;
  type: string;
  subcategories: NewCategory[];
}

async function importNewCategories() {
  try {
    console.log('Starting category import...');

    // Read the JSON file
    const jsonPath = path.join(__dirname, '../../../client/src/categoryData/newCat.json');
    const categoryData: NewCategory[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`Found ${categoryData.length} main categories to import`);

    // Clear existing categories
    console.log('Clearing existing categories...');
    await prisma.category.deleteMany({});
    console.log('Existing categories cleared');

    // Import main categories first
    for (const mainCategory of categoryData) {
      console.log(`Importing main category: ${mainCategory.name}`);
      
      const createdMainCategory = await prisma.category.create({
        data: {
          id: parseInt(mainCategory.id),
          name: mainCategory.name,
          type: mainCategory.type || 'default', // Use the type from JSON or default
          parentId: null
        }
      });

      console.log(`Created main category: ${createdMainCategory.name} with ID: ${createdMainCategory.id}`);

      // Import subcategories
      if (mainCategory.subcategories && mainCategory.subcategories.length > 0) {
        for (const subcategory of mainCategory.subcategories) {
          console.log(`  Importing subcategory: ${subcategory.name}`);
          
          await prisma.category.create({
            data: {
              id: parseInt(subcategory.id),
              name: subcategory.name,
              type: subcategory.type || 'default', // Use the type from JSON or default
              parentId: parseInt(mainCategory.id)
            }
          });

          console.log(`  Created subcategory: ${subcategory.name} with ID: ${subcategory.id}`);
        }
      }
    }

    console.log('Category import completed successfully!');
    
    // Verify the import
    const totalCategories = await prisma.category.count();
    const mainCategories = await prisma.category.count({
      where: { parentId: null }
    });
    const subCategories = await prisma.category.count({
      where: { parentId: { not: null } }
    });

    console.log(`Import verification:`);
    console.log(`- Total categories: ${totalCategories}`);
    console.log(`- Main categories: ${mainCategories}`);
    console.log(`- Sub categories: ${subCategories}`);

  } catch (error) {
    console.error('Error importing categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importNewCategories()
    .then(() => {
      console.log('Category import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Category import script failed:', error);
      process.exit(1);
    });
}

export { importNewCategories }; 