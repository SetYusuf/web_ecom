const prisma = require('../prisma');

// Get wishlist
const getWishlist = async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                category: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!wishlist) {
      return res.json({ items: [], itemCount: 0 });
    }

    res.json({
      id: wishlist.id,
      items: wishlist.items,
      itemCount: wishlist.items.length,
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to get wishlist.' });
  }
};

// Add to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.user.id },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId: req.user.id,
        },
      });
    }

    // Check if item already in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    if (existingItem) {
      return res.status(409).json({ error: 'Product already in wishlist.' });
    }

    // Add item
    const item = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist.' });
  }
};

// Remove from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.wishlistItem.findFirst({
      where: { id: itemId },
      include: { wishlist: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found.' });
    }

    if (item.wishlist.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await prisma.wishlistItem.delete({
      where: { id: itemId },
    });

    res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist.' });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};