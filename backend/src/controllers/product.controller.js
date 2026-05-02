const prisma = require('../prisma');

// Get products with filtering, sorting, and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      minPrice,
      maxPrice,
      sizes,
      colors,
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      tags,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      isActive: true,
    };

    // Category filter
    if (category) {
      where.categoryId = category;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Brand filter
    if (brand) {
      where.brand = brand;
    }

    // Featured filter
    if (featured === 'true') {
      where.isFeatured = true;
    }

    // Sort options
    const sortOptions = {
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
      price: { price: sortOrder },
      name: { name: 'asc' },
      popularity: { reviewCount: 'desc' },
      rating: { reviewAverage: sortOrder || 'desc' },
    };

    const orderBy = sortOptions[sortBy] || sortOptions.createdAt;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          variants: {
            select: { size: true, color: true, stock: true, price: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products.' });
  }
};

// Get single product by slug
const getProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        variants: true,
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Get related products
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: 4,
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    res.json({
      ...product,
      relatedProducts,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product.' });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      take: parseInt(limit),
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to get featured products.' });
  }
};

// Get new arrivals
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: parseInt(limit),
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({ error: 'Failed to get new arrivals.' });
  }
};

// Create product (admin only)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      shortDescription,
      price,
      salePrice,
      sku,
      categoryId,
      brand,
      stock,
      tags,
      materials,
      careInstructions,
      fitType,
      occasion,
      ageGroup,
      metaTitle,
      metaDescription,
      metaKeywords,
      images,
      variants,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        sku,
        categoryId,
        brand,
        stock: parseInt(stock) || 0,
        tags: tags ? JSON.stringify(tags) : null,
        materials: materials ? JSON.stringify(materials) : null,
        careInstructions,
        fitType,
        occasion,
        ageGroup,
        metaTitle,
        metaDescription,
        metaKeywords,
        images: images ? {
          create: images.map((img, index) => ({
            url: img.url,
            altText: img.altText,
            position: index,
            isPrimary: index === 0,
          })),
        } : undefined,
        variants: variants ? {
          create: variants.map(v => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            images: v.images ? JSON.stringify(v.images) : null,
          })),
        } : undefined,
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
};

// Update product (admin only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle price conversion
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
    if (updateData.stock !== undefined) updateData.stock = parseInt(updateData.stock);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
};

// Delete product (admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
};

// Search products (simple search)
const searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: parseInt(limit),
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products.' });
  }
};

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};