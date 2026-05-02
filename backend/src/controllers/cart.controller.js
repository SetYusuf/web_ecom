const prisma = require('../prisma');

// Get cart for current user
const getCart = async (req, res) => {
  try {
    let cart;

    // For authenticated users, get their cart
    if (req.user) {
      cart = await prisma.cart.findUnique({
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
                },
              },
            },
          },
        },
      });
    } else {
      // For guest users, use session-based cart (passed in request)
      const guestCartId = req.headers['x-guest-cart-id'];
      if (guestCartId) {
        cart = await prisma.cart.findUnique({
          where: { id: guestCartId },
          include: {
            items: {
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
            },
          },
        });
      }
    }

    if (!cart) {
      return res.json({ items: [], subtotal: 0, itemCount: 0 });
    }

    // Calculate subtotal and item count
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      id: cart.id,
      items: cart.items,
      subtotal,
      itemCount,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart.' });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    // Verify product exists and is active
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check stock if variant is specified
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId },
      });

      if (!variant) {
        return res.status(404).json({ error: 'Product variant not found.' });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock.' });
      }
    } else if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock.' });
    }

    // Get or create cart
    let cart;
    if (req.user) {
      cart = await prisma.cart.findUnique({
        where: { userId: req.user.id },
      });
    } else {
      const guestCartId = req.headers['x-guest-cart-id'];
      if (guestCartId) {
        cart = await prisma.cart.findUnique({
          where: { id: guestCartId },
        });
      }
    }

    if (!cart) {
      // Create a new cart for guest users
      cart = await prisma.cart.create({
        data: {
          userId: req.user?.id || null,
        },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
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
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
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
    }

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
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
        },
      },
    });

    const subtotal = updatedCart.items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = updatedCart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      id: updatedCart.id,
      items: updatedCart.items,
      subtotal,
      itemCount,
      addedItem: cartItem,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart.' });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    // Verify ownership for authenticated users
    if (req.user && cartItem.cart.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this cart item.' });
    }

    // Check stock
    if (cartItem.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: cartItem.variantId },
      });
      if (variant && variant.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock.' });
      }
    } else if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock.' });
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
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
        },
      },
    });

    const subtotal = updatedCart.items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = updatedCart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      id: updatedCart.id,
      items: updatedCart.items,
      subtotal,
      itemCount,
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item.' });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Find cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    // Verify ownership for authenticated users
    if (req.user && cartItem.cart.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to remove this item.' });
    }

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
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
        },
      },
    });

    const subtotal = updatedCart.items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = updatedCart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      id: updatedCart.id,
      items: updatedCart.items,
      subtotal,
      itemCount,
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart.' });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    let cart;

    if (req.user) {
      cart = await prisma.cart.findUnique({
        where: { userId: req.user.id },
      });
    } else {
      const guestCartId = req.headers['x-guest-cart-id'];
      if (guestCartId) {
        cart = await prisma.cart.findUnique({
          where: { id: guestCartId },
        });
      }
    }

    if (!cart) {
      return res.json({ items: [], subtotal: 0, itemCount: 0 });
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({
      id: cart.id,
      items: [],
      subtotal: 0,
      itemCount: 0,
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};