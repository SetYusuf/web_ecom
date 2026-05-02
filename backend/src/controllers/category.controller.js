const prisma = require('../prisma');

// Get all categories (with hierarchy)
const getCategories = async (req, res) => {
  try {
    const { parentId } = req.query;
    
    const where = parentId ? { parentId } : { parentId: null };
    
    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories.' });
  }
};

// Get category tree (all categories with nested children)
const getCategoryTree = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({ error: 'Failed to get category tree.' });
  }
};

// Get single category by slug
const getCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        attributes: true,
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category.' });
  }
};

// Create category (admin only)
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, image, parentId, attributes } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        parent: parentId ? { connect: { id: parentId } } : undefined,
        attributes: attributes ? {
          create: attributes.map(attr => ({
            name: attr.name,
            values: JSON.stringify(attr.values),
          })),
        } : undefined,
      },
      include: {
        parent: true,
        attributes: true,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category.' });
  }
};

// Update category (admin only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, parentId } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        image,
        parent: parentId ? { connect: { id: parentId } } : undefined,
      },
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category.' });
  }
};

// Delete category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products.' });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
};

module.exports = {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};