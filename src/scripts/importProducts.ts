import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse';

const prisma = new PrismaClient();

// Category mapping from Product Group to subcategory IDs
const categoryMapping: { [key: string]: number } = {
  'Engine Oils': 115,        // Engine Oils subcategory
  'Gear Oil': 121,           // Gear Oil subcategory
  'Transmission Oils': 120,  // Transmission Oils subcategory
  'Coolant Fluids': 114,     // Coolants Fluids subcategory
  'Steering Fluids': 118,    // Steering Fluids subcategory
  'Other Fluids': 117,       // Other Fluids subcategory
  'Accessories': 167,        // Accessories subcategory in Misc
  'Break Fluids': 113,       // Break Fluids subcategory
  'Suspension Fluids': 119   // Suspension Fluids subcategory
};

async function importProducts() {
  try {
    const csvFilePath = path.join(__dirname, '../../../data/Products1.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    const records: any[] = [];
    const parser = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    for await (const record of parser) {
      records.push(record);
    }

    console.log(`Found ${records.length} products to import`);

    for (const record of records) {
      // Debug logging
      console.log('Processing record:', record);

      // Map Product Group to category ID
      const productGroup = record['Product Group'];
      const categoryId = categoryMapping[productGroup];

      if (!categoryId) {
        console.log(`No category mapping found for Product Group: ${productGroup}, skipping product: ${record['Part Number']}`);
        continue;
      }

      // Find the category by ID
      const category = await prisma.category.findUnique({
        where: {
          id: categoryId
        }
      });

      if (!category) {
        console.log(`Category not found for ID: ${categoryId}, Product Group: ${productGroup}, skipping product: ${record['Part Number']}`);
        continue;
      }

      // Validate part number
      if (!record['Part Number']) {
        console.log(`Skipping record - missing part number:`, record);
        continue;
      }

      // Clean price - remove quotes and commas, then parse
      let price = 0;
      try {
        const priceStr = record.Retail?.replace(/[",]/g, '') || '0';
        price = parseFloat(priceStr);
        if (isNaN(price)) {
          price = 0;
        }
      } catch (error) {
        console.log(`Invalid price for ${record['Part Number']}: ${record.Retail}`);
        price = 0;
      }

      try {
        // Create or update the product
        const product = await prisma.product.create({
          data: {
            name: record.Description || record['Part Number'],
            description: record.Description || '',
            price: price,
            stock: 10, // Default stock
            categoryId: category.id,
            imageUrl: [], // Empty array for now
            imagePublicIds: [],
            partNumbers: {
              create: [{
                number: String(record['Part Number']),
                type: 'original',
                manufacturer: record.Manufacturer || 'Unknown',
                isOriginal: true
              }]
            }
          }
        });

        console.log(`Successfully imported product: ${product.name} (${record['Part Number']}) - Price: $${price} - Category: ${category.name}`);
      } catch (error) {
        console.error('Error creating product:', error);
        console.error('Failed record:', record);
      }
    }

    console.log('Products imported successfully');
  } catch (error) {
    console.error('Error importing products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  importProducts()
    .then(() => {
      console.log('Product import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Product import script failed:', error);
      process.exit(1);
    });
}

export { importProducts }; 