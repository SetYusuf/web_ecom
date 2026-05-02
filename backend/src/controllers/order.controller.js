const prisma = require('../prisma');
const { v4: uuidv4 } = require('uuid');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WC-${timestamp}-${random}`;
};

// Create order (checkout)
const createOrder = async (req, res) => {
  try {
    const {
      shippingAddressId,
      billingAddress,
      shippingMethod = 'standard',
      paymentMethod,
      couponCode,
      notes,
    } = req.body;

    // Get cart
    let cart;
    if (req.user) {
      cart = await prisma.cart.findUnique({
        where: { userId: req.user.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    } else {
      const guestCartId = req.headers['x-guest-cart-id'];
      if (guestCartId) {
        cart = await prisma.cart.findUnique({
          where: { id: guestCartId },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });
      }
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // Verify stock for all items
    for (const item of cart.items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: item.variantId },
        });
        if (!variant || variant.stock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${item.product.name}`,
          });
        }
      } else if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    // Get shipping address
    let shippingAddress;
    if (shippingAddressId) {
      shippingAddress = await prisma.address.findFirst({
        where: req.user ? { id: shippingAddressId, userId: req.user.id } : { id: shippingAddressId },
      });
    }

    if (!shippingAddress && !billingAddress) {
      return res.status(400).json({ error: 'Shipping address is required.' });
    }

    // Calculate order totals
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    // Shipping cost calculation
    const shippingCosts = {
      standard: 5.99,
      express: 12.99,
      overnight: 24.99,
    };
    const shippingCost = shippingCosts[shippingMethod] || 5.99;

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
        },
      });

      if (coupon) {
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          return res.status(400).json({
            error: `Minimum order amount for coupon is $${coupon.minOrderAmount}`,
          });
        }

        if (coupon.type === 'PERCENTAGE') {
          discount = subtotal * (coupon.value / 100);
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        } else if (coupon.type === 'FIXED') {
          discount = coupon.value;
        } else if (coupon.type === 'FREE_SHIPPING') {
          discount = shippingCost;
        }

        // Update coupon usage
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: coupon.usedCount + 1 },
        });
      }
    }

    // Tax calculation (simplified - 10% flat rate)
    const tax = (subtotal - discount) * 0.10;
    const total = subtotal + shippingCost + tax - discount;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user?.id || null,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        shippingAddressId: shippingAddress?.id || null,
        billingAddress: billingAddress ? JSON.stringify(billingAddress) : null,
        subtotal,
        shippingCost,
        tax,
        discount,
        total,
        paymentMethod,
        shippingMethod,
        notes,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.product.salePrice || item.product.price,
            size: item.variantId ? undefined : undefined,
            color: item.variantId ? undefined : undefined,
          })),
        },
      },
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
        shippingAddress: true,
      },
    });

    // Update product stock
    for (const item of cart.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: { take: 1, where: { isPrimary: true } },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to get orders.' });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: req.user ? { id, userId: req.user.id } : { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order.' });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    }
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
};

// Update payment status (admin only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentIntentId } = req.body;

    const updateData = { paymentStatus };
    if (paymentIntentId) {
      updateData.paymentIntentId = paymentIntentId;
    }
    if (paymentStatus === 'PAID') {
      updateData.status = 'CONFIRMED';
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    res.json(order);
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status.' });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
};